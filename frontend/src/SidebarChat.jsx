import React from 'react';
import './SidebarChat.css';

function SidebarChat() {
  return (
    <div className="sidebarChat">
      <span className="material-icons avatar">account_circle</span>
      <div className="sidebarChat__info">
        <h2>Global Chat</h2>
        <p>Latest message...</p>
      </div>
    </div>
  );
}

export default SidebarChat;
