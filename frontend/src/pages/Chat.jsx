import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import FileMessage from '../components/FileMessage';
import FileUploadButton from '../components/FileUploadButton';
import CreateGroupModal from '../components/CreateGroupModal';
import CallModal from '../components/CallModal';

const socket = io('https://chatapp-812b.onrender.com');

export default function Chat() {
  const user = JSON.parse(localStorage.getItem('user'));
  
  const [tab, setTab] = useState('direct');
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  
  const [typing, setTyping] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  
  const [callState, setCallState] = useState({
    isReceivingCall: false, callerSignal: null, callerName: '', callerId: '', isInitiatingCall: false, callType: 'audio'
  });

  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  // Main Socket & Data Load Effect (Runs once)
  useEffect(() => {
    socket.emit('user_online', user.id);
    loadConversations();
    loadGroups();
    loadSuggestedUsers();

    socket.on('receive_message', msg => setMessages(prev => [...prev, msg]));
    socket.on('message_sent', msg => setMessages(prev => [...prev, msg]));
    socket.on('receive_group_message', msg => setMessages(prev => [...prev, msg]));
    
    socket.on('user_status', ({ userId, isOnline }) => {
      setConversations(prev => prev.map(c => {
        if (c.user1?.id === userId) return { ...c, user1: { ...c.user1, is_online: isOnline } };
        if (c.user2?.id === userId) return { ...c, user2: { ...c.user2, is_online: isOnline } };
        return c;
      }));
    });

    socket.on('incoming_call', ({ signal, from, name, type }) => {
      setCallState({ isReceivingCall: true, callerSignal: signal, callerId: from, callerName: name, callType: type, isInitiatingCall: false });
    });

    socket.on('message_deleted', ({ messageId }) => setMessages(prev => prev.filter(m => m.id !== messageId)));
    socket.on('group_message_deleted', ({ messageId }) => setMessages(prev => prev.filter(m => m.id !== messageId)));

    return () => socket.off();
  }, []); // <-- [] করে দেওয়া হয়েছে যাতে সাজেস্ট লিস্ট গায়েব না হয়

  // Typing Effect (Depends on activeConv)
  useEffect(() => {
    const handleUserTyping = ({ conversationId }) => { if (activeConv?.id === conversationId) setTyping(true); };
    const handleUserStopTyping = () => setTyping(false);

    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);

    return () => {
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
    };
  }, [activeConv]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  async function loadConversations() { const { data } = await axios.get(`http://localhost:3001/api/messages/conversations/${user.id}`); setConversations(data); }
  async function loadGroups() { const { data } = await axios.get(`http://localhost:3001/api/groups/my/${user.id}`); setGroups(data); }
  async function loadSuggestedUsers() { try { const { data } = await axios.get(`http://localhost:3001/api/messages/users`); setSuggestedUsers(data.filter(u => u.id !== user.id)); } catch (err) {} }
  async function searchUsers(q) { setSearchQuery(q); if (!q) return setSearchResults([]); const { data } = await axios.get(`http://localhost:3001/api/messages/users?q=${q}`); setSearchResults(data.filter(u => u.id !== user.id)); }

  async function openDirectChat(otherUser) {
    setSearchQuery(''); setSearchResults([]); setActiveGroup(null); setActiveUser(otherUser);
    const { data: conv } = await axios.post('http://localhost:3001/api/messages/conversation', { user1Id: user.id, user2Id: otherUser.id });
    setActiveConv(conv);
    const { data: msgs } = await axios.get(`http://localhost:3001/api/messages/messages/${conv.id}`); setMessages(msgs); loadConversations();
  }

  async function openGroupChat(group) {
    setActiveConv(null); setActiveUser(null); setActiveGroup(group);
    socket.emit('join_group', group.id);
    const { data: msgs } = await axios.get(`http://localhost:3001/api/groups/${group.id}/messages`); setMessages(msgs);
  }

  function handleTyping() {
    if (!activeConv) return;
    socket.emit('typing', { conversationId: activeConv.id, senderId: user.id, receiverId: activeUser?.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => { socket.emit('stop_typing', { conversationId: activeConv.id, receiverId: activeUser?.id }); }, 1500);
  }

  function sendMessage() {
    if ((!input.trim() && !pendingFile)) return;
    const msgData = { senderId: user.id, content: input, fileUrl: pendingFile?.url, fileType: pendingFile?.type, fileName: pendingFile?.name, messageType: pendingFile ? (pendingFile.type.startsWith('image/') ? 'image' : 'file') : 'text' };
    
    if (activeConv) { socket.emit('send_message', { ...msgData, conversationId: activeConv.id, receiverId: activeUser?.id }); socket.emit('stop_typing', { conversationId: activeConv.id, receiverId: activeUser?.id }); }
    else if (activeGroup) { socket.emit('send_group_message', { ...msgData, groupId: activeGroup.id }); }
    setInput(''); setPendingFile(null);
  }

  async function handleDeleteMessage(msg) {
    if (!window.confirm("আপনি কি সত্যিই এই মেসেজটি মুছে ফেলতে চান?")) return;
    try {
      if (activeConv) {
        await axios.delete(`http://localhost:3001/api/messages/${msg.id}`);
        socket.emit('delete_message', { messageId: msg.id, receiverId: activeUser?.id });
      } else if (activeGroup) {
        await axios.delete(`http://localhost:3001/api/groups/messages/${msg.id}`);
        socket.emit('delete_group_message', { messageId: msg.id, groupId: activeGroup.id });
      }
      setMessages(messages.filter(m => m.id !== msg.id));
    } catch (err) {
      alert("মেসেজ ডিলিট করতে সমস্যা হয়েছে।");
    }
  }

  function startCall(type) { if (!activeUser) return; setCallState({ isInitiatingCall: true, callType: type, isReceivingCall: false, callerSignal: null }); }
  function getOtherUser(conv) { return conv.user1?.id === user.id ? conv.user2 : conv.user1; }
  function formatTime(ts) { return new Date(ts).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }); }
  function logout() { localStorage.clear(); window.location.href = '/login'; }
  const isMe = (msg) => msg.sender_id === user.id;

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-0 sm:p-4 lg:p-6 relative">
      
      {(callState?.isReceivingCall || callState?.isInitiatingCall) && <CallModal {...callState} remoteUser={activeUser} currentUser={user} socket={socket} onCallEnd={() => setCallState({ isReceivingCall: false, isInitiatingCall: false, callerSignal: null })} />}
      {showGroupModal && <CreateGroupModal currentUser={{ id: user.id }} onClose={() => setShowGroupModal(false)} onCreated={(g) => { setGroups(prev => [g, ...prev]); setTab('groups'); }} />}

      <div className="flex w-full h-full bg-white/80 backdrop-blur-xl sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:border border-white/50 overflow-hidden relative">
        
        {/* SIDEBAR */}
        <div className={`w-full md:w-[340px] bg-white/60 flex-col border-r border-gray-100/50 backdrop-blur-md transition-all duration-300 ${(activeConv || activeGroup) ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 sm:p-5 border-b border-gray-100/50 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-200 shrink-0">{user.profile?.full_name?.[0]}</div>
                <div className="min-w-0"><p className="font-bold text-gray-800 text-sm truncate">{user.profile?.full_name}</p><p className="text-xs text-indigo-500 font-medium truncate">@{user.profile?.username}</p></div>
              </div>
              <button onClick={logout} className="text-xl p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">⏻</button>
            </div>
            {user.profile?.role === 'admin' && <button onClick={() => window.location.href = '/admin'} className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2"><span>⚙️</span> Admin Dashboard</button>}
          </div>

          <div className="flex border-b border-gray-100/50 px-3 pt-3 shrink-0 gap-2">
            <button onClick={() => setTab('direct')} className={`flex-1 py-3 text-sm font-bold transition-all rounded-t-2xl ${tab === 'direct' ? 'text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>💬 Direct</button>
            <button onClick={() => setTab('groups')} className={`flex-1 py-3 text-sm font-bold transition-all rounded-t-2xl ${tab === 'groups' ? 'text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>👥 Groups</button>
          </div>

          <div className="p-4 border-b border-gray-100/50 shrink-0">
            {tab === 'direct' ? (
              <div className="relative">
                <input placeholder="🔍 Search users..." value={searchQuery} onChange={e => searchUsers(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all placeholder:text-gray-400" />
                {searchResults?.length > 0 && (
                  <div className="absolute top-14 left-0 right-0 bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden border border-gray-100 z-20 max-h-60 overflow-y-auto">
                    {searchResults.map(u => (
                      <div key={u.id} onClick={() => openDirectChat(u)} className="flex items-center gap-3 p-3 hover:bg-indigo-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">{u.full_name?.[0]}</div>
                        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-800 truncate">{u.full_name}</p><p className="text-xs text-gray-400 truncate">@{u.username}</p></div>
                        {u.is_online && <div className="ml-auto w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (<button onClick={() => setShowGroupModal(true)} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-2xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all shadow-md">+ Create Group</button>)}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-2 sm:p-3">
            
            {/* SUGGESTED USERS */}
            {tab === 'direct' && !searchQuery && suggestedUsers?.length > 0 && (
              <div className="mb-5">
                <p className="px-3 text-[11px] font-extrabold text-slate-400 mb-3 uppercase tracking-wider">Suggestions</p>
                <div className="flex overflow-x-auto gap-3 px-2 pb-2 scrollbar-hide">
                  {suggestedUsers.map(u => (
                    <div key={u.id} onClick={() => openDirectChat(u)} className="flex flex-col items-center gap-1.5 cursor-pointer min-w-[70px] group">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-xl shadow-sm group-hover:shadow-md group-hover:scale-105 group-hover:from-indigo-100 group-hover:to-purple-200 group-hover:text-indigo-700 transition-all border-2 border-white shrink-0">{u.full_name?.[0]}</div>
                        {u.is_online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white shadow-sm shrink-0" />}
                      </div>
                      <p className="text-xs font-semibold text-slate-600 truncate w-16 text-center group-hover:text-indigo-600">{u.full_name?.split(' ')[0]}</p>
                    </div>
                  ))}
                </div>
                <hr className="my-3 border-slate-100" />
                <p className="px-3 text-[11px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider">Recent Chats</p>
              </div>
            )}

            {tab === 'direct' && conversations.map(conv => {
              const other = getOtherUser(conv);
              return (
                <div key={conv.id} onClick={() => openDirectChat(other)} className={`flex items-center gap-3 p-3 mb-1.5 rounded-2xl cursor-pointer transition-all border border-transparent ${activeConv?.id === conv.id ? 'bg-white shadow-[0_2px_10px_rgb(0,0,0,0.04)] border-gray-100' : 'hover:bg-white/50'}`}>
                  <div className="relative shrink-0"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-indigo-700 font-bold shadow-sm">{other?.full_name?.[0]}</div>{other?.is_online && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white shadow-sm" />}</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-sm text-gray-800 truncate">{other?.full_name}</p><p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message || 'Start chatting'}</p></div>
                </div>
              );
            })}

            {tab === 'groups' && groups.map(group => (
              <div key={group.id} onClick={() => openGroupChat(group)} className={`flex items-center gap-3 p-3 mb-1.5 rounded-2xl cursor-pointer transition-all border border-transparent ${activeGroup?.id === group.id ? 'bg-white shadow-[0_2px_10px_rgb(0,0,0,0.04)] border-gray-100' : 'hover:bg-white/50'}`}>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-purple-700 font-bold text-lg shadow-sm shrink-0">👥</div>
                <div className="flex-1 min-w-0"><p className="font-bold text-sm text-gray-800 truncate">{group.name}</p><p className="text-xs text-gray-500 truncate mt-0.5">{group.description || 'Group chat'}</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* CHAT WINDOW */}
        {(activeConv || activeGroup) ? (
          <div className="flex-1 flex flex-col bg-white/40 relative h-full">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none z-0"></div>

            <div className="bg-white/80 backdrop-blur-md border-b border-gray-100/50 p-3 sm:p-5 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <button onClick={() => { setActiveConv(null); setActiveGroup(null); setActiveUser(null); }} className="md:hidden p-2 -ml-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                {activeConv ? (
                  <><div className="relative shrink-0"><div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-indigo-700 font-bold shadow-sm">{activeUser?.full_name?.[0]}</div>{activeUser?.is_online && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />}</div>
                  <div className="min-w-0"><p className="font-bold text-gray-800 truncate sm:text-lg max-w-[150px] sm:max-w-xs">{activeUser?.full_name}</p><p className="text-xs font-medium text-indigo-500">{activeUser?.is_online ? '🟢 Online' : '⚫ Offline'}</p></div></>
                ) : (
                  <><div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-purple-700 font-bold text-xl shadow-sm shrink-0">👥</div>
                  <div className="min-w-0"><p className="font-bold text-gray-800 truncate sm:text-lg max-w-[150px] sm:max-w-xs">{activeGroup?.name}</p><p className="text-xs font-medium text-gray-500 truncate max-w-[150px] sm:max-w-xs">{activeGroup?.description || 'Group chat'}</p></div></>
                )}
              </div>
              {activeConv && (
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <button onClick={() => startCall('audio')} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-indigo-50 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all shadow-sm border border-slate-100 sm:text-xl">📞</button>
                  <button onClick={() => startCall('video')} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-indigo-50 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all shadow-sm border border-slate-100 sm:text-xl">📹</button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 z-10 scrollbar-hide">
              {messages.map((msg, i) => {
                const mine = isMe(msg);
                return (
                  <div key={msg.id || i} className={`group flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    {activeGroup && !mine && <p className="text-[10px] sm:text-xs text-indigo-500 font-bold mb-1 ml-1">{msg.sender?.full_name}</p>}
                    
                    {/* Message Bubble */}
                    <div className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[60%] px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl ${mine ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-br-sm shadow-md shadow-indigo-200/50' : 'bg-white text-gray-800 rounded-bl-sm shadow-[0_4px_15px_rgb(0,0,0,0.03)] border border-gray-100'}`}>
                      {msg.message_type === 'text' || !msg.message_type ? <p className="text-sm sm:text-[15px] leading-relaxed break-words">{msg.content}</p> : <FileMessage fileUrl={msg.file_url} fileType={msg.file_type} fileName={msg.file_name} isMe={mine} />}
                      {msg.content && msg.message_type !== 'text' && <p className="text-sm sm:text-[15px] leading-relaxed mt-2 break-words">{msg.content}</p>}
                      <p className={`text-[9px] sm:text-[10px] font-medium mt-1.5 text-right ${mine ? 'text-indigo-200' : 'text-gray-400'}`}>{formatTime(msg.created_at)}</p>
                    </div>

                    {/* Delete Button (Hover to reveal below the message) */}
                    {(mine || user.profile?.role === 'admin') && msg.id && (
                      <button 
                        onClick={() => handleDeleteMessage(msg)} 
                        className={`mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs font-bold text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ${mine ? 'mr-2' : 'ml-2'}`}
                        title="Delete Message"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        ডিলিট
                      </button>
                    )}
                  </div>
                );
              })}
              {typing && <div className="flex justify-start"><div className="bg-white px-5 py-3.5 rounded-3xl rounded-bl-sm shadow-sm border border-gray-100 flex gap-1.5 items-center"><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span></div></div>}
              <div ref={messagesEndRef} />
            </div>

            {pendingFile && (
              <div className="bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 z-10 shadow-[0_-4px_20px_rgb(0,0,0,0.02)]">
                {pendingFile.type.startsWith('image/') ? <img src={pendingFile.url} alt="preview" className="h-12 w-12 sm:h-14 sm:w-14 object-cover rounded-xl shadow-sm border border-gray-200" /> : <div className="h-12 w-12 sm:h-14 sm:w-14 bg-indigo-50 rounded-xl flex items-center justify-center text-xl sm:text-2xl border border-indigo-100">📎</div>}
                <div className="flex-1 min-w-0"><p className="text-xs sm:text-sm font-bold text-gray-800 truncate">{pendingFile.name}</p><p className="text-[10px] sm:text-xs font-medium text-indigo-500">Ready to send</p></div>
                <button onClick={() => setPendingFile(null)} className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-full transition-colors font-bold text-sm">✕</button>
              </div>
            )}

            <div className="bg-white/90 backdrop-blur-lg border-t border-gray-100/50 p-3 sm:p-5 flex items-center gap-2 sm:gap-4 z-10 shrink-0 mb-safe">
              <FileUploadButton folder={activeGroup ? 'groups' : 'direct'} onFileReady={(file) => setPendingFile(file)} />
              <input value={input} onChange={e => { setInput(e.target.value); handleTyping(); }} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={pendingFile ? 'Caption...' : 'Message...'} className="flex-1 bg-gray-50 border border-gray-200/60 rounded-full px-5 sm:px-6 py-3 sm:py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all text-sm sm:text-[15px] font-medium placeholder-gray-400 shadow-inner" />
              <button onClick={sendMessage} className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all text-xl shadow-md shrink-0"><svg className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5 sm:ml-1 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-white/40">
            <div className="w-28 h-28 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-[2rem] flex items-center justify-center shadow-inner mb-6 transform -rotate-6 transition-all hover:rotate-0"><span className="text-6xl transform rotate-6 hover:rotate-0">💬</span></div>
            <h2 className="text-3xl font-extrabold text-slate-800">Welcome to ChatApp</h2>
            <p className="text-slate-500 font-medium mt-2">Select a conversation or create a group to start</p>
          </div>
        )}
      </div>
    </div>
  );
}
