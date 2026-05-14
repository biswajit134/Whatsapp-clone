import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import SidebarChat from './SidebarChat';
import axios from './axios';
import socket from './socket';

import { useNavigate } from 'react-router-dom';

function Sidebar({ user, setUser, onlineUsers, theme, toggleTheme }) {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const profilePicRef = React.useRef(null);
  const navigate = useNavigate();

  // Group Creation State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: user?.user?.name || '',
    email: user?.user?.email || '',
    phone: user?.user?.phone || '',
    description: user?.user?.description || '',
    password: '' // Only if changing
  });
  const [settingsUpdating, setSettingsUpdating] = useState(false);

  useEffect(() => {
    // Fetch users
    axios.get('/api/users').then(response => {
      const otherUsers = response.data.filter(u => u._id !== user?.user?._id);
      setContacts(otherUsers);
    }).catch(err => console.error(err));

    // Fetch rooms (groups)
    axios.get('/api/rooms').then(response => {
      const allGroups = response.data.filter(r => r.isGroup && r.participants?.includes(user?.user?._id));
      setGroups(allGroups);
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

    const handleInsertedRoom = (newRoom) => {
      if (newRoom.isGroup && newRoom.participants?.includes(user?.user?._id)) {
        setGroups((prev) => {
          if (prev.some(g => g._id === newRoom._id)) return prev;
          return [...prev, newRoom];
        });
      }
    };

    socket.on('new_user', handleNewUser);
    socket.on('user_updated', handleUserUpdated);
    socket.on('inserted_room', handleInsertedRoom);

    return () => {
      socket.off('new_user', handleNewUser);
      socket.off('user_updated', handleUserUpdated);
      socket.off('inserted_room', handleInsertedRoom);
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

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) {
      alert("Please provide a group name and select at least one participant.");
      return;
    }

    const newGroup = {
      name: groupName,
      participants: [...selectedParticipants, user.user._id],
      admin: user.user._id
    };

    try {
      await axios.post('/api/groups/new', newGroup);
      setShowGroupModal(false);
      setGroupName('');
      setSelectedParticipants([]);
    } catch(err) {
      console.error("Error creating group:", err);
      alert("Failed to create group");
    }
  };

  const toggleParticipant = (userId) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedParticipants(prev => [...prev, userId]);
    }
  };

  const handleSettingsChange = (e) => {
    setSettingsForm({ ...settingsForm, [e.target.name]: e.target.value });
  };

  const handleUpdateSettings = async () => {
    setSettingsUpdating(true);
    try {
      const response = await axios.post('/api/users/update', {
        userId: user.user._id,
        ...settingsForm
      });
      // Updating UI is handled by socket handleUserUpdated
      setShowSettingsModal(false);
      setSettingsForm(prev => ({ ...prev, password: '' })); // clear pass field
    } catch(err) {
      alert("Error updating profile: " + (err.response?.data?.error || err.message));
    } finally {
      setSettingsUpdating(false);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__headerLeft">

          {/* Avatar */}
          <div className="sidebar__avatar-wrap" onClick={() => profilePicRef.current.click()} title="Change Profile Picture">
            {user?.user?.profilePic ? (
              <img src={user.user.profilePic} alt="profile" className="sidebar__avatar-img" />
            ) : (
              <span className="material-icons sidebar__avatar-icon">account_circle</span>
            )}
            <div className="sidebar__avatar-edit">
              <span className="material-icons">camera_alt</span>
            </div>
          </div>
          <input type="file" accept="image/*" ref={profilePicRef} style={{ display: 'none' }} onChange={handleProfilePicChange} />

          {/* Name & Description */}
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{user?.user?.name}</span>
            {user?.user?.description && (
              <span className="sidebar__user-desc">{user.user.description}</span>
            )}
          </div>
        </div>

        <div className="sidebar__headerRight">
          <span className="material-icons" onClick={() => setShowGroupModal(true)} title="Create Group">group_add</span>
          <span className="material-icons" onClick={() => setShowSettingsModal(true)} title="Settings">settings</span>
          <span className="material-icons" onClick={() => navigate('/status')} title="Status">motion_photos_on</span>
          <span className="material-icons" onClick={() => navigate('/reels')} title="Reels">theaters</span>
          <span className="material-icons" onClick={() => navigate('/newsfeed')} title="Newsfeed">dynamic_feed</span>
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
        {groups
          .filter(group => group.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(group => (
            <SidebarChat 
              key={group._id} 
              id={group._id} 
              name={group.name} 
              isGroup={true}
              isOnline={false} 
            />
        ))}

        {contacts
          .filter(contact => contact.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(contact => (
            <SidebarChat 
              key={contact._id} 
              id={contact._id} 
              name={contact.name} 
              isOnline={onlineUsers.includes(contact._id)} 
              profilePic={contact.profilePic}
              description={contact.description}
            />
        ))}

        {contacts.length === 0 && groups.length === 0 && (
          <div style={{padding: 20, textAlign: 'center', color: 'gray'}}>
            No other users registered yet.
          </div>
        )}
      </div>

      {/* Group Creation Modal */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Group</h3>
              <span className="material-icons" onClick={() => setShowGroupModal(false)} style={{cursor: 'pointer'}}>close</span>
            </div>
            <div className="modal-body">
              <input 
                type="text" 
                placeholder="Group Name" 
                value={groupName} 
                onChange={(e) => setGroupName(e.target.value)} 
                className="group-name-input"
              />
              <h4>Select Participants</h4>
              <div className="participants-list">
                {contacts.map(contact => (
                  <div key={contact._id} className="participant-item" onClick={() => toggleParticipant(contact._id)}>
                    <input type="checkbox" checked={selectedParticipants.includes(contact._id)} readOnly />
                    {contact.profilePic ? (
                      <img src={contact.profilePic} alt="dp" />
                    ) : (
                      <span className="material-icons">account_circle</span>
                    )}
                    <span>{contact.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleCreateGroup} className="create-group-btn">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Profile Settings</h3>
              <span className="material-icons" onClick={() => setShowSettingsModal(false)}>close</span>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>Display Name</label>
                <input type="text" name="name" value={settingsForm.name} onChange={handleSettingsChange} className="group-name-input" placeholder="Your name" />
              </div>
              <div className="modal-field">
                <label>Email</label>
                <input type="email" name="email" value={settingsForm.email} onChange={handleSettingsChange} className="group-name-input" placeholder="your@email.com" />
              </div>
              <div className="modal-field">
                <label>Phone</label>
                <input type="tel" name="phone" value={settingsForm.phone} onChange={handleSettingsChange} className="group-name-input" placeholder="+1 234 567 890" />
              </div>
              <div className="modal-field">
                <label>About / Description</label>
                <input type="text" name="description" value={settingsForm.description} onChange={handleSettingsChange} className="group-name-input" placeholder="Available" />
              </div>
              <div className="modal-field">
                <label>New Password (leave blank to keep current)</label>
                <input type="password" name="password" value={settingsForm.password} onChange={handleSettingsChange} className="group-name-input" placeholder="••••••••" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleUpdateSettings} className="create-group-btn" disabled={settingsUpdating}>
                {settingsUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
