// src/components/AlertBar.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const AlertSystem = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const socket = io('http://localhost:5001/alerts');
    
    socket.on('alert', (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 5)]);
      
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('Flood Alert', { 
          body: alert.message 
        });
      }
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="alert-container">
      {alerts.map((alert, i) => (
        <div key={i} className={`alert ${alert.severity}`}>
          <strong>{alert.message}</strong>
          <small>{new Date(alert.timestamp).toLocaleString()}</small>
          <p>{alert.recommendation}</p>
        </div>
      ))}
    </div>
  );
};