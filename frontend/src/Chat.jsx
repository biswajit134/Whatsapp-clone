import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';
import axios from './axios';
import socket from './socket';
import { useParams } from 'react-router-dom';

function Chat({ user, onlineUsers }) {
  const [input, setInput] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const { otherUserId } = useParams();
  const messagesEndRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  // Compute composite roomId
  const currentUserId = user?.user?._id;
  const roomId = currentUserId && otherUserId 
    ? [currentUserId, otherUserId].sort().join('_') 
    : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (otherUserId) {
      // Get the other user's name
      axios.get('/api/users').then(response => {
        const contact = response.data.find(u => u._id === otherUserId);
        setOtherUser(contact);
      }).catch(err => console.error(err));
    }

    if (roomId) {
      axios.get(`/api/messages/${roomId}`)
        .then(response => {
          setMessages(Array.isArray(response.data) ? response.data : []);
        })
        .catch(err => console.error("Error fetching messages", err));
    }
  }, [roomId, otherUserId]);

  useEffect(() => {
    const handleNewMessage = (newMessage) => {
      if (newMessage.roomId === roomId) {
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const handleSeen = (data) => {
      if (data.roomId === roomId) {
        setMessages((prev) => prev.map(m => ({ ...m, seen: true })));
      }
    };

    socket.on('inserted_message', handleNewMessage);
    socket.on('messages_seen', handleSeen);

    return () => {
      socket.off('inserted_message', handleNewMessage);
      socket.off('messages_seen', handleSeen);
    };
  }, [roomId]);

  // Mark messages as read when opening chat or receiving new messages
  useEffect(() => {
    if (roomId && user?.user?.name) {
      axios.post('/api/messages/seen', {
        roomId: roomId,
        username: user.user.name
      }).catch(err => console.error(err));
    }
  }, [roomId, messages.length, user]);

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim() || !roomId) return;

    await axios.post('/api/messages/new', {
      message: input,
      name: user?.user?.name || 'User',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      received: false,
      roomId: roomId
    });

    setInput('');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64AudioMessage = reader.result;
          await axios.post('/api/messages/new', {
            message: base64AudioMessage,
            name: user?.user?.name || 'User',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            received: false,
            roomId: roomId,
            messageType: 'audio'
          });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
      alert("File is too large! Maximum 20MB allowed.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64File = reader.result;
      const messageType = file.type.startsWith('image/') ? 'image' : 
                          file.type.startsWith('audio/') ? 'audio_file' : 'file';
                          
      await axios.post('/api/messages/new', {
        message: base64File,
        name: user?.user?.name || 'User',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        received: false,
        roomId: roomId,
        messageType: messageType
      });
    };
    e.target.value = null; // reset input
  };

  const startAudioCall = () => {
    const event = new CustomEvent('initiate_call', { 
      detail: { otherUserId, otherUserName: otherUser?.name, callType: 'audio' } 
    });
    window.dispatchEvent(event);
  };

  const startVideoCall = () => {
    const event = new CustomEvent('initiate_call', { 
      detail: { otherUserId, otherUserName: otherUser?.name, callType: 'video' } 
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="chat">
      <div className="chat__header">
        <span className="material-icons avatar">account_circle</span>
        <div className="chat__headerInfo">
          <h3>{otherUser?.name || 'Loading...'}</h3>
          <p style={{color: onlineUsers.includes(otherUserId) ? '#25D366' : 'gray', fontWeight: 500}}>
            {onlineUsers.includes(otherUserId) ? 'Online' : 'Offline'}
          </p>
        </div>
        <div className="chat__headerRight">
          <span className="material-icons" onClick={startVideoCall} style={{cursor: 'pointer', marginRight: '15px'}} title="Video Call">videocam</span>
          <span className="material-icons" onClick={startAudioCall} style={{cursor: 'pointer'}} title="Audio Call">call</span>
          <span className="material-icons">search</span>
          <span className="material-icons">more_vert</span>
        </div>
      </div>

      <div className="chat__body">
        {messages.map((message, i) => (
          <p key={i} className={`chat__message ${message.name === user?.user?.name ? 'chat__receiver' : ''}`}>
            <span className="chat__name">{message.name}</span>
            {message.messageType === 'audio' || message.messageType === 'audio_file' ? (
              <audio controls src={message.message} style={{ maxWidth: '250px', marginTop: '10px', display: 'block' }} />
            ) : message.messageType === 'image' ? (
              <img src={message.message} alt="shared media" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '10px', marginTop: '5px', display: 'block' }} />
            ) : (
              message.message
            )}
            <span className="chat__timestamp" style={{ display: 'inline-flex', alignItems: 'center', marginTop: message.messageType !== 'text' && message.messageType ? '5px' : '0' }}>
              {message.timestamp}
              {message.name === user?.user?.name && (
                <span className="material-icons" style={{ fontSize: '15px', marginLeft: '4px', color: message.seen ? '#34B7F1' : 'gray' }}>
                  done_all
                </span>
              )}
            </span>
          </p>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat__footer">
        <span className="material-icons">insert_emoticon</span>
        <span className="material-icons" onClick={() => fileInputRef.current.click()} style={{cursor: 'pointer', margin: '0 10px'}} title="Attach File">attach_file</span>
        <input 
          type="file" 
          accept="image/*,audio/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileSelect} 
        />
        {isRecording ? (
          <div style={{ flex: 1, color: '#ef5350', fontWeight: 'bold', padding: '0 15px', display: 'flex', alignItems: 'center' }}>
            <span className="material-icons" style={{ animation: 'pulse 1.5s infinite', marginRight: '10px' }}>mic</span>
            Recording Audio...
          </div>
        ) : (
          <form onSubmit={sendMessage}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message"
              type="text"
            />
            <button onClick={sendMessage} type="submit">
              Send a message
            </button>
          </form>
        )}
        {isRecording ? (
          <span className="material-icons" onClick={stopRecording} style={{ color: '#ef5350', cursor: 'pointer' }} title="Stop & Send">stop_circle</span>
        ) : (
          <span className="material-icons" onClick={startRecording} style={{ cursor: 'pointer' }} title="Hold to Record">mic</span>
        )}
      </div>
    </div>
  );
}

export default Chat;
