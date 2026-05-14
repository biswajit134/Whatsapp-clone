import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Sidebar from './Sidebar';
import Chat from './Chat';
import Auth from './Auth';
import AudioCall from './AudioCall';
import Newsfeed from './Newsfeed';
import Status from './Status';
import Reels from './Reels';
import MediaSidebar from './MediaSidebar';
import socket from './socket';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

/* Inner component — needs to be inside <Router> to use useLocation */
function AppRoutes({ user, setUser, onlineUsers, theme, toggleTheme }) {
  const location = useLocation();
  const isMediaRoute = ['/newsfeed', '/reels', '/status'].some(p => location.pathname.startsWith(p));

  // Reel upload trigger (MediaSidebar → Reels via ref/event)
  const triggerReelUpload = () => window.dispatchEvent(new CustomEvent('open_reel_upload'));

  return (
    <>
      {/* Chat sidebar — only on chat/default routes */}
      {!isMediaRoute && (
        <Sidebar
          user={user}
          setUser={setUser}
          onlineUsers={onlineUsers}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Media sidebar — only on media routes */}
      {isMediaRoute && (
        <MediaSidebar
          user={user}
          setUser={setUser}
          theme={theme}
          toggleTheme={toggleTheme}
          onReelUpload={triggerReelUpload}
        />
      )}

      <Routes>
        {/* Media routes */}
        <Route path="/newsfeed" element={<Newsfeed user={user} />} />
        <Route path="/reels"    element={<Reels    user={user} />} />
        <Route path="/status"   element={<Status   user={user} />} />

        {/* Chat */}
        <Route path="/rooms/:otherUserId" element={<Chat user={user} onlineUsers={onlineUsers} />} />

        {/* Default */}
        <Route path="/" element={<Navigate to="/newsfeed" replace />} />
      </Routes>
    </>
  );
}

function App() {
  const [user, setUser]             = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [theme, setTheme]           = useState(() => localStorage.getItem('whatsapp_theme') || 'dark');

  useEffect(() => {
    const saved = localStorage.getItem('whatsapp_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('whatsapp_theme', theme);
    document.body.classList.toggle('light-theme', theme === 'light');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    if (user?.user?._id) socket.emit('user_connected', user.user._id);
    else socket.emit('user_disconnected');

    socket.on('online_users', setOnlineUsers);
    return () => socket.off('online_users', setOnlineUsers);
  }, [user]);

  if (!user) return <Auth setUser={setUser} />;

  return (
    <div className="app">
      <AudioCall user={user} />
      <div className="app__body">
        <Router>
          <AppRoutes
            user={user}
            setUser={setUser}
            onlineUsers={onlineUsers}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        </Router>
      </div>
    </div>
  );
}

export default App;
