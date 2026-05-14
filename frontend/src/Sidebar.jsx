import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import SidebarChat from './SidebarChat';
import axios from './axios';
import socket from './socket';

function Sidebar({ user, setUser, onlineUsers, theme, toggleTheme }) {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const profilePicRef = React.useRef(null);

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

    const handleUserUpdated = (updatedUser) => {
      if (updatedUser._id === user?.user?._id) {
        const newUserState = { ...user, user: updatedUser };
        setUser(newUserState);
        localStorage.setItem('whatsapp_user', JSON.stringify(newUserState));
      } else {
        setContacts((prev) => prev.map(c => c._id === updatedUser._id ? updatedUser : c));
      }
    };

    socket.on('new_user', handleNewUser);
    socket.on('user_updated', handleUserUpdated);
    return () => {
      socket.off('new_user', handleNewUser);
      socket.off('user_updated', handleUserUpdated);
    };
  }, [user]);

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large! Maximum 5MB allowed.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Image = reader.result;
      try {
        await axios.post('/api/users/profilePic', {
          userId: user.user._id,
          profilePic: base64Image
        });
      } catch(err) {
        console.error(err);
        alert("Error updating profile picture");
      }
    };
  };

  const createChat = () => {
    alert("Direct messaging is enabled! Just click on a contact below to start chatting.");
  };

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__headerLeft" style={{display: 'flex', alignItems: 'center'}}>
          <div style={{ position: 'relative', display: 'inline-block', marginRight: 10 }}>
            {user?.user?.profilePic ? (
               <img src={user.user.profilePic} alt="profile" style={{ width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', objectFit: 'cover' }} onClick={() => profilePicRef.current.click()} title="Change Profile Picture" />
            ) : (
               <span className="material-icons avatar" style={{ cursor: 'pointer', fontSize: 40 }} onClick={() => profilePicRef.current.click()} title="Change Profile Picture">account_circle</span>
            )}
            <div 
              style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: 'var(--bg-header)', borderRadius: '50%', width: 16, height: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', cursor: 'pointer' }}
              onClick={() => profilePicRef.current.click()}
              title="Change Profile Picture"
            >
              <span className="material-icons" style={{ fontSize: 11, color: 'var(--text-primary)' }}>camera_alt</span>
            </div>
          </div>
          <input type="file" accept="image/*" ref={profilePicRef} style={{ display: 'none' }} onChange={handleProfilePicChange} />
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
                profilePic={contact.profilePic}
              />
          ))
        )}
      </div>
    </div>
  );
}

export default Sidebar;
