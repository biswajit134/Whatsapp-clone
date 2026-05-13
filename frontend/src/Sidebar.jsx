import React from 'react';
import './Sidebar.css';
import SidebarChat from './SidebarChat';

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__headerRight">
          {/* Mock icons for WhatsApp UI */}
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
        <SidebarChat />
      </div>
    </div>
  );
}

export default Sidebar;
