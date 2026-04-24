import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', username: '', role: '', email: '', password: '' });
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'messages') fetchAllMessages();
  }, [activeTab]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data } = await axios.get('https://chatapp-812b.onrender.com/api/admin/users', { headers: { 'x-user-id': currentUser.id } });
      setUsers(data);
    } catch (err) {
      if (err.response?.status === 403) navigate('/');
    } finally { setLoading(false); }
  }

  async function fetchAllMessages() {
    setLoading(true);
    try {
      const { data } = await axios.get('https://chatapp-812b.onrender.com/api/admin/all-messages', { headers: { 'x-user-id': currentUser.id } });
      setAllMessages(data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  function openEditModal(user) { 
    setEditingUser(user); 
    // ইমেইল এবং ইউজারনেম আগে থেকেই ফর্মে ফিল-আপ করা থাকবে
    setEditForm({ 
      full_name: user.full_name || '', 
      username: user.username || '', 
      role: user.role || 'user', 
      email: user.email || '', 
      password: '' // পাসওয়ার্ড সবসময় খালি থাকবে সিকিউরিটির জন্য
    }); 
  }
  
  async function handleUpdateUser(e) {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      await axios.put('https://chatapp-812b.onrender.com/api/admin/users/${editingUser.id}', editForm, { headers: { 'x-user-id': currentUser.id } });
      
      // লোকাল স্টেট আপডেট করা
      setUsers(users.map(u => u.id === editingUser.id ? { 
        ...u, 
        full_name: editForm.full_name, 
        username: editForm.username, 
        role: editForm.role,
        email: editForm.email // ইমেইল আপডেট
      } : u));
      
      alert('ইউজারের তথ্য সফলভাবে পরিবর্তন করা হয়েছে!');
      setEditingUser(null);
    } catch (err) { 
      alert('আপডেট ব্যর্থ হয়েছে: ' + (err.response?.data?.error || err.message)); 
    } finally {
      setUpdateLoading(false);
    }
  }

  async function deleteUser(id, name) {
    if (!window.confirm(`আপনি কি সত্যিই ${name} কে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।`)) return;
    try {
      await axios.delete('https://chatapp-812b.onrender.com/api/admin/users/${id}', { headers: { 'x-user-id': currentUser.id } });
      setUsers(users.filter(u => u.id !== id));
    } catch (err) { alert('Failed to delete: ' + (err.response?.data?.error || err.message)); }
  }

  async function deleteGlobalMessage(id) {
    if (!window.confirm("আপনি কি মেসেজটি স্থায়ীভাবে মুছে ফেলতে চান?")) return;
    try {
      await axios.delete('https://chatapp-812b.onrender.com/api/admin/messages/${id}', { headers: { 'x-user-id': currentUser.id } });
      setAllMessages(allMessages.filter(m => m.id !== id));
    } catch (err) { alert('Failed to delete message'); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 sm:p-6 lg:p-8 relative">
      
      {/* 🟢 EDIT USER MODAL (Management Section) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">ম্যানেজ ইউজার</h2>
            <p className="text-xs text-slate-500 mb-6">ইউজারের প্রোফাইল, আইডি এবং পাসওয়ার্ড পরিবর্তন করুন</p>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              
              {/* Profile Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">প্রোফাইল তথ্য</p>
                <div className="space-y-3">
                  <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" required placeholder="পুরো নাম"/>
                  <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-medium">
                    <option value="user">সাধারণ ইউজার (User)</option>
                    <option value="admin">অ্যাডমিন (Admin)</option>
                  </select>
                </div>
              </div>

              {/* Security & Credentials (ID & Password) */}
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <p className="text-[11px] font-extrabold text-indigo-400 uppercase tracking-wider mb-3">লগইন আইডি ও পাসওয়ার্ড</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 font-semibold ml-1">ইউজারনেম (Username)</label>
                    <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full mt-1 bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" required />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold ml-1">ইমেইল আইডি (Email)</label>
                    <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full mt-1 bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all" required />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold ml-1 flex justify-between">
                      <span>নতুন পাসওয়ার্ড সেট করুন</span>
                      <span className="text-indigo-400 text-[10px]">(পরিবর্তন না করলে খালি রাখুন)</span>
                    </label>
                    <input type="text" placeholder="নতুন পাসওয়ার্ড লিখুন..." value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full mt-1 bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-300" />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-8 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-2xl font-bold hover:bg-slate-200 transition-colors text-sm">বাতিল করুন</button>
                <button type="submit" disabled={updateLoading} className={`flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 rounded-2xl font-bold hover:shadow-lg transition-all text-sm ${updateLoading ? 'opacity-70' : ''}`}>
                  {updateLoading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Admin Dashboard Content */}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white/50 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900">Admin Control Panel</h1>
          </div>
          <button onClick={() => navigate('/')} className="w-full sm:w-auto bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm text-sm sm:text-base">← চ্যাটে ফিরে যান</button>
        </div>

        <div className="flex gap-3 mb-6">
          <button onClick={() => setActiveTab('users')} className={`px-5 sm:px-6 py-3 rounded-2xl font-bold transition-all shadow-sm text-sm sm:text-base flex-1 sm:flex-none ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>👥 সকল ইউজার</button>
          <button onClick={() => setActiveTab('messages')} className={`px-5 sm:px-6 py-3 rounded-2xl font-bold transition-all shadow-sm text-sm sm:text-base flex-1 sm:flex-none ${activeTab === 'messages' ? 'bg-purple-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>💬 সকল মেসেজ</button>
        </div>

        {/* Tab Content: USERS */}
        {activeTab === 'users' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50/50 text-slate-500 text-sm border-b border-slate-100">
                  <tr>
                    <th className="p-4 pl-6">ইউজারনেম ও নাম</th>
                    <th className="p-4">ইমেইল (ID)</th>
                    <th className="p-4">রোল</th>
                    <th className="p-4 text-right pr-6">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? <tr><td colSpan="4" className="p-8 text-center text-slate-400">লোড হচ্ছে...</td></tr> : users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold">{u.full_name?.[0]}</div>
                        <div>
                          <p className="font-bold text-slate-800">{u.full_name}</p>
                          <p className="text-xs text-slate-500">@{u.username}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-slate-700">{u.email}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full ${u.is_online ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                          <span className="text-[10px] text-slate-500">{u.is_online ? 'Online' : 'Offline'}</span>
                        </div>
                      </td>
                      <td className="p-4"><span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                      <td className="p-4 pr-6 text-right space-x-2">
                        <button onClick={() => openEditModal(u)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all">ম্যানেজ</button>
                        {u.id !== currentUser.id && <button onClick={() => deleteUser(u.id, u.full_name)} className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all">ডিলিট</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: ALL MESSAGES */}
        {activeTab === 'messages' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-white/50 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50"><h2 className="font-bold text-slate-700">ব্যবহারকারীদের মেসেজ লিস্ট</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50/50 text-slate-500 text-sm border-b border-slate-100">
                  <tr><th className="p-4 pl-6">তারিখ ও সময়</th><th className="p-4">প্রেরক (Sender)</th><th className="p-4">প্রাপক (Receiver)</th><th className="p-4 w-1/3">মেসেজ কন্টেন্ট</th><th className="p-4 text-right pr-6">অ্যাকশন</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? <tr><td colSpan="5" className="p-8 text-center text-slate-400">মেসেজ লোড হচ্ছে...</td></tr> : allMessages.map(msg => (
                    <tr key={msg.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                      <td className="p-4 pl-6 text-slate-500 font-medium">{new Date(msg.created_at).toLocaleString('bn-BD')}</td>
                      <td className="p-4 font-bold text-indigo-600">{msg.sender?.full_name || 'Unknown'}</td>
                      <td className="p-4 font-bold text-purple-600">{msg.receiver?.full_name || 'Group/Unknown'}</td>
                      <td className="p-4 text-slate-700 break-words">{msg.content || '[File/Media]'}</td>
                      <td className="p-4 pr-6 text-right">
                        <button onClick={() => deleteGlobalMessage(msg.id)} className="bg-red-50 hover:bg-red-500 hover:text-white text-red-600 px-4 py-2 rounded-xl font-bold transition-all text-xs">মুছে ফেলুন</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
