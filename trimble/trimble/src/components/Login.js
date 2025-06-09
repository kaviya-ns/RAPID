// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GOV_STYLES = {
  primary: '#003366',
  secondary: '#417690',
  accent: '#E31937',
  lightBg: '#F0F4F7',
  text: '#212529',
  warning: '#FFC107',
  white: '#FFFFFF'
};

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Updated URL to point to your Flask backend
      const response = await fetch('http://localhost:5001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: This ensures cookies/session are included
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store user data in localStorage for frontend use
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={loginStyles.fullPageContainer}>
      <div style={loginStyles.loginCard}>
        <div style={loginStyles.header}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png"
            alt="Government Logo"
            style={loginStyles.logo}
          />
          <h2 style={loginStyles.title}>Flood Monitoring System</h2>
          <p style={loginStyles.subtitle}>Official Access Portal</p>
        </div>

        <form onSubmit={handleLogin} style={loginStyles.form}>
          {error && <div style={loginStyles.error}>{error}</div>}
          <input
            style={loginStyles.input}
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <input
            style={loginStyles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="submit"
            style={{...loginStyles.button, opacity: loading ? 0.7 : 1}}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>

      <footer style={loginStyles.footer}>
        <p>© {new Date().getFullYear()} National Disaster Management Authority</p>
        <p style={loginStyles.footerNote}>For authorized personnel only.</p>
      </footer>
    </div>
  );
}

// Dedicated styles for the Login component
const loginStyles = {
  fullPageContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: GOV_STYLES.lightBg,
    fontFamily: "'Segoe UI', 'Roboto', sans-serif",
    padding: '20px'
  },
  loginCard: {
    maxWidth: '450px',
    width: '100%',
    margin: 'auto',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    backgroundColor: GOV_STYLES.white,
    textAlign: 'center',
    borderTop: `5px solid ${GOV_STYLES.primary}`,
  },
  header: {
    marginBottom: '25px'
  },
  logo: {
    height: '60px',
    marginBottom: '15px'
  },
  title: {
    margin: '0',
    fontSize: '2rem',
    color: GOV_STYLES.primary,
    fontWeight: '600'
  },
  subtitle: {
    margin: '5px 0 0',
    fontSize: '0.95rem',
    color: GOV_STYLES.secondary,
    opacity: 0.9
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  input: {
    padding: '12px 15px',
    borderRadius: '5px',
    border: `1px solid ${GOV_STYLES.secondary}`,
    fontSize: '1rem',
    color: GOV_STYLES.text,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  button: {
    padding: '14px',
    backgroundColor: GOV_STYLES.primary,
    color: GOV_STYLES.white,
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: '700',
    transition: 'background-color 0.3s ease, transform 0.1s ease',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
  },
  error: {
    color: GOV_STYLES.accent,
    backgroundColor: 'rgba(227, 25, 55, 0.1)',
    padding: '10px 15px',
    borderRadius: '4px',
    textAlign: 'center',
    marginBottom: '15px',
    fontWeight: 'bold',
    border: `1px solid ${GOV_STYLES.accent}`
  },
  footer: {
    marginTop: '40px',
    color: GOV_STYLES.text,
    fontSize: '0.85rem',
    opacity: 0.8,
    textAlign: 'center'
  },
  footerNote: {
    margin: '5px 0 0',
    fontSize: '0.75rem',
    fontStyle: 'italic'
  }
};

export default Login;