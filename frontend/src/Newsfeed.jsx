import React, { useState, useEffect, useRef } from 'react';
import './Newsfeed.css';
import axiosNewsfeed from './axiosNewsfeed';

function Newsfeed({ user }) {
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  const fetchPosts = async () => {
    try {
      const response = await axiosNewsfeed.get('/api/newsfeed');
      setPosts(response.data);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large! Maximum 10MB allowed.");
      return;
    }

    setMediaFile(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim() && !mediaPreview) return;

    const postData = {
      userId: user.user._id,
      content: newPostContent,
      mediaUrl: mediaPreview || '',
      mediaType: mediaFile ? (mediaFile.type.startsWith('video/') ? 'video' : 'image') : 'none'
    };

    try {
      const res = await axiosNewsfeed.post('/api/newsfeed', postData);
      setPosts([res.data, ...posts]);
      setNewPostContent('');
      clearMedia();
    } catch (err) {
      console.error("Error creating post:", err);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await axiosNewsfeed.post(`/api/newsfeed/${postId}/like`, { userId: user.user._id });
      setPosts(posts.map(p => p._id === postId ? { ...p, likes: res.data.likes } : p));
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const handleComment = async (postId, text) => {
    if (!text.trim()) return;
    try {
      const res = await axiosNewsfeed.post(`/api/newsfeed/${postId}/comment`, { 
        userId: user.user._id, 
        text 
      });
      setPosts(posts.map(p => p._id === postId ? res.data : p));
    } catch (err) {
      console.error("Error commenting on post:", err);
    }
  };

  return (
    <div className="newsfeed-container">
      <div className="newsfeed-header">
        <h2>Newsfeed</h2>
      </div>

      <div className="newsfeed-content">
        {/* Create Post Section */}
        <div className="create-post-card">
          <div className="create-post-top">
            {user.user.profilePic ? (
              <img src={user.user.profilePic} alt="profile" className="create-post-avatar" />
            ) : (
              <span className="material-icons default-avatar">account_circle</span>
            )}
            <input 
              type="text" 
              placeholder={`What's on your mind, ${user.user.name.split(' ')[0]}?`}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="create-post-input"
            />
          </div>

          {mediaPreview && (
            <div className="create-post-preview-container">
              {mediaFile?.type.startsWith('video/') ? (
                <video src={mediaPreview} controls className="create-post-preview" />
              ) : (
                <img src={mediaPreview} alt="Preview" className="create-post-preview" />
              )}
              <span className="material-icons remove-preview" onClick={clearMedia}>close</span>
            </div>
          )}

          <div className="create-post-bottom">
            <div className="create-post-actions">
              <div className="action-btn" onClick={() => fileInputRef.current.click()}>
                <span className="material-icons" style={{ color: '#4CAF50' }}>photo_library</span>
                <span>Photo/Video</span>
              </div>
              <input 
                type="file" 
                accept="image/*,video/*" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileSelect} 
              />
            </div>
            <button 
              className="post-btn" 
              disabled={!newPostContent.trim() && !mediaPreview}
              onClick={handleCreatePost}
            >
              Post
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="posts-feed">
          {loading ? (
            <div className="newsfeed-loader"><span className="loader"></span></div>
          ) : posts.length === 0 ? (
            <div className="no-posts">
              <span className="material-icons">rss_feed</span>
              <p>No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard 
                key={post._id} 
                post={post} 
                currentUser={user.user}
                onLike={() => handleLike(post._id)}
                onComment={(text) => handleComment(post._id, text)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, currentUser, onLike, onComment }) {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const isLiked = post.likes.includes(currentUser._id);

  const submitComment = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      onComment(commentText);
      setCommentText('');
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-author-info">
          {post.userId?.profilePic ? (
            <img src={post.userId.profilePic} alt="author" className="post-avatar" />
          ) : (
            <span className="material-icons default-avatar">account_circle</span>
          )}
          <div>
            <h4 className="post-author-name">{post.userId?.name || 'Unknown User'}</h4>
            <span className="post-timestamp">{new Date(post.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <span className="material-icons more-options">more_horiz</span>
      </div>

      <div className="post-body">
        {post.content && <p className="post-text">{post.content}</p>}
        {post.mediaUrl && (
          <div className="post-media-container">
            {post.mediaType === 'video' ? (
              <video src={post.mediaUrl} controls className="post-media" />
            ) : (
              <img src={post.mediaUrl} alt="post media" className="post-media" />
            )}
          </div>
        )}
      </div>

      <div className="post-stats">
        <div className="stats-left">
          <span className="material-icons" style={{ color: '#25D366', fontSize: '18px' }}>thumb_up</span>
          <span className="stats-text">{post.likes.length}</span>
        </div>
        <div className="stats-right" onClick={() => setShowComments(!showComments)} style={{cursor: 'pointer'}}>
          <span className="stats-text">{post.comments.length} Comments</span>
        </div>
      </div>

      <div className="post-actions">
        <div className={`action-btn ${isLiked ? 'liked' : ''}`} onClick={onLike}>
          <span className="material-icons">{isLiked ? 'thumb_up' : 'thumb_up_off_alt'}</span>
          <span>Like</span>
        </div>
        <div className="action-btn" onClick={() => setShowComments(!showComments)}>
          <span className="material-icons">chat_bubble_outline</span>
          <span>Comment</span>
        </div>
        <div className="action-btn">
          <span className="material-icons">share</span>
          <span>Share</span>
        </div>
      </div>

      {showComments && (
        <div className="post-comments-section">
          <div className="comments-list">
            {post.comments.map((comment, idx) => (
              <div key={idx} className="comment-item">
                {comment.userId?.profilePic ? (
                  <img src={comment.userId.profilePic} alt="commenter" className="comment-avatar" />
                ) : (
                  <span className="material-icons default-avatar comment-avatar">account_circle</span>
                )}
                <div className="comment-bubble">
                  <span className="comment-author">{comment.userId?.name || 'Unknown'}</span>
                  <span className="comment-text">{comment.text}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="comment-input-area">
            {currentUser.profilePic ? (
              <img src={currentUser.profilePic} alt="me" className="comment-avatar" />
            ) : (
              <span className="material-icons default-avatar comment-avatar">account_circle</span>
            )}
            <input 
              type="text" 
              placeholder="Write a comment..." 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment(e)}
              className="comment-input"
            />
            <span className="material-icons send-comment" onClick={submitComment}>send</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Newsfeed;
