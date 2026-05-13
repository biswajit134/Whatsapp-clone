import React from 'react';
import './App.css';
import Sidebar from './Sidebar';
import Chat from './Chat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="app">
      <div className="app__body">
        <Router>
          <Sidebar />
          <Routes>
            <Route path="/rooms/:roomId" element={<Chat />} />
            <Route path="/" element={
              <div className="chat">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'gray' }}>
                  <h2>Welcome to WhatsApp Clone</h2>
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
