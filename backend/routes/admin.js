import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Service client bypasses RLS for admin tasks
const adminClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Middleware to verify if requester is actually an admin
async function requireAdmin(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !profile || profile.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admins only' });
  }
  next();
}

// Get all users WITH EMAIL (Admin only)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    // 1. Fetch Profile Data
    const { data: profiles, error: profileError } = await adminClient
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_online, last_seen, created_at, role')
      .order('created_at', { ascending: false });

    if (profileError) throw profileError;

    // 2. Fetch Auth Data (To get actual Emails/IDs)
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
    if (authError) throw authError;

    // 3. Merge Email into Profiles
    const mergedUsers = profiles.map(profile => {
      const authUser = authData.users.find(u => u.id === profile.id);
      return {
        ...profile,
        email: authUser ? authUser.email : 'No Email'
      };
    });

    res.json(mergedUsers);
  } catch (error) {
    console.error("Admin Fetch Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a user's ID (Email/Username) and Password
router.put('/users/:id', requireAdmin, async (req, res) => {
  const targetUserId = req.params.id;
  const { full_name, username, role, email, password } = req.body;

  try {
    // 1. Update Profile (Name, Username, Role)
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ full_name, username, role })
      .eq('id', targetUserId);

    if (profileError) throw profileError;

    // 2. Update Auth Credentials (Email & Password)
    let authUpdates = {};
    if (email && email.trim() !== '') authUpdates.email = email;
    // পাসওয়ার্ড শুধু তখনই আপডেট হবে যদি অ্যাডমিন নতুন পাসওয়ার্ড লিখে দেয়
    if (password && password.trim() !== '') authUpdates.password = password;

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        targetUserId,
        authUpdates
      );
      if (authError) throw authError;
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const targetUserId = req.params.id;
  const { error: authError } = await adminClient.auth.admin.deleteUser(targetUserId);
  if (authError) return res.status(400).json({ error: authError.message });

  await adminClient.from('profiles').delete().eq('id', targetUserId);
  res.json({ message: 'User deleted successfully' });
});

// Get all global messages
router.get('/all-messages', requireAdmin, async (req, res) => {
  const { data, error } = await adminClient
    .from('messages')
    .select(`id, content, created_at, sender:sender_id(full_name), receiver:receiver_id(full_name)`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete global message
router.delete('/messages/:id', requireAdmin, async (req, res) => {
  const { error } = await adminClient.from('messages').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;