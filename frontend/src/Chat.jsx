import React, { useState, useEffect } from 'react';
import './Chat.css';
import axios from './axios';
import socket from './socket';
import { useParams } from 'react-router-dom';

function Chat() {
  const [input, setInput] = useState('');
  const [roomName, setRoomName] = useState('');
  const [messages, setMessages] = useState([]);
  const { roomId } = useParams();

  useEffect(() => {
    if (roomId) {
      axios.get(`/api/rooms/${roomId}`).then(response => {
        setRoomName(response.data.name);
      });

      axios.get(`/api/messages/${roomId}`).then(response => {
        setMessages(response.data);
      });
    }
  }, [roomId]);

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
      name: 'User', // Hardcoded for this simple clone
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
          <h3>{roomName}</h3>
          <p>Last seen today</p>
        </div>
        <div className="chat__headerRight">
          <span className="material-icons">search</span>
          <span className="material-icons">more_vert</span>
        </div>
      </div>

      <div className="chat__body">
        {messages.map((message, i) => (
          <p key={i} className={`chat__message ${message.received && 'chat__receiver'}`}>
            <span className="chat__name">{message.name}</span>
            {message.message}
            <span className="chat__timestamp">{message.timestamp}</span>
          </p>
        ))}
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
