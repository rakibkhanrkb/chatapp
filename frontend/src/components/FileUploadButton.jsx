import { useRef, useState } from 'react';
import axios from 'axios';

export default function FileUploadButton({ onFileReady, folder = 'direct' }) {
  const inputRef = useRef();
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    // ফাইলের সাইজ লিমিট ১০০MB সেট করা হলো
    if (file.size > 100 * 1024 * 1024) {
      alert('ফাইল ১০০MB এর বেশি হতে পারবে না!');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        setUploading(true);
        setProgress(0);

        const { data } = await axios.post('http://localhost:3001/api/groups/upload', {
          fileName: file.name,
          fileData: base64,
          fileType: file.type,
          folder
        }, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        });
        
        onFileReady({ url: data.url, type: file.type, name: file.name });
      } catch (err) {
        console.error("Upload error details:", err.response?.data || err.message); 
        alert('Upload failed: ' + (err.response?.data?.error || 'Unknown error'));
      } finally {
        setUploading(false);
        setProgress(0);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="relative flex items-center justify-center">
      <input ref={inputRef} type="file" className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
        onChange={handleFile} />
      
      <button 
        type="button" 
        onClick={() => !uploading && inputRef.current.click()}
        disabled={uploading}
        className={`text-xl px-2 transition flex items-center justify-center w-10 h-10 rounded-full ${
          uploading ? 'cursor-not-allowed bg-indigo-50' : 'text-gray-400 hover:text-indigo-500 hover:bg-gray-50'
        }`}
        title={uploading ? 'আপলোড হচ্ছে...' : 'ফাইল পাঠাও'}
      >
        {uploading ? (
          <div className="relative flex items-center justify-center w-full h-full">
            <svg className="animate-spin w-7 h-7 text-indigo-500 absolute" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="absolute text-[9px] font-bold text-indigo-700">{progress}%</span>
          </div>
        ) : (
          '📎'
        )}
      </button>
    </div>
  );
}