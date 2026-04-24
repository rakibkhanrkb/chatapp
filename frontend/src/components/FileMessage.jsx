export default function FileMessage({ fileUrl, fileType, fileName, isMe }) {
  const isImage = fileType?.startsWith('image/');
  const isVideo = fileType?.startsWith('video/');

  if (isImage) return (
    <a href={fileUrl} target="_blank" rel="noreferrer">
      <img src={fileUrl} alt={fileName}
        className="max-w-xs rounded-xl cursor-pointer hover:opacity-90 transition"
        style={{ maxHeight: 200 }} />
    </a>
  );

  if (isVideo) return (
    <video controls className="max-w-xs rounded-xl" style={{ maxHeight: 200 }}>
      <source src={fileUrl} type={fileType} />
    </video>
  );

  return (
    <a href={fileUrl} target="_blank" rel="noreferrer"
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isMe ? 'border-indigo-400 text-indigo-100' : 'border-gray-200 text-gray-700'} hover:opacity-80 transition`}>
      <span className="text-xl">📎</span>
      <div>
        <p className="text-sm font-semibold truncate max-w-xs">{fileName}</p>
        <p className="text-xs opacity-70">ডাউনলোড করো</p>
      </div>
    </a>
  );
}