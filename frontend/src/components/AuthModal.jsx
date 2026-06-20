import React, { useState } from 'react';
import { X, Lock, User, Sparkles } from 'lucide-react';
import api from '../services/api';

export default function AuthModal({ onClose, onSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!username.trim() || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isSignUp) {
        res = await api.auth.register(username, password);
      } else {
        res = await api.auth.login(username, password);
      }
      
      // Save details to localStorage and return
      if (res.token) {
        localStorage.setItem('token', res.token);
      }
      if (res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      onSuccess(res.user);
    } catch (err) {
      setErrorMessage(err.message || 'An authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 30px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px var(--glass-glow)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          className="hover:text-white"
        >
          <X size={20} />
        </button>

        <div style={{
          background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
          padding: '12px',
          borderRadius: '50%',
          color: '#fff',
          marginBottom: '20px',
          boxShadow: '0 0 15px var(--accent-cyan)'
        }}>
          <Sparkles size={28} />
        </div>

        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
          {isSignUp ? 'Create Vibe Account' : 'Welcome Back'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '24px' }}>
          {isSignUp ? 'Register to save favorites and track AI engagement metrics.' : 'Sign in to access personalized entertainment queues.'}
        </p>

        {errorMessage && (
          <div style={{
            background: 'rgba(255, 0, 127, 0.1)',
            border: '1px solid var(--accent-pink)',
            color: 'var(--accent-pink)',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '0.8rem',
            width: '100%',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Enter username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'var(--transition)'
                }}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                placeholder="Min 6 characters" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'var(--transition)'
                }}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-neon" 
            style={{ width: '100%', justifyContent: 'center', padding: '14px', borderRadius: '10px' }}
            disabled={loading}
          >
            {loading ? 'Processing Vibe...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          </span>
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setErrorMessage(''); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-cyan)',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
