import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import messagesRouter from './routes/messages.js';
import groupsRouter from './routes/groups.js';
import { createClient } from '@supabase/supabase-js';
import adminRouter from './routes/admin.js';

dotenv.config();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 10e6
});
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json({ limit: '200mb' })); 
app.use(express.urlencoded({ limit: '200mb', extended: true })); // Add this just in case
app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/admin', adminRouter);

const onlineUsers = new Map();

io.on('connection', (socket) => {

  socket.on('user_online', async (userId) => {
    onlineUsers.set(userId, socket.id);
    await supabase.from('profiles').update({ is_online: true }).eq('id', userId);
    io.emit('user_status', { userId, isOnline: true });
  });

  // Group room join
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
  });

  // Direct message
  socket.on('send_message', async (data) => {
    const { conversationId, senderId, content, receiverId, fileUrl, fileType, fileName, messageType } = data;

    const { data: message } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, content: content || '', file_url: fileUrl, file_type: fileType, file_name: fileName, message_type: messageType || 'text' })
      .select().single();

    await supabase.from('conversations')
      .update({ last_message: messageType === 'text' ? content : `📎 ${fileName || 'File'}`, last_message_at: new Date() })
      .eq('id', conversationId);

    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit('receive_message', message);
    socket.emit('message_sent', message);
  });

  // Group message
  socket.on('send_group_message', async (data) => {
    const { groupId, senderId, content, fileUrl, fileType, fileName, messageType } = data;

    const { data: message } = await supabase
      .from('group_messages')
      .insert({ group_id: groupId, sender_id: senderId, content: content || '', file_url: fileUrl, file_type: fileType, file_name: fileName, message_type: messageType || 'text' })
      .select(`*, sender:profiles!group_messages_sender_id_fkey(id, username, full_name)`)
      .single();

    io.to(`group_${groupId}`).emit('receive_group_message', message);
  });

// --- Message Delete Events ---
  socket.on('delete_message', ({ messageId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message_deleted', { messageId });
    }
  });

  socket.on('delete_group_message', ({ messageId, groupId }) => {
    socket.to(groupId).emit('group_message_deleted', { messageId });
  });

  // Typing
  socket.on('typing', ({ conversationId, senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit('user_typing', { conversationId, senderId });
  });

  socket.on('stop_typing', ({ conversationId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit('user_stop_typing', { conversationId });
  });

// --- WebRTC Audio/Video Call Signaling ---
  socket.on('call_user', ({ userToCall, signalData, from, name, type }) => {
    const receiverSocketId = onlineUsers.get(userToCall);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming_call', { signal: signalData, from, name, type });
    }
  });

  socket.on('answer_call', ({ to, signal }) => {
    const callerSocketId = onlineUsers.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', signal);
    }
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    const socketId = onlineUsers.get(to);
    if (socketId) {
      io.to(socketId).emit('ice_candidate', candidate);
    }
  });

  socket.on('end_call', ({ to }) => {
    const socketId = onlineUsers.get(to);
    if (socketId) {
      io.to(socketId).emit('call_ended');
    }
  });

  socket.on('disconnect', async () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        await supabase.from('profiles').update({ is_online: false, last_seen: new Date() }).eq('id', userId);
        io.emit('user_status', { userId, isOnline: false });
        break;
      }
    }
  });
});

httpServer.listen(process.env.PORT || 3001, () => console.log('🚀 Server running on port 3001'));
