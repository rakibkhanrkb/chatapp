import { useEffect, useRef, useState } from 'react';

export default function CallModal({ 
  isReceivingCall, callerName, callerSignal, callerId,
  isInitiatingCall, callType, remoteUser, 
  socket, currentUser, onCallEnd 
}) {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  
  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const connectionRef = useRef(null);

  useEffect(() => {
    // ক্যামেরা ও মাইক্রোফোনের পারমিশন নেওয়া
    navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) myVideo.current.srcObject = currentStream;

        if (isInitiatingCall) {
          initiateCall(currentStream);
        }
      })
      .catch(err => console.error("Media permission denied", err));

    socket.on('call_accepted', (signal) => {
      setCallAccepted(true);
      connectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
    });

    socket.on('ice_candidate', (candidate) => {
      if (connectionRef.current) {
        connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('call_ended', () => {
      leaveCall(false);
    });

    return () => {
      socket.off('call_accepted');
      socket.off('ice_candidate');
      socket.off('call_ended');
    };
  }, []);

  const createPeerConnection = (currentStream) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Google's free STUN server
    });

    currentStream.getTracks().forEach(track => peer.addTrack(track, currentStream));

    peer.ontrack = (event) => {
      if (userVideo.current) userVideo.current.srcObject = event.streams[0];
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        const targetId = isReceivingCall ? callerId : remoteUser.id;
        socket.emit('ice_candidate', { to: targetId, candidate: event.candidate });
      }
    };

    return peer;
  };

  const initiateCall = async (currentStream) => {
    const peer = createPeerConnection(currentStream);
    connectionRef.current = peer;

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit('call_user', {
      userToCall: remoteUser.id,
      signalData: offer,
      from: currentUser.id,
      name: currentUser.profile?.full_name || 'User',
      type: callType
    });
  };

  const answerCall = async () => {
    setCallAccepted(true);
    const peer = createPeerConnection(stream);
    connectionRef.current = peer;

    await peer.setRemoteDescription(new RTCSessionDescription(callerSignal));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit('answer_call', { signal: answer, to: callerId });
  };

  const leaveCall = (emitEnd = true) => {
    setCallEnded(true);
    if (connectionRef.current) connectionRef.current.close();
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (emitEnd) {
      const targetId = isReceivingCall ? callerId : remoteUser?.id;
      socket.emit('end_call', { to: targetId });
    }
    onCallEnd();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-3xl p-6 w-full max-w-4xl shadow-2xl relative">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {isReceivingCall && !callAccepted ? `${callerName} is calling...` : `${callType === 'video' ? '📹 Video' : '📞 Audio'} Call`}
          </h2>
          <p className="text-slate-400">{callAccepted ? 'Connected' : 'Ringing...'}</p>
        </div>

        {/* Video Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative">
          {/* Local Video */}
          <div className="bg-slate-700 rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center shadow-inner">
            {stream ? (
              <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover" />
            ) : <span className="text-slate-400">Loading camera...</span>}
            <span className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">You</span>
          </div>

          {/* Remote Video (Shows placeholder until connected) */}
          {callAccepted && !callEnded ? (
             <div className="bg-slate-700 rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center shadow-inner">
               <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
               <span className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">{isReceivingCall ? callerName : remoteUser?.full_name}</span>
             </div>
          ) : (
             <div className="bg-slate-700/50 rounded-2xl border border-dashed border-slate-600 aspect-video flex items-center justify-center text-slate-500 font-medium">
               Waiting for user...
             </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex justify-center gap-6">
          {isReceivingCall && !callAccepted ? (
            <>
              <button onClick={answerCall} className="bg-green-500 hover:bg-green-400 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-green-500/30 transition-all flex items-center gap-2 text-lg">
                <span>📞</span> Accept
              </button>
              <button onClick={() => leaveCall(true)} className="bg-red-500 hover:bg-red-400 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-red-500/30 transition-all flex items-center gap-2 text-lg">
                <span>❌</span> Decline
              </button>
            </>
          ) : (
            <button onClick={() => leaveCall(true)} className="bg-red-500 hover:bg-red-400 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-red-500/30 transition-all flex items-center gap-2 text-lg">
              <span>📞</span> End Call
            </button>
          )}
        </div>

      </div>
    </div>
  );
}