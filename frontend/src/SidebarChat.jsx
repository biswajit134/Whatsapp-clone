import React from 'react';
import './SidebarChat.css';
import { Link } from 'react-router-dom';

function SidebarChat({ id, name }) {
  return (
    <Link to={`/rooms/${id}`} style={{ textDecoration: 'none', color: 'black' }}>
      <div className="sidebarChat">
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
