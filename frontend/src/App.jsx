import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './Sidebar';
import Chat from './Chat';
import Auth from './Auth';
import AudioCall from './AudioCall';
import Newsfeed from './Newsfeed';
import Status from './Status';
import socket from './socket';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  const [user, setUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('whatsapp_theme') || 'dark');

  useEffect(() => {
    const loggedInUser = localStorage.getItem('whatsapp_user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('whatsapp_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (user?.user?._id) {
      socket.emit('user_connected', user.user._id);
    } else {
      socket.emit('user_disconnected');
    }
    
    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off('online_users');
    };
  }, [user]);

  if (!user) {
    return <Auth setUser={setUser} />;
  }

  return (
    <div className="app">
      <AudioCall user={user} />
      <div className="app__body">
        <Router>
          <Sidebar user={user} setUser={setUser} onlineUsers={onlineUsers} theme={theme} toggleTheme={toggleTheme} />
          <Routes>
            <Route path="/newsfeed" element={<Newsfeed user={user} />} />
            <Route path="/status" element={<Status user={user} />} />
            <Route path="/rooms/:otherUserId" element={<Chat user={user} onlineUsers={onlineUsers} />} />
            <Route path="/" element={<Navigate to="/newsfeed" replace />} />
          </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;
