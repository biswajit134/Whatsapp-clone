import React, { useState, useEffect, useRef } from 'react';
import './Status.css';
import axiosStatus from './axiosStatus';

function Status({ user }) {
  const [groupedStatuses, setGroupedStatuses] = useState([]);
  const [activeUserIdx, setActiveUserIdx] = useState(null);
  const [activeStatusIdx, setActiveStatusIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  // Upload States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('text'); // text, image, video, audio
  const [textContent, setTextContent] = useState('');
  const [textBg, setTextBg] = useState('#25D366');
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const fileInputRef = useRef(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetchStatuses();
  }, []);

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

    if (file.size > 50 * 1024 * 1024) {
      alert("File too large. Max 50MB.");
      return;
    }

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
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Enforce 1 minute duration limit
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') stopAudioRecording();
      }, 60000);
      
    } catch (err) {
      console.error("Audio recording failed:", err);
      alert("Could not access microphone.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleCreateStatus = async () => {
    if (uploadType === 'text' && !textContent.trim()) return;
    if (uploadType !== 'text' && !mediaPreview) return;

    try {
      const payload = {
        userId: user.user._id,
        type: uploadType,
        content: uploadType === 'text' ? textContent : '',
        mediaUrl: uploadType !== 'text' ? mediaPreview : '',
        backgroundColor: uploadType === 'text' ? textBg : '#000000'
      };

      await axiosStatus.post('/api/status', payload);
      setShowUploadModal(false);
      resetUploadState();
      fetchStatuses();
    } catch (err) {
      console.error(err);
    }
  };

  const resetUploadState = () => {
    setTextContent('');
    setMediaPreview(null);
    setMediaFile(null);
    setUploadType('text');
  };

  // Viewer functions
  useEffect(() => {
    let timer;
    if (activeUserIdx !== null) {
      // Auto advance status every 5 seconds (for non-video/audio)
      const currentStatus = groupedStatuses[activeUserIdx].statuses[activeStatusIdx];
      if (currentStatus.type === 'text' || currentStatus.type === 'image') {
        timer = setTimeout(() => {
          handleNextStatus();
        }, 5000);
      }
    }
    return () => clearTimeout(timer);
  }, [activeUserIdx, activeStatusIdx]);

  const handleNextStatus = () => {
    if (activeUserIdx === null) return;
    const currentUserGroup = groupedStatuses[activeUserIdx];
    
    if (activeStatusIdx < currentUserGroup.statuses.length - 1) {
      setActiveStatusIdx(prev => prev + 1);
    } else if (activeUserIdx < groupedStatuses.length - 1) {
      setActiveUserIdx(prev => prev + 1);
      setActiveStatusIdx(0);
    } else {
      setActiveUserIdx(null); // Close viewer
    }
  };

  return (
    <div className="status-page">
      <div className="status-sidebar">
        <div className="status-header">
          <h2>Status</h2>
          <span className="material-icons add-status-btn" onClick={() => setShowUploadModal(true)}>add_circle</span>
        </div>
        
        <div className="status-list">
          {loading ? (
            <div className="status-loader"><span className="loader"></span></div>
          ) : groupedStatuses.length === 0 ? (
            <div className="no-status-msg">No updates available.</div>
          ) : (
            groupedStatuses.map((group, idx) => (
              <div key={group.user._id} className="status-item" onClick={() => { setActiveUserIdx(idx); setActiveStatusIdx(0); }}>
                <div className="status-avatar-wrapper">
                  {group.user.profilePic ? (
                    <img src={group.user.profilePic} alt="profile" className="status-avatar" />
                  ) : (
                    <span className="material-icons default-avatar">account_circle</span>
                  )}
                  {/* Status ring indication could go here */}
                  <svg className="status-ring" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="#25D366" strokeWidth="4" />
                  </svg>
                </div>
                <div className="status-info">
                  <h4>{group.user._id === user.user._id ? 'My Status' : group.user.name}</h4>
                  <p>{new Date(group.statuses[group.statuses.length - 1].createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="status-main">
        {activeUserIdx === null ? (
          <div className="status-placeholder">
            <span className="material-icons">donut_large</span>
            <p>Click on a contact to view their status updates</p>
          </div>
        ) : (
          <div className="status-viewer">
            <div className="viewer-header">
              <span className="material-icons close-viewer" onClick={() => setActiveUserIdx(null)}>close</span>
              <div className="viewer-progress-bars">
                {groupedStatuses[activeUserIdx].statuses.map((s, i) => (
                  <div key={i} className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: i < activeStatusIdx ? '100%' : (i === activeStatusIdx ? '100%' : '0%'), transition: i === activeStatusIdx ? 'width 5s linear' : 'none' }}></div>
                  </div>
                ))}
              </div>
              <div className="viewer-user-info">
                {groupedStatuses[activeUserIdx].user.profilePic ? (
                  <img src={groupedStatuses[activeUserIdx].user.profilePic} alt="profile" />
                ) : (
                  <span className="material-icons">account_circle</span>
                )}
                <span>{groupedStatuses[activeUserIdx].user.name}</span>
              </div>
            </div>

            <div className="viewer-content-area" onClick={handleNextStatus}>
              {groupedStatuses[activeUserIdx].statuses[activeStatusIdx].type === 'text' && (
                <div className="viewer-text" style={{ backgroundColor: groupedStatuses[activeUserIdx].statuses[activeStatusIdx].backgroundColor }}>
                  <h2>{groupedStatuses[activeUserIdx].statuses[activeStatusIdx].content}</h2>
                </div>
              )}
              {groupedStatuses[activeUserIdx].statuses[activeStatusIdx].type === 'image' && (
                <img src={groupedStatuses[activeUserIdx].statuses[activeStatusIdx].mediaUrl} alt="status" className="viewer-media" />
              )}
              {groupedStatuses[activeUserIdx].statuses[activeStatusIdx].type === 'video' && (
                <video src={groupedStatuses[activeUserIdx].statuses[activeStatusIdx].mediaUrl} className="viewer-media" autoPlay onEnded={handleNextStatus} />
              )}
              {groupedStatuses[activeUserIdx].statuses[activeStatusIdx].type === 'audio' && (
                <div className="viewer-audio" style={{ backgroundColor: '#111b21' }}>
                  <span className="material-icons audio-icon">mic</span>
                  <audio src={groupedStatuses[activeUserIdx].statuses[activeStatusIdx].mediaUrl} controls autoPlay onEnded={handleNextStatus} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="status-modal-overlay">
          <div className="status-modal">
            <div className="modal-header">
              <h3>Create Status</h3>
              <span className="material-icons" onClick={() => setShowUploadModal(false)}>close</span>
            </div>
            
            <div className="modal-body">
              <div className="upload-type-selector">
                <button className={uploadType === 'text' ? 'active' : ''} onClick={() => setUploadType('text')}>Text</button>
                <button className={uploadType === 'image' || uploadType === 'video' ? 'active' : ''} onClick={() => fileInputRef.current.click()}>Photo/Video</button>
                <button className={uploadType === 'audio' ? 'active' : ''} onClick={() => setUploadType('audio')}>Audio</button>
              </div>

              <input type="file" accept="image/*,video/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />

              {uploadType === 'text' && (
                <div className="text-status-creator" style={{ backgroundColor: textBg }}>
                  <textarea 
                    placeholder="Type a status..." 
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    maxLength={250}
                  />
                  <div className="color-picker">
                    {['#25D366', '#34B7F1', '#FF7A59', '#8A2BE2', '#FFC0CB'].map(color => (
                      <div key={color} className="color-circle" style={{ backgroundColor: color }} onClick={() => setTextBg(color)}></div>
                    ))}
                  </div>
                </div>
              )}

              {(uploadType === 'image' || uploadType === 'video') && mediaPreview && (
                <div className="media-status-creator">
                  {uploadType === 'video' ? (
                     <video src={mediaPreview} controls />
                  ) : (
                     <img src={mediaPreview} alt="preview" />
                  )}
                  <p className="duration-warning">Max duration 1 minute limit applied.</p>
                </div>
              )}

              {uploadType === 'audio' && (
                <div className="audio-status-creator">
                  {!mediaPreview ? (
                    <div className="record-container">
                      <button className={`record-btn ${isRecording ? 'recording' : ''}`} onClick={isRecording ? stopAudioRecording : startAudioRecording}>
                        <span className="material-icons">{isRecording ? 'stop' : 'mic'}</span>
                      </button>
                      <p>{isRecording ? 'Recording... (Max 1 min)' : 'Tap to record voice status'}</p>
                    </div>
                  ) : (
                    <div className="audio-preview">
                      <audio src={mediaPreview} controls />
                      <button onClick={() => { setMediaPreview(null); setMediaFile(null); }} className="re-record-btn">Re-record</button>
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
