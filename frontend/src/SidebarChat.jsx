import React from 'react';
import './SidebarChat.css';
import { Link, useParams } from 'react-router-dom';

function SidebarChat({ id, name, isOnline, profilePic, isGroup, description }) {
  const { otherUserId } = useParams();
  const isActive = otherUserId === id;

  return (
    <Link to={`/rooms/${id}`} state={{ isGroup, name, profilePic }} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className={`sidebarChat ${isActive ? 'sidebarChat--active' : ''}`}>

        {/* Avatar */}
        {isGroup ? (
          <div style={{
            width: 45, height: 45, borderRadius: '50%',
            backgroundColor: '#25D366', display: 'flex',
            justifyContent: 'center', alignItems: 'center',
            color: 'white', flexShrink: 0
          }}>
            <span className="material-icons" style={{ fontSize: 24 }}>groups</span>
          </div>
        ) : profilePic ? (
          <img src={profilePic} alt={name} style={{ width: 45, height: 45, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <span className="material-icons avatar">account_circle</span>
        )}

        {/* Info */}
        <div className="sidebarChat__info">
          <h2>{name}</h2>
          <div className="sidebarChat__meta">
            <span
              className="sidebarChat__status"
              style={{ color: isGroup ? 'var(--text-muted)' : (isOnline ? '#25D366' : 'var(--text-muted)') }}
            >
              {isGroup ? 'Group' : (isOnline ? 'Online' : 'Offline')}
            </span>
            {!isGroup && description && (
              <>
                <span style={{ color: 'var(--border-color)', fontSize: 11 }}>·</span>
                <span className="sidebarChat__desc">{description}</span>
              </>
            )}
          </div>
        </div>

      </div>
    </Link>
  );
}

export default SidebarChat;
