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

    socket.on('inserted_message', handleNewMessage);

    return () => {
      socket.off('inserted_message', handleNewMessage);
    };
  }, [roomId]);

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
          <span className="material-icons">search</span>
          <span className="material-icons">more_vert</span>
        </div>
      </div>

      <div className="chat__body">
        {Array.isArray(messages) && messages.map((message, i) => (
          <p key={i} className={`chat__message ${message.name === user?.user?.name ? 'chat__receiver' : ''}`}>
            <span className="chat__name">{message.name}</span>
            {message.message}
            <span className="chat__timestamp">{message.timestamp}</span>
          </p>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat__footer">
        <span className="material-icons">insert_emoticon</span>
        <form>
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
        <span className="material-icons">mic</span>
      </div>
    </div>
  );
}

export default Chat;
