import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './Sidebar';
import Chat from './Chat';
import Auth from './Auth';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('whatsapp_user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    }
  }, []);

  if (!user) {
    return <Auth setUser={setUser} />;
  }

  return (
    <div className="app">
      <div className="app__body">
        <Router>
          <Sidebar user={user} setUser={setUser} />
          <Routes>
            <Route path="/rooms/:otherUserId" element={<Chat user={user} />} />
            <Route path="/" element={
              <div className="chat">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'gray' }}>
                  <h2>Welcome to WhatsApp Clone, {user.user.name}</h2>
                  <p>Select a chat or create a new one to start messaging</p>
                </div>
              </div>
            } />
          </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;
