// src/components/Dashboard.js
import React from 'react';
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

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const role = user?.role || 'field'; // Default to field if no role

  // Common mock data
  const emergencyStats = [
    { label: "Affected Zones", value: "12", trend: "↑ 2 new (24h)" },
    { label: "Active Responders", value: "87", trend: "↓ 5 unavailable" },
    { label: "Evacuated Civilians", value: "4,321", trend: "↑ 1,204 today" },
    { label: "Shelters Active", value: "18/25", trend: "82% capacity" }
  ];

  const recentAlerts = [
    { id: 2, level: "warning", message: "Heavy rainfall expected", time: "09:30 AM" },
    { id: 3, level: "info", message: "Medical supplies delivered to Shelter 12", time: "08:15 AM" }
  ];

  // Function to handle logout
  const handleLogout = async () => {
    try {
      // Call the backend logout API
      const response = await fetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Clear user data from local storage
        localStorage.removeItem('user');
        console.log('Logged out successfully');
        // Redirect to the login page
        navigate('/');
      } else {
        console.error('Logout failed on server:', response.statusText);
        // Even if server logout fails, try to clear local state and navigate
        localStorage.removeItem('user');
        navigate('/');
      }
    } catch (error) {
      console.error('Network error during logout:', error);
      // In case of network error, still try to clear local state and navigate
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  // Role-based components
  const renderAdminDashboard = () => (
    <>
      <StatusOverview stats={emergencyStats} />
      <ActionPanel role={role} navigate={navigate} />
      <AlertsFeed alerts={recentAlerts} />
      <QuickLinks />
    </>
  );

  const renderCommandDashboard = () => (
    <>
      <StatusOverview stats={emergencyStats} />
      <ActionPanel role={role} navigate={navigate} />
      <AlertsFeed alerts={recentAlerts} />
    </>
  );

  const renderFieldDashboard = () => (
    <>
      <AlertsFeed alerts={recentAlerts} />
      <ActionPanel role={role} navigate={navigate} />
    </>
  );

  const getDashboardContent = () => {
    switch(role) {
      case 'admin':
        return renderAdminDashboard();
      case 'command':
        return renderCommandDashboard();
      case 'field':
        return renderFieldDashboard();
      default:
        return renderFieldDashboard();
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logoBar}>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png" 
            alt="Government Logo" 
            style={styles.logo}
          />
          <div>
            <h1 style={styles.title}>Chennai Disaster Management Authority</h1>
            <p style={styles.subtitle}>
              Flood Emergency Command Dashboard | {user?.username} ({role})
            </p>
          </div>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {getDashboardContent()}
      </main>

      <footer style={styles.footer}>
        <p>Chennai Disaster Management Authority | Emergency Hotline: 1078</p>
        <p style={styles.footerNote}>Last updated: {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
};

const StatusOverview = ({ stats }) => (
  <section style={styles.statusGrid}>
    {stats.map((stat, index) => (
      <div key={index} style={styles.statCard}>
        <h3 style={styles.statLabel}>{stat.label}</h3>
        <div style={styles.statValue}>{stat.value}</div>
        <div style={{
          ...styles.statTrend,
          color: stat.trend.includes('↑') ? GOV_STYLES.accent : 
                         stat.trend.includes('↓') ? GOV_STYLES.primary : GOV_STYLES.text
        }}>
          {stat.trend}
        </div>
      </div>
    ))}
  </section>
);

const ActionPanel = ({ role, navigate }) => {
  const showMap = ['admin', 'command'].includes(role);
  const showResources = ['admin', 'command', 'field'].includes(role);
  const showResponse = ['admin', 'command', 'field'].includes(role);
  const showAirSupport = ['admin', 'command'].includes(role);

  return (
    <section style={styles.actionPanel}>
      <h2 style={styles.sectionTitle}>Emergency Actions</h2>
      <div style={styles.buttonGrid}>
        {showMap && (
          <button 
            style={styles.primaryButton}
            onClick={() => navigate('/map')}
          >
            🌊 Live Flood Map
          </button>
        )}
        {showResources && (
          <button 
            style={styles.primaryButton}
            onClick={() => navigate('/resources')}
          >
            🏥 Resource Allocation
          </button>
        )}
        {showResponse && (
          <button 
            style={styles.primaryButton}
            onClick={() => navigate('/response')}
          >
            👨🏻‍✈️ Response Planning
          </button>
        )}
      </div>
    </section>
  );
};

const AlertsFeed = ({ alerts }) => (
  <section style={styles.alertsSection}>
    <h2 style={styles.sectionTitle}>Recent Alerts</h2>
    <div style={styles.alertsContainer}>
      {alerts.map(alert => (
        <div key={alert.id} style={{
          ...styles.alertCard,
          borderLeft: `4px solid ${
            alert.level === 'critical' ? GOV_STYLES.accent :
            alert.level === 'warning' ? GOV_STYLES.warning : GOV_STYLES.secondary
          }`
        }}>
          <div style={styles.alertHeader}>
            <span style={styles.alertTime}>{alert.time}</span>
            <span style={{
              ...styles.alertLevel,
              backgroundColor: 
                alert.level === 'critical' ? GOV_STYLES.accent :
                alert.level === 'warning' ? GOV_STYLES.warning : GOV_STYLES.secondary
            }}>
              {alert.level.toUpperCase()}
            </span>
          </div>
          <p style={styles.alertMessage}>{alert.message}</p>
        </div>
      ))}
    </div>
  </section>
);

const QuickLinks = () => ( 
  <section style={styles.quickLinks}>
    <h2 style={styles.sectionTitle}>Quick Access</h2>
    <div style={styles.linkGrid}>
      <a href="https://imd.gov.in/pages/alerts_main.php" target="_blank" rel="noopener noreferrer" style={styles.linkCard}>
        📊 View IMD Weather Alerts
      </a>   
      <a href="https://ndma.gov.in/en/disaster-management-plan.html" target="_blank" rel="noopener noreferrer" style={styles.linkCard}>
        📄 National Disaster Management Plan
      </a>
      <a href="https://esahaya.tn.gov.in/" target="_blank" rel="noopener noreferrer" style={styles.linkCard}>
        🧑‍🚒 eSahaya (Field Coordination Portal)
      </a>
      
      <a href="https://www.tnsdma.tn.gov.in/" target="_blank" rel="noopener noreferrer" style={styles.linkCard}>
        🌐 TN Disaster Management Authority
      </a>

    </div>
  </section>
);


// Styles 
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: GOV_STYLES.lightBg,
    fontFamily: "'Segoe UI', 'Roboto', sans-serif"
  },
  header: {
    backgroundColor: GOV_STYLES.primary,
    color: GOV_STYLES.white,
    padding: '0 2rem'
  },
  logoBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between', // Added to push logout button to the right
    padding: '1rem 0',
    gap: '1rem'
  },
  logo: {
    height: '50px',
    filter: 'brightness(0) invert(1)'
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '500'
  },
  subtitle: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.9rem',
    opacity: 0.9
  },
  logoutButton: { // New style for the logout button
    backgroundColor: GOV_STYLES.accent,
    color: GOV_STYLES.white,
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#C00F27' // Darker red on hover
    }
  },
  alertBanner: {
    backgroundColor: GOV_STYLES.accent,
    padding: '0.5rem 2rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  main: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: GOV_STYLES.white,
    padding: '1.5rem',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  statLabel: {
    margin: '0 0 0.5rem 0',
    fontSize: '1rem',
    color: GOV_STYLES.secondary,
    fontWeight: '600'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: GOV_STYLES.primary,
    margin: '0.5rem 0'
  },
  statTrend: {
    fontSize: '0.85rem'
  },
  actionPanel: {
    backgroundColor: GOV_STYLES.white,
    padding: '1.5rem',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  sectionTitle: {
    color: GOV_STYLES.primary,
    marginTop: '0',
    borderBottom: `2px solid ${GOV_STYLES.secondary}`,
    paddingBottom: '0.5rem'
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  primaryButton: {
    backgroundColor: GOV_STYLES.primary,
    color: GOV_STYLES.white,
    border: 'none',
    padding: '1rem',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#002244'
    }
  },
  secondaryButton: {
    backgroundColor: GOV_STYLES.white,
    color: GOV_STYLES.primary,
    border: `2px solid ${GOV_STYLES.primary}`,
    padding: '1rem',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  alertsSection: {
    marginBottom: '2rem'
  },
  alertsContainer: {
    backgroundColor: GOV_STYLES.white,
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  alertCard: {
    padding: '1rem',
    borderBottom: `1px solid ${GOV_STYLES.lightBg}`
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  alertTime: {
    fontSize: '0.85rem',
    color: GOV_STYLES.text,
    opacity: 0.7
  },
  alertLevel: {
    color: GOV_STYLES.white,
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 'bold'
  },
  alertMessage: {
    margin: '0',
    fontWeight: '500'
  },
  quickLinks: {
    marginBottom: '2rem'
  },
  linkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  linkCard: {
    backgroundColor: GOV_STYLES.white,
    color: GOV_STYLES.primary,
    padding: '1.5rem',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    fontWeight: '600',
    display: 'block',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateY(-2px)'
    }
  },
  footer: {
    backgroundColor: GOV_STYLES.primary,
    color: GOV_STYLES.white,
    padding: '1rem 2rem',
    textAlign: 'center',
    fontSize: '0.9rem'
  },
  footerNote: {
    opacity: 0.8,
    fontSize: '0.8rem',
    margin: '0.25rem 0 0 0'
  }
};

export default Dashboard;
