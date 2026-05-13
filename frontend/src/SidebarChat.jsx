import React from 'react';
import './SidebarChat.css';
import { Link, useParams } from 'react-router-dom';

function SidebarChat({ id, name }) {
  const { roomId } = useParams();
  const isActive = roomId === id;
  return (
    <Link to={`/rooms/${id}`} style={{ textDecoration: 'none', color: 'black' }}>
      <div className={`sidebarChat ${isActive ? 'sidebarChat--active' : ''}`}>
        <span className="material-icons avatar">account_circle</span>
        <div className="sidebarChat__info">
          <h2>{name}</h2>
          <p>Click to view messages...</p>
        </div>
      </div>
    </Link>
  );
}

export default SidebarChat;
