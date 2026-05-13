import React, { useEffect, useState } from 'react';
import './App.css';
import Sidebar from './Sidebar';
import Chat from './Chat';
import io from 'socket.io-client';
import axios from './axios';

// Connect to backend socket
const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') || '/' : 'http://localhost:9000';
const socket = io(socketUrl);

function App() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Initial fetch of all messages
    axios.get('/messages/sync').then((response) => {
      setMessages(response.data);
    });
  }, []);

  useEffect(() => {
    socket.on('inserted', (newMessage) => {
      setMessages([...messages, newMessage]);
    });

    return () => {
      socket.off('inserted');
    };
  }, [messages]);

  return (
    <div className="app">
      <div className="app__body">
        <Sidebar />
        <Chat messages={messages} />
      </div>
    </div>
  );
}

export default App;
