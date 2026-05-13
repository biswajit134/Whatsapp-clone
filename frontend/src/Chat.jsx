import React, { useState } from 'react';
import './Chat.css';
import axios from './axios';

function Chat({ messages }) {
  const [input, setInput] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    await axios.post('/messages/new', {
      message: input,
      name: 'User', // Hardcoded for this simple clone
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      received: false,
    });

    setInput('');
  };

  return (
    <div className="chat">
      <div className="chat__header">
        <span className="material-icons avatar">account_circle</span>
        <div className="chat__headerInfo">
          <h3>Global Chat</h3>
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
