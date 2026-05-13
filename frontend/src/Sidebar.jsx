import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import SidebarChat from './SidebarChat';
import axios from './axios';
import socket from './socket';

function Sidebar() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    axios.get('/api/rooms').then(response => {
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
      await axios.post('/api/rooms/new', {
        name: roomName
      });
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__headerRight">
          <span className="material-icons" onClick={createChat} style={{cursor: 'pointer'}} title="New Chat">add</span>
          <span className="material-icons">donut_large</span>
          <span className="material-icons">chat</span>
          <span className="material-icons">more_vert</span>
        </div>
      </div>
      <div className="sidebar__search">
        <div className="sidebar__searchContainer">
          <span className="material-icons">search</span>
          <input placeholder="Search or start new chat" type="text" />
        </div>
      </div>
      <div className="sidebar__chats">
        {rooms.map(room => (
          <SidebarChat key={room._id} id={room._id} name={room.name} />
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
