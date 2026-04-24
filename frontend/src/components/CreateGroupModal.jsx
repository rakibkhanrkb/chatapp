import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CreateGroupModal({ currentUser, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await axios.get(`http://localhost:3001/api/messages/users?q=`);
      setUsers(data.filter(u => u.id !== currentUser.id));
    }
    load();
  }, []);

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  function toggleUser(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function createGroup() {
    if (!name.trim()) return alert('Group এর নাম দাও!');
    if (selected.length === 0) return alert('অন্তত একজন member যোগ করো!');

    const { data } = await axios.post('http://localhost:3001/api/groups/create', {
      name, description,
      createdBy: currentUser.id,
      memberIds: selected
    });
    onCreated(data);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">নতুন Group তৈরি করো</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <input placeholder="Group এর নাম *" value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm" />

        <input placeholder="Description (optional)" value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm" />

        <input placeholder="🔍 Member খোঁজো..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-100 rounded-xl px-4 py-2.5 mb-3 focus:outline-none text-sm" />

        <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
          {filtered.map(u => (
            <div key={u.id} onClick={() => toggleUser(u.id)}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition ${selected.includes(u.id) ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'}`}>
              <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
                {u.full_name?.[0] || u.username?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{u.full_name}</p>
                <p className="text-xs text-gray-400">@{u.username}</p>
              </div>
              {selected.includes(u.id) && <span className="text-indigo-600">✓</span>}
            </div>
          ))}
        </div>

        {selected.length > 0 && (
          <p className="text-xs text-indigo-600 mb-3">{selected.length} জন selected</p>
        )}

        <button onClick={createGroup}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">
          Group তৈরি করো 🚀
        </button>
      </div>
    </div>
  );
}