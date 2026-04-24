import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  // email এর বদলে identifier ব্যবহার করা হয়েছে
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post('http://localhost:3001/api/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'লগইন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300/30 rounded-full blur-3xl mix-blend-multiply pointer-events-none animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl mix-blend-multiply pointer-events-none animate-blob animation-delay-2000"></div>

      <div className="bg-white/70 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 w-full max-w-md transition-all z-10 relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200 mb-5 transform -rotate-6 transition-transform hover:rotate-0 duration-300">
            <span className="text-3xl text-white transform rotate-6 hover:rotate-0">💬</span>
          </div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            মিতালি
          </h1>
  
          <p className="text-gray-500 mt-2 font-medium">মিতালি তে বন্ধুত্ব হোক গোপনে</p>
        </div>

        {error && (
          <div className="bg-red-50/80 border-l-4 border-red-500 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-center shadow-sm">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">ইমেইল বা ইউজারনেম</label>
            {/* type="text" করা হয়েছে যেন ইউজারনেম টাইপ করা যায় */}
            <input type="text" placeholder="example@mail.com বা your_username" value={form.identifier}
              onChange={e => setForm({...form, identifier: e.target.value})}
              className="w-full bg-white/60 border border-gray-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all text-sm shadow-sm placeholder:text-gray-400" required />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">পাসওয়ার্ড</label>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              className="w-full bg-white/60 border border-gray-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all text-sm shadow-sm placeholder:text-gray-400" required />
          </div>

          <button type="submit" disabled={loading} className={`w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-200 mt-4 flex justify-center items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500 text-sm font-medium">
          নতুন ইউজার? <Link to="/register" className="text-indigo-600 font-bold hover:underline">একাউন্ট তৈরি করুন</Link>
        </p>
      </div>
    </div>
  );
}