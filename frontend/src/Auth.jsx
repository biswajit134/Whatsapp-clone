import React, { useState } from 'react';
import './Auth.css';
import axios from './axios';

function Auth({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    profilePic: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProfilePicSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large! Maximum 5MB allowed.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setFormData({ ...formData, profilePic: reader.result });
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(endpoint, formData);
      
      const userData = response.data;
      localStorage.setItem('whatsapp_user', JSON.stringify(userData));
      setUser(userData);
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {/* Left Side: Hero Image */}
        <div className="auth-hero">
          <div className="auth-hero-overlay">
            <div className="auth-hero-content">
              <span className="material-icons hero-icon">chat_bubble_outline</span>
              <h2>Welcome to Connect</h2>
              <p>Experience fast, simple, and secure messaging across all your devices.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="auth-form-container">
          <div className="auth-header">
            <h1>{isLogin ? 'Sign in to your account' : 'Create an account'}</h1>
            <p className="auth-subtitle">
              {isLogin ? 'Welcome back! Please enter your details.' : 'Join us to start messaging!'}
            </p>
          </div>
          
          {error && (
            <div className="auth-error-box">
              <span className="material-icons">error_outline</span>
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon">person_outline</span>
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="e.g. Jane Doe" 
                    value={formData.name}
                    onChange={handleChange}
                    required 
                  />
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon">mail_outline</span>
                <input 
                  type="email" 
                  name="email" 
                  placeholder="e.g. jane@example.com" 
                  value={formData.email}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>
            
            {!isLogin && (
              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon">phone_iphone</span>
                  <input 
                    type="tel" 
                    name="phone" 
                    placeholder="e.g. +1 234 567 890" 
                    value={formData.phone}
                    onChange={handleChange}
                    required 
                  />
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon">lock_outline</span>
                <input 
                  type="password" 
                  name="password" 
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>

            {!isLogin && (
              <div className="form-group dp-upload-group">
                <label>Profile Picture</label>
                <div className="dp-upload-wrapper">
                  <input 
                    type="file" 
                    id="profilePic"
                    accept="image/*"
                    onChange={handleProfilePicSelect}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="profilePic" className="dp-upload-btn">
                    <span className="material-icons">cloud_upload</span>
                    <span>Choose file...</span>
                  </label>
                  {formData.profilePic ? (
                    <img src={formData.profilePic} alt="Preview" className="dp-preview" />
                  ) : (
                    <span className="dp-placeholder">No file chosen</span>
                  )}
                </div>
              </div>
            )}
            
            <button type="submit" className={`auth-submit-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
              {isLoading ? <span className="loader"></span> : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button className="toggle-btn" onClick={() => setIsLogin(!isLogin)} type="button">
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
