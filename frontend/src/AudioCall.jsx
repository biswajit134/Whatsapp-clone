import React, { useEffect, useState, useRef } from 'react';
import socket from './socket';

function AudioCall({ user }) {
  const [receivingCall, setReceivingCall] = useState(false);
  const [callerName, setCallerName] = useState('');
  const [callerId, setCallerId] = useState('');
  const [callType, setCallType] = useState('audio'); // 'audio' or 'video'
  const [callAccepted, setCallAccepted] = useState(false);
  const [calling, setCalling] = useState(false);
  
  const myVideoRef = useRef();
  const remoteVideoRef = useRef();
  const connectionRef = useRef();
  const myStreamRef = useRef();

  useEffect(() => {
    socket.on('incoming_call', (data) => {
      setReceivingCall(true);
      setCallerId(data.from);
      setCallerName(data.name);
      setCallType(data.callType || 'audio');
      connectionRef.current = { offer: data.offer };
    });

    socket.on('call_accepted', async (answer) => {
      setCallAccepted(true);
      if (connectionRef.current?.peer) {
        await connectionRef.current.peer.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice_candidate', async (data) => {
      if (connectionRef.current?.peer) {
        try {
          await connectionRef.current.peer.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch(e) { console.error('Error adding received ice candidate', e); }
      }
    });

    socket.on('call_ended', () => {
      endCall(false);
    });
    
    const handleStartCall = async (e) => {
      const { otherUserId, otherUserName, callType: cType } = e.detail;
      setCalling(true);
      setCallerName(otherUserName);
      setCallerId(otherUserId);
      setCallType(cType || 'audio');
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: cType === 'video' });
        myStreamRef.current = stream;
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        
        const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
        
        peer.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };
        
        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice_candidate', { to: otherUserId, candidate: event.candidate, from: user.user._id });
          }
        };
        
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        
        connectionRef.current = { peer };
        socket.emit('call_user', { userToCall: otherUserId, offer, from: user.user._id, name: user.user.name, callType: cType });
      } catch (err) {
        alert("Camera/Microphone permission denied or unavailable.");
        setCalling(false);
      }
    };
    
    window.addEventListener('initiate_call', handleStartCall);

    return () => {
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('ice_candidate');
      socket.off('call_ended');
      window.removeEventListener('initiate_call', handleStartCall);
    };
  }, [user]);

  const answerCall = async () => {
    setCallAccepted(true);
    setReceivingCall(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      myStreamRef.current = stream;
      if (myVideoRef.current) myVideoRef.current.srcObject = stream;

      const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      stream.getTracks().forEach(track => peer.addTrack(track, stream));

      peer.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', { to: callerId, candidate: event.candidate, from: user.user._id });
        }
      };

      const offer = connectionRef.current.offer;
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      
      connectionRef.current.peer = peer;
      
      socket.emit('answer_call', { to: callerId, answer });
    } catch (err) {
      alert("Camera/Microphone permission denied or unavailable.");
      endCall(true);
    }
  };

  const endCall = (emit = true) => {
    setCalling(false);
    setReceivingCall(false);
    setCallAccepted(false);
    
    if (myStreamRef.current) {
      myStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (connectionRef.current?.peer) {
      connectionRef.current.peer.close();
    }
    if (emit) {
      socket.emit('end_call', { to: callerId });
    }
    connectionRef.current = null;
  };

  if (!calling && !receivingCall && !callAccepted) return null;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
      backgroundColor: callType === 'video' ? 'black' : 'rgba(17, 27, 33, 0.95)', 
      zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white',
      backdropFilter: callType === 'video' ? 'none' : 'blur(10px)'
    }}>
      
      {/* Video Elements */}
      {callType === 'video' && callAccepted && (
        <video playsInline ref={remoteVideoRef} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />
      )}
      
      <video playsInline muted ref={myVideoRef} autoPlay style={{ 
        width: callType === 'video' && callAccepted ? '150px' : '0px', 
        height: callType === 'video' && callAccepted ? '200px' : '0px', 
        objectFit: 'cover', position: 'absolute', bottom: 30, right: 30, 
        borderRadius: 15, border: callType === 'video' && callAccepted ? '2px solid white' : 'none', zIndex: 2,
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
      }} />

      {/* Audio Element Fallback */}
      {callType === 'audio' && (
        <video playsInline ref={remoteVideoRef} autoPlay style={{ display: 'none' }} />
      )}

      {/* UI Overlay */}
      {(!callAccepted || callType === 'audio') && (
        <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 120, height: 120, borderRadius: '50%', backgroundColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 30 }}>
            <span className="material-icons" style={{ fontSize: 60, color: 'white' }}>{callType === 'video' ? 'videocam' : 'account_circle'}</span>
          </div>

          <h2 style={{ marginBottom: 10, fontSize: '32px', fontWeight: '500' }}>{callerName}</h2>
          <p style={{ marginBottom: 50, color: '#8696a0', fontSize: '18px' }}>
            {receivingCall && !callAccepted ? `Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call...` : 
             callAccepted ? 'Call in progress' : `Calling ${callType === 'video' ? 'Video' : 'Audio'}...`}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '30px', zIndex: 2, position: callType === 'video' && callAccepted ? 'absolute' : 'relative', bottom: callType === 'video' && callAccepted ? 40 : 0 }}>
        {receivingCall && !callAccepted && (
          <button onClick={answerCall} style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#25D366', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)' }}>
            <span className="material-icons" style={{ fontSize: 30 }}>{callType === 'video' ? 'videocam' : 'call'}</span>
          </button>
        )}
        <button onClick={() => endCall(true)} style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#ef5350', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(239, 83, 80, 0.4)' }}>
          <span className="material-icons" style={{ fontSize: 30 }}>call_end</span>
        </button>
      </div>
    </div>
  );
}

export default AudioCall;
