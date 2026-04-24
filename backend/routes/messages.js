import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// সব user দেখো (search এবং suggestions এর জন্য)
router.get('/users', async (req, res) => {
  const { q } = req.query;
  
  let query = supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_online, last_seen');

  // যদি সার্চ কুয়েরি থাকে, তবে শুধু ম্যাচ করা ইউজার আনবে
  if (q) {
    query = query.ilike('username', `%${q}%`);
  }

  const { data, error } = await query.limit(30); // সর্বোচ্চ ৩০ জন ইউজার
  if (error) return res.status(500).json({ error: error.message });
  
  res.json(data);
});

// Conversation শুরু করো বা আগেরটা লোড করো
router.post('/conversation', async (req, res) => {
  const { user1Id, user2Id } = req.body;

  // আগে চেক করো আছে কিনা
  let { data } = await supabase
    .from('conversations')
    .select('*')
    .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
    .single();

  if (!data) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ user1_id: user1Id, user2_id: user2Id })
      .select()
      .single();
    data = newConv;
  }

  res.json(data);
});

// আমার সব conversations
router.get('/conversations/:userId', async (req, res) => {
  const { data } = await supabase
    .from('conversations')
    .select(`*, 
      user1:profiles!conversations_user1_id_fkey(id, username, full_name, is_online),
      user2:profiles!conversations_user2_id_fkey(id, username, full_name, is_online)
    `)
    .or(`user1_id.eq.${req.params.userId},user2_id.eq.${req.params.userId}`)
    .order('last_message_at', { ascending: false });
  res.json(data || []);
});

// নির্দিষ্ট conversation এর messages
router.get('/messages/:conversationId', async (req, res) => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', req.params.conversationId)
    .order('created_at', { ascending: true });
  res.json(data || []);
});

// Delete a direct message
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('messages').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;