import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', username: '', full_name: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:3001/api/auth/register', form);
      setSuccess('একাউন্ট সফলভাবে তৈরি হয়েছে!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-300/30 rounded-full blur-3xl mix-blend-multiply pointer-events-none animate-blob"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl mix-blend-multiply pointer-events-none animate-blob animation-delay-2000"></div>

      <div className="bg-white/70 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 w-full max-w-md transition-all z-10 relative">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200 mb-5 transform -rotate-6 transition-transform hover:rotate-0 duration-300">
            <span className="text-3xl text-white transform rotate-6 hover:rotate-0">✨</span>
          </div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            নতুন একাউন্ট
          </h1>
          <p className="text-gray-500 mt-2 font-medium">মিতালি  তে এ যোগ দিন</p>
        </div>

        {error && <div className="bg-red-50/80 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-center shadow-sm"><span className="mr-2">⚠️</span> {error}</div>}
        {success && <div className="bg-green-50/80 border-l-4 border-green-500 text-green-700 p-4 rounded-xl mb-6 text-sm flex items-center shadow-sm"><span className="mr-2">✅</span> {success}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <input placeholder="পুরো নাম" value={form.full_name}
            onChange={e => setForm({...form, full_name: e.target.value})}
            className="w-full bg-white/60 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm placeholder:text-gray-400" required />
          
          <input placeholder="ইউজারনেম" value={form.username}
            onChange={e => setForm({...form, username: e.target.value})}
            className="w-full bg-white/60 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm placeholder:text-gray-400" required />
          
          <input type="email" placeholder="ইমেইল" value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            className="w-full bg-white/60 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm placeholder:text-gray-400" required />
          
          <input type="password" placeholder="পাসওয়ার্ড" value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            className="w-full bg-white/60 border border-gray-200 rounded-2xl px-5 py-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm placeholder:text-gray-400" required />

          <button type="submit" disabled={loading} className={`w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all mt-4 ${loading ? 'opacity-70' : ''}`}>
            {loading ? 'রেজিস্টার হচ্ছে...' : 'রেজিস্টার করুন'}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500 text-sm font-medium">
          আগে থেকেই একাউন্ট আছে? <Link to="/login" className="text-indigo-600 font-bold hover:underline">লগইন করুন</Link>
        </p>
      </div>
    </div>
  );
}