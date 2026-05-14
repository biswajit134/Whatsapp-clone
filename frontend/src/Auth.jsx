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

  const handleSubmit = async (e, submittingLogin) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (submittingLogin) {
        const response = await axios.post('/api/auth/login', {
          email: formData.email,
          password: formData.password
        });
        localStorage.setItem('whatsapp_user', JSON.stringify(response.data));
        setUser(response.data);
      } else {
        const response = await axios.post('/api/auth/register', formData);
        localStorage.setItem('whatsapp_user', JSON.stringify(response.data));
        setUser(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
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
