import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// সাধারণ ক্লায়েন্ট (Authentication এর জন্য)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// অ্যাডমিন ক্লায়েন্ট (ইউজারনেম দিয়ে ইমেইল খুঁজে বের করার জন্য)
const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Register Route
router.post('/register', async (req, res) => {
  const { email, password, username, full_name } = req.body;
  try {
    // ১. চেক করা ইউজারনেম আগে থেকে আছে কিনা
    const { data: existingUser } = await supabase.from('profiles').select('id').eq('username', username).single();
    if (existingUser) return res.status(400).json({ error: 'এই ইউজারনেমটি আগে থেকেই ব্যবহার করা হচ্ছে!' });

    // ২. Supabase এ নতুন ইউজার তৈরি
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });

    // ৩. Profile তৈরি
    const { error: profileError } = await supabase.from('profiles').insert([
      { id: data.user.id, username, full_name, role: 'user' }
    ]);
    if (profileError) return res.status(400).json({ error: profileError.message });

    res.json({ message: 'Registration successful', user: data.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Route (Email OR Username)
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier = Email or Username

  try {
    let loginEmail = identifier;

    // যদি identifier-এ '@' না থাকে, তার মানে এটি একটি ইউজারনেম
    if (!identifier.includes('@')) {
      // Profiles টেবিল থেকে ইউজারনেম দিয়ে ইউজারের ID বের করা
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('username', identifier)
        .single();

      if (profileError || !profile) {
        return res.status(400).json({ error: 'ইউজারনেম বা পাসওয়ার্ড ভুল!' });
      }

      // ID ব্যবহার করে Auth টেবিল থেকে ইউজারের আসল ইমেইল বের করা
      const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(profile.id);
      if (authError || !authData.user) {
        return res.status(400).json({ error: 'ইউজারনেম বা পাসওয়ার্ড ভুল!' });
      }
      
      loginEmail = authData.user.email; // লগইনের জন্য ইমেইল সেট করা হলো
    }

    // এখন ইমেইল এবং পাসওয়ার্ড দিয়ে লগইন করানো
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password,
    });

    if (error) return res.status(400).json({ error: 'ইমেইল/ইউজারনেম বা পাসওয়ার্ড ভুল!' });

    // ইউজারের প্রোফাইল ডেটা নেওয়া
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

    res.json({ token: data.session.access_token, user: { ...data.user, profile } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;