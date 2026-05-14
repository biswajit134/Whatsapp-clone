import React, { useState, useEffect, useRef } from 'react';
import './Status.css';
import axiosStatus from './axiosStatus';

const BG_COLORS = ['#25D366', '#34B7F1', '#FF7A59', '#8A2BE2', '#E91E63', '#FF9800'];

function Status({ user }) {
  const [groupedStatuses, setGroupedStatuses] = useState([]);
  const [activeUserIdx, setActiveUserIdx] = useState(null);
  const [activeStatusIdx, setActiveStatusIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  // Upload States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('text');
  const [textContent, setTextContent] = useState('');
  const [textBg, setTextBg] = useState('#25D366');
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const fileInputRef = useRef(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  useEffect(() => { fetchStatuses(); }, []);

  const fetchStatuses = async () => {
    try {
      const res = await axiosStatus.get('/api/status');
      setGroupedStatuses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert("File too large. Max 50MB."); return; }
    setMediaFile(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setMediaPreview(reader.result);
      if (file.type.startsWith('video/')) setUploadType('video');
      else if (file.type.startsWith('audio/')) setUploadType('audio');
      else setUploadType('image');
    };
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordSeconds(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setMediaFile(audioBlob);
        setUploadType('audio');
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => setMediaPreview(reader.result);
        clearInterval(recordTimerRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Timer
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds(s => {
          if (s >= 59) { stopAudioRecording(); return 60; }
          return s + 1;
        });
      }, 1000);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') stopAudioRecording();
      }, 60000);

    } catch (err) {
      alert("Could not access microphone.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };

  const handleCreateStatus = async () => {
    if (uploadType === 'text' && !textContent.trim()) return;
    if (uploadType !== 'text' && !mediaPreview) return;
    try {
      await axiosStatus.post('/api/status', {
        userId: user.user._id,
        type: uploadType,
        content: uploadType === 'text' ? textContent : '',
        mediaUrl: uploadType !== 'text' ? mediaPreview : '',
        backgroundColor: uploadType === 'text' ? textBg : '#000000'
      });
      setShowUploadModal(false);
      resetUploadState();
      fetchStatuses();
    } catch (err) { console.error(err); }
  };

  const resetUploadState = () => {
    setTextContent(''); setMediaPreview(null); setMediaFile(null);
    setUploadType('text'); setRecordSeconds(0);
  };

  // Auto advance timer
  useEffect(() => {
    let timer;
    if (activeUserIdx !== null) {
      const currentStatus = groupedStatuses[activeUserIdx]?.statuses[activeStatusIdx];
      if (currentStatus?.type === 'text' || currentStatus?.type === 'image') {
        timer = setTimeout(handleNextStatus, 5000);
      }
    }
    return () => clearTimeout(timer);
  }, [activeUserIdx, activeStatusIdx]);

  const handleNextStatus = () => {
    if (activeUserIdx === null) return;
    const currentGroup = groupedStatuses[activeUserIdx];
    if (activeStatusIdx < currentGroup.statuses.length - 1) {
      setActiveStatusIdx(prev => prev + 1);
    } else if (activeUserIdx < groupedStatuses.length - 1) {
      setActiveUserIdx(prev => prev + 1);
      setActiveStatusIdx(0);
    } else {
      setActiveUserIdx(null);
    }
  };

  const handlePrevStatus = (e) => {
    e.stopPropagation();
    if (activeStatusIdx > 0) {
      setActiveStatusIdx(prev => prev - 1);
    }
  };

  const formatRelative = (dateStr) => {
    const d = new Date(dateStr);
    const diff = (Date.now() - d) / 60000;
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString();
  };

  const activeGroup = activeUserIdx !== null ? groupedStatuses[activeUserIdx] : null;
  const activeStatus = activeGroup?.statuses[activeStatusIdx];

  return (
    <div className="status-page">
      {/* ===== SIDEBAR ===== */}
      <div className="status-sidebar">
        <div className="status-header">
          <div className="status-header-left">
            <span className="material-icons">motion_photos_on</span>
            <h2>Status</h2>
          </div>
          <div className="add-status-btn" onClick={() => setShowUploadModal(true)} title="Add Status">
            <span className="material-icons">add</span>
          </div>
        </div>

        <div className="status-list">
          {loading ? (
            <div className="status-loader"><div className="status-spinner" /></div>
          ) : groupedStatuses.length === 0 ? (
            <div className="no-status-msg">No status updates yet.</div>
          ) : (
            <>
              <div className="status-section-label">Recent Updates</div>
              {groupedStatuses.map((group, idx) => (
                <div
                  key={group.user._id}
                  className="status-item"
                  onClick={() => { setActiveUserIdx(idx); setActiveStatusIdx(0); }}
                >
                  <div className="status-avatar-wrapper">
                    {group.user.profilePic ? (
                      <img src={group.user.profilePic} alt="profile" className="status-avatar" />
                    ) : (
                      <span className="material-icons default-avatar">account_circle</span>
                    )}
                    <svg className="status-ring" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="23" fill="none" stroke="#25D366" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="status-info">
                    <h4>{group.user._id === user.user._id ? 'My Status' : group.user.name}</h4>
                    <p>{formatRelative(group.statuses[group.statuses.length - 1].createdAt)}</p>
                  </div>
                  <div className="status-count-badge">{group.statuses.length}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ===== MAIN VIEWER ===== */}
      <div className="status-main">
        {activeUserIdx === null ? (
          <div className="status-placeholder">
            <div className="status-placeholder-icon">
              <span className="material-icons">motion_photos_on</span>
            </div>
            <h3>Status Updates</h3>
            <p>Click on a contact to view their status, or add your own.</p>
          </div>
        ) : (
          <div className="status-viewer">
            {/* Header with progress bars */}
            <div className="viewer-header">
              <div className="viewer-progress-bars">
                {activeGroup.statuses.map((s, i) => (
                  <div key={i} className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: i < activeStatusIdx ? '100%' :
                               i === activeStatusIdx ? '100%' : '0%',
                        transition: i === activeStatusIdx ? 'width 5s linear' : 'none'
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="viewer-user-row">
                <div className="viewer-user-info">
                  {activeGroup.user.profilePic ? (
                    <img src={activeGroup.user.profilePic} alt="profile" />
                  ) : (
                    <span className="material-icons">account_circle</span>
                  )}
                  <div>
                    <div className="viewer-user-name">{activeGroup.user.name}</div>
                    <div className="viewer-user-time">{formatRelative(activeStatus?.createdAt)}</div>
                  </div>
                </div>
                <span className="material-icons close-viewer" onClick={() => setActiveUserIdx(null)}>close</span>
              </div>
            </div>

            {/* Content */}
            <div className="viewer-content-area" onClick={handleNextStatus}>
              {/* Tap zones */}
              <div className="viewer-tap-prev" onClick={handlePrevStatus} />
              <div className="viewer-tap-next" onClick={handleNextStatus} />

              {activeStatus?.type === 'text' && (
                <div className="viewer-text" style={{ backgroundColor: activeStatus.backgroundColor }}>
                  <h2>{activeStatus.content}</h2>
                </div>
              )}
              {activeStatus?.type === 'image' && (
                <img src={activeStatus.mediaUrl} alt="status" className="viewer-media" />
              )}
              {activeStatus?.type === 'video' && (
                <video src={activeStatus.mediaUrl} className="viewer-media" autoPlay onEnded={handleNextStatus} controls />
              )}
              {activeStatus?.type === 'audio' && (
                <div className="viewer-audio">
                  <div className="audio-waveform-visual">
                    {[28, 40, 52, 60, 48, 36, 24].map((h, i) => (
                      <span key={i} style={{ height: `${h}px` }} />
                    ))}
                  </div>
                  <audio src={activeStatus.mediaUrl} controls autoPlay onEnded={handleNextStatus} />
                  <span className="viewer-audio-label">Voice Status</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== UPLOAD MODAL ===== */}
      {showUploadModal && (
        <div className="status-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="status-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Status</h3>
              <span className="material-icons" onClick={() => setShowUploadModal(false)}>close</span>
            </div>

            <div className="modal-body">
              {/* Type selector */}
              <div className="upload-type-selector">
                <button className={uploadType === 'text' ? 'active' : ''} onClick={() => setUploadType('text')}>
                  <span className="material-icons" style={{ fontSize: 16 }}>text_fields</span> Text
                </button>
                <button
                  className={uploadType === 'image' || uploadType === 'video' ? 'active' : ''}
                  onClick={() => fileInputRef.current.click()}
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>photo_library</span> Photo/Video
                </button>
                <button className={uploadType === 'audio' ? 'active' : ''} onClick={() => setUploadType('audio')}>
                  <span className="material-icons" style={{ fontSize: 16 }}>mic</span> Audio
                </button>
              </div>
              <input type="file" accept="image/*,video/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />

              {/* Text creator */}
              {uploadType === 'text' && (
                <div className="text-status-creator" style={{ backgroundColor: textBg }}>
                  <textarea
                    placeholder="Type your status..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    maxLength={250}
                    rows={4}
                  />
                  <div className="color-picker">
                    {BG_COLORS.map(color => (
                      <div
                        key={color}
                        className={`color-circle ${textBg === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setTextBg(color)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Media preview */}
              {(uploadType === 'image' || uploadType === 'video') && mediaPreview && (
                <div className="media-status-creator">
                  {uploadType === 'video' ? (
                    <video src={mediaPreview} controls />
                  ) : (
                    <img src={mediaPreview} alt="preview" />
                  )}
                  <p className="duration-warning">⏱ Max 1-minute for videos</p>
                </div>
              )}

              {/* Audio recorder */}
              {uploadType === 'audio' && (
                <div className="audio-status-creator">
                  {!mediaPreview ? (
                    <div className="record-container">
                      <button
                        className={`record-btn ${isRecording ? 'recording' : ''}`}
                        onClick={isRecording ? stopAudioRecording : startAudioRecording}
                      >
                        <span className="material-icons">{isRecording ? 'stop' : 'mic'}</span>
                      </button>
                      <p>
                        {isRecording
                          ? `Recording... ${recordSeconds}s / 60s`
                          : 'Tap to record voice status'}
                      </p>
                    </div>
                  ) : (
                    <div className="audio-preview">
                      <audio src={mediaPreview} controls />
                      <button onClick={() => { setMediaPreview(null); setMediaFile(null); setRecordSeconds(0); }} className="re-record-btn">
                        Re-record
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="post-status-btn" onClick={handleCreateStatus}>
                <span className="material-icons">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Status;
