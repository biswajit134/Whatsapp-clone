import React, { useState, useEffect } from 'react';
import './Status.css';

// Status.jsx is now the VIEWER only.
// The status contacts list lives in MediaSidebar (mode="status").
// Communication: MediaSidebar dispatches 'status_select' custom event.

function Status({ user }) {
  const [groupedStatuses, setGroupedStatuses] = useState([]);
  const [activeUserIdx, setActiveUserIdx]     = useState(null);
  const [activeStatusIdx, setActiveStatusIdx] = useState(0);

  // Receive status list from MediaSidebar via event
  useEffect(() => {
    const listHandler = (e) => setGroupedStatuses(e.detail.list);
    window.addEventListener('status_list_update', listHandler);
    return () => window.removeEventListener('status_list_update', listHandler);
  }, []);

  // Receive selected-contact index from MediaSidebar
  useEffect(() => {
    const selectHandler = (e) => {
      setActiveUserIdx(e.detail.idx);
      setActiveStatusIdx(0);
    };
    window.addEventListener('status_select', selectHandler);
    return () => window.removeEventListener('status_select', selectHandler);
  }, []);

  // Auto-advance for text/image
  useEffect(() => {
    let timer;
    if (activeUserIdx !== null) {
      const cur = groupedStatuses[activeUserIdx]?.statuses[activeStatusIdx];
      if (cur?.type === 'text' || cur?.type === 'image') {
        timer = setTimeout(handleNext, 5000);
      }
    }
    return () => clearTimeout(timer);
  }, [activeUserIdx, activeStatusIdx, groupedStatuses]);

  const handleNext = () => {
    if (activeUserIdx === null) return;
    const grp = groupedStatuses[activeUserIdx];
    if (activeStatusIdx < grp.statuses.length - 1) {
      setActiveStatusIdx(p => p + 1);
    } else if (activeUserIdx < groupedStatuses.length - 1) {
      setActiveUserIdx(p => p + 1);
      setActiveStatusIdx(0);
    } else {
      setActiveUserIdx(null);
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (activeStatusIdx > 0) setActiveStatusIdx(p => p - 1);
  };

  const relTime = (d) => {
    const diff = (Date.now() - new Date(d)) / 60000;
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return new Date(d).toLocaleDateString();
  };

  const activeGroup  = activeUserIdx !== null ? groupedStatuses[activeUserIdx] : null;
  const activeStatus = activeGroup?.statuses[activeStatusIdx];

  return (
    <div className="status-main" style={{ flex: 1 }}>
      {activeUserIdx === null ? (
        <div className="status-placeholder">
          <div className="status-placeholder-icon">
            <span className="material-icons">motion_photos_on</span>
          </div>
          <h3>Status Updates</h3>
          <p>Select a contact from the sidebar to view their status.</p>
        </div>
      ) : (
        <div className="status-viewer">
          {/* Progress bars */}
          <div className="viewer-header">
            <div className="viewer-progress-bars">
              {activeGroup.statuses.map((_, i) => (
                <div key={i} className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: i < activeStatusIdx ? '100%' : i === activeStatusIdx ? '100%' : '0%',
                      transition: i === activeStatusIdx ? 'width 5s linear' : 'none'
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="viewer-user-row">
              <div className="viewer-user-info">
                {activeGroup.user.profilePic
                  ? <img src={activeGroup.user.profilePic} alt="profile" />
                  : <span className="material-icons">account_circle</span>}
                <div>
                  <div className="viewer-user-name">{activeGroup.user.name}</div>
                  <div className="viewer-user-time">{relTime(activeStatus?.createdAt)}</div>
                </div>
              </div>
              <span className="material-icons close-viewer" onClick={() => setActiveUserIdx(null)}>close</span>
            </div>
          </div>

          {/* Content */}
          <div className="viewer-content-area" onClick={handleNext}>
            <div className="viewer-tap-prev" onClick={handlePrev} />
            <div className="viewer-tap-next" onClick={handleNext} />

            {activeStatus?.type === 'text' && (
              <div className="viewer-text" style={{ backgroundColor: activeStatus.backgroundColor }}>
                <h2>{activeStatus.content}</h2>
              </div>
            )}
            {activeStatus?.type === 'image' && (
              <img src={activeStatus.mediaUrl} alt="status" className="viewer-media" />
            )}
            {activeStatus?.type === 'video' && (
              <video src={activeStatus.mediaUrl} className="viewer-media" autoPlay onEnded={handleNext} controls />
            )}
            {activeStatus?.type === 'audio' && (
              <div className="viewer-audio">
                <div className="audio-waveform-visual">
                  {[28, 40, 52, 60, 48, 36, 24].map((h, i) => (
                    <span key={i} style={{ height: `${h}px` }} />
                  ))}
                </div>
                <audio src={activeStatus.mediaUrl} controls autoPlay onEnded={handleNext} />
                <span className="viewer-audio-label">Voice Status</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Status;
