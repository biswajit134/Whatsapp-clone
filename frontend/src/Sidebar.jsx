import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import SidebarChat from './SidebarChat';
import axios from './axios';
import socket from './socket';

function Sidebar({ user, setUser }) {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    axios.get('/rooms').then(response => {
      setRooms(response.data);
    });

    const handleNewRoom = (newRoom) => {
      setRooms((prevRooms) => [...prevRooms, newRoom]);
    };

    socket.on('inserted_room', handleNewRoom);

    return () => {
      socket.off('inserted_room', handleNewRoom);
    };
  }, []);

  const createChat = async () => {
    const roomName = prompt("Please enter name for chat");
    if (roomName) {
      await axios.post('/rooms/new', {
        name: roomName
      });
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__headerLeft" style={{display: 'flex', alignItems: 'center'}}>
          <span className="material-icons avatar" style={{marginRight: '10px'}}>account_circle</span>
          <span style={{fontWeight: 600, color: '#111b21', fontSize: '16px'}}>{user?.user?.name}</span>
        </div>
        <div className="sidebar__headerRight">
          <span className="material-icons" onClick={createChat} style={{cursor: 'pointer'}} title="New Chat">add</span>
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
        {rooms
          .filter(room => room.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map(room => (
            <SidebarChat key={room._id} id={room._id} name={room.name} />
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
