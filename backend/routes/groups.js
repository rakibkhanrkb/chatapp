import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Group তৈরি করো
router.post('/create', async (req, res) => {
  const { name, description, createdBy, memberIds } = req.body;

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name, description, created_by: createdBy })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Creator + members যোগ করো
  const allMembers = [...new Set([createdBy, ...memberIds])];
  await supabase.from('group_members').insert(
    allMembers.map(uid => ({
      group_id: group.id,
      user_id: uid,
      role: uid === createdBy ? 'admin' : 'member'
    }))
  );

  res.json(group);
});

// আমার সব groups
router.get('/my/:userId', async (req, res) => {
  const { data } = await supabase
    .from('group_members')
    .select(`group_id, groups(id, name, description, created_at)`)
    .eq('user_id', req.params.userId);

  res.json(data?.map(d => d.groups) || []);
});

// Group members দেখো
router.get('/:groupId/members', async (req, res) => {
  const { data } = await supabase
    .from('group_members')
    .select(`role, profiles(id, username, full_name, is_online)`)
    .eq('group_id', req.params.groupId);

  res.json(data || []);
});

// Group messages লোড করো
router.get('/:groupId/messages', async (req, res) => {
  const { data } = await supabase
    .from('group_messages')
    .select(`*, sender:profiles!group_messages_sender_id_fkey(id, username, full_name)`)
    .eq('group_id', req.params.groupId)
    .order('created_at', { ascending: true });

  res.json(data || []);
});

// File upload — Supabase Storage
router.post('/upload', async (req, res) => {
  const { fileName, fileData, fileType, folder } = req.body;
  const path = `${folder}/${Date.now()}_${fileName}`;
  const buffer = Buffer.from(fileData, 'base64');

  const { data, error } = await supabase.storage
    .from('chat-files')
    .upload(path, buffer, { contentType: fileType });

  if (error) return res.status(400).json({ error: error.message });

  const { data: urlData } = supabase.storage
    .from('chat-files')
    .getPublicUrl(path);

  res.json({ url: urlData.publicUrl, path });
});

// Delete a group message
router.delete('/messages/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('group_messages').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;