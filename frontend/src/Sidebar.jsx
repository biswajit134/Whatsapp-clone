import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import SidebarChat from './SidebarChat';
import axios from './axios';
import socket from './socket';

function Sidebar({ user, setUser, onlineUsers, theme, toggleTheme }) {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    axios.get('/api/users').then(response => {
      // Filter out the currently logged in user
      const otherUsers = response.data.filter(u => u._id !== user?.user?._id);
      setContacts(otherUsers);
    }).catch(err => console.error(err));

    const handleNewUser = (newUser) => {
      if (newUser._id !== user?.user?._id) {
        setContacts((prev) => {
          if (prev.some(u => u._id === newUser._id)) return prev;
          return [...prev, newUser];
        });
      }
    };

    socket.on('new_user', handleNewUser);
    return () => socket.off('new_user', handleNewUser);
  }, [user]);

  const createChat = () => {
    alert("Direct messaging is enabled! Just click on a contact below to start chatting.");
  };

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__headerLeft" style={{display: 'flex', alignItems: 'center'}}>
          <span className="material-icons avatar" style={{marginRight: '10px'}}>account_circle</span>
          <span style={{fontWeight: 600, color: 'var(--text-primary)', fontSize: '16px'}}>{user?.user?.name}</span>
        </div>
        <div className="sidebar__headerRight">
          <span className="material-icons" onClick={toggleTheme} style={{cursor: 'pointer'}} title="Toggle Theme">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
          <span className="material-icons" onClick={() => {
            localStorage.removeItem('whatsapp_user');
            setUser(null);
          }} style={{cursor: 'pointer'}} title="Logout">logout</span>
        </div>
      </div>
      <div className="sidebar__search">
        <div className="sidebar__searchContainer">
          <span className="material-icons">search</span>
          <input 
            placeholder="Search or start new chat" 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="sidebar__chats">
        {contacts.length === 0 ? (
          <div style={{padding: 20, textAlign: 'center', color: 'gray'}}>
            No other users registered yet.
          </div>
        ) : (
          contacts
            .filter(contact => contact.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(contact => (
              <SidebarChat 
                key={contact._id} 
                id={contact._id} 
                name={contact.name} 
                isOnline={onlineUsers.includes(contact._id)} 
              />
          ))
        )}
      </div>
    </div>
  );
}

export default Sidebar;
