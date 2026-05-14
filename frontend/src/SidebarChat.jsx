import React from 'react';
import './SidebarChat.css';
import { Link, useParams } from 'react-router-dom';

function SidebarChat({ id, name, isOnline, profilePic, isGroup, description }) {
  const { otherUserId } = useParams();
  const isActive = otherUserId === id;
  return (
    <Link to={`/rooms/${id}`} state={{ isGroup, name, profilePic }} style={{ textDecoration: 'none', color: 'black' }}>
      <div className={`sidebarChat ${isActive ? 'sidebarChat--active' : ''}`}>
        {isGroup ? (
          <div style={{ width: 45, height: 45, borderRadius: '50%', backgroundColor: '#25D366', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
            <span className="material-icons">groups</span>
          </div>
        ) : profilePic ? (
          <img src={profilePic} alt="" style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <span className="material-icons avatar">account_circle</span>
        )}
        <div className="sidebarChat__info">
          <h2>{name}</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{color: isGroup ? 'gray' : (isOnline ? '#25D366' : 'gray'), fontSize: '13px'}}>{isGroup ? 'Group Chat' : (isOnline ? 'Online' : 'Offline')}</p>
            {!isGroup && description && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default SidebarChat;
