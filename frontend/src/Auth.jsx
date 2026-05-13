import React, { useState } from 'react';
import './Auth.css';
import axios from './axios';

function Auth({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await axios.post(endpoint, formData);
      
      const userData = response.data;
      localStorage.setItem('whatsapp_user', JSON.stringify(userData));
      setUser(userData);
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    }
  };

  return (
    <div className="auth">
      <div className="auth__container">
        <div className="auth__text">
          <h1>{isLogin ? 'Sign in to WhatsApp' : 'Create an Account'}</h1>
        </div>
        
        {error && <p className="auth__error">{error}</p>}
        
        <form onSubmit={handleSubmit} className="auth__form">
          {!isLogin && (
            <input 
              type="text" 
              name="name" 
              placeholder="Full Name" 
              value={formData.name}
              onChange={handleChange}
              required 
            />
          )}
          
          <input 
            type="email" 
            name="email" 
            placeholder="Email Address" 
            value={formData.email}
            onChange={handleChange}
            required 
          />
          
          {!isLogin && (
            <input 
              type="tel" 
              name="phone" 
              placeholder="Phone Number" 
              value={formData.phone}
              onChange={handleChange}
              required 
            />
          )}
          
          <input 
            type="password" 
            name="password" 
            placeholder="Password" 
            value={formData.password}
            onChange={handleChange}
            required 
          />
          
          <button type="submit">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="auth__toggle" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </p>
      </div>
    </div>
  );
}

export default Auth;
