//components/RainOverlay.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function RainOverlay({ isTesting = false, refreshInterval = 30000 }) {
  const [rainData, setRainData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchRainData = async () => {
    try {
      const endpoint = isTesting ? '/api/test-rainfall' : '/api/rainfall';
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setRainData(data);
      setError(null);
      
    } catch (err) {
      console.error('Failed to fetch rain data:', err);
      setError('Failed to load rainfall data');
      setRainData({ rain_last_hour: 0 }); // Fallback data
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchRainData();
    
    // Set up auto-refresh
    const interval = setInterval(fetchRainData, refreshInterval);
    
    // Cleanup
    return () => clearInterval(interval);
  }, [isTesting, refreshInterval]);

  const getAlertLevel = () => {
    if (!rainData) return 'loading';
    if (rainData.rain_last_hour > 15) return 'extreme';
    if (rainData.rain_last_hour > 10) return 'severe';
    if (rainData.rain_last_hour > 5) return 'moderate';
    return 'normal';
  };

  const alertLevel = getAlertLevel();
  const alertMessages = {
    extreme: 'EVACUATE IMMEDIATELY',
    severe: 'SEVERE FLOOD RISK',
    moderate: 'FLOOD WARNING',
    normal: 'Conditions Normal',
    loading: 'Loading data...'
  };

  const alertColors = {
    extreme: '#ff0000',
    severe: '#ff5252',
    moderate: '#ff9800',
    normal: '#4caf50',
    loading: '#9e9e9e'
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      background: alertColors[alertLevel],
      color: 'white',
      padding: '10px 20px',
      borderRadius: '5px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      minWidth: '300px',
      justifyContent: 'center'
    }}>
      <div style={{ fontSize: '24px' }}>
        {alertLevel === 'extreme' && '🚨'}
        {alertLevel === 'severe' && '⚠️'}
        {alertLevel === 'moderate' && '⚠️'}
        {alertLevel === 'normal' && '✅'}
      </div>
      
      <div>
        <div style={{ fontWeight: 'bold' }}>{alertMessages[alertLevel]}</div>
        {rainData ? (
          <div style={{ fontSize: '0.9em' }}>
            Rainfall: <strong>{rainData.rain_last_hour} mm/h</strong>
            {rainData.forecast && (
              <span> | Action: {rainData.forecast.action}</span>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.9em' }}>Updating...</div>
        )}
      </div>
      
      {error && (
        <button 
          onClick={fetchRainData}
          style={{
            marginLeft: '10px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            borderRadius: '3px',
            padding: '3px 6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default RainOverlay;