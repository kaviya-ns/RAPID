//src/components/Response.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Government color scheme
const GOV_STYLES = {
  primary: '#003366',
  secondary: '#417690',
  accent: '#E31937',
  lightBg: '#F0F4F7',
  text: '#212529',
  warning: '#FFC107',
  success: '#28a745',
  white: '#FFFFFF'
};

const Response = () => {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingAction, setEditingAction] = useState(null);
  const [userRole, setUserRole] = useState(null); // Add user role state
  const [newAction, setNewAction] = useState({
    title: "",
    team: "",
    location: "",
    timeframe: "",
    status: "active"
  });

  const [activeActions, setActiveActions] = useState([]);

  

  // Check if current user can perform admin/command actions
  const canPerformAdminActions = () => {
    return userRole === 'admin' || userRole === 'command';
  };
    // Fetch user role from API
  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    
      if (response.ok) {
        const userData = await response.json();
        setUserRole(userData.role || 'field'); // Default to 'field' if no role found
      } else {
        setUserRole('field'); // Default to most restrictive role
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setUserRole('field'); // Default to most restrictive role on error
    }
  };
        
  // Fetch actions from API
  const fetchActions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/response-actions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
     
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
     
      const data = await response.json();
      setActiveActions(data);
      setError('');
    } catch (err) {
      console.error('Error fetching actions:', err);
      setError('Failed to load response actions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load user role and actions on component mount
  useEffect(() => {
    fetchUserRole();
    fetchActions();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAction(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add new action via API
  const addNewAction = async () => {
    if (newAction.title.trim() === "") return;
   
    setLoading(true);
    try {
      const response = await fetch('/api/response-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAction)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setActiveActions(prev => [data, ...prev]);
     
      // Reset form
      setNewAction({
        title: "",
        team: "",
        location: "",
        timeframe: "",
        status: "active"
      });
     
      setShowAddForm(false);
      setError('');
    } catch (err) {
      console.error('Error adding action:', err);
      setError('Failed to add action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete action via API
  const deleteAction = async (actionId) => {
    if (!window.confirm('Are you sure you want to delete this action?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/response-actions/${actionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setActiveActions(prev => prev.filter(action => action.id !== actionId));
      setError('');
    } catch (err) {
      console.error('Error deleting action:', err);
      setError('Failed to delete action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update action status via API
  const updateActionStatus = async (actionId, newStatus) => {
    setLoading(true);
    try {
      const action = activeActions.find(a => a.id === actionId);
      const response = await fetch(`/api/response-actions/${actionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...action,
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedAction = await response.json();
      setActiveActions(prev =>
        prev.map(action =>
          action.id === actionId ? updatedAction : action
        )
      );
      setError('');
    } catch (err) {
      console.error('Error updating action status:', err);
      setError('Failed to update action status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Start editing an action
  const startEditAction = (action) => {
    setEditingAction(action.id);
    setNewAction({
      title: action.title,
      team: action.team,
      location: action.location,
      timeframe: action.timeframe,
      status: action.status
    });
  };

  // Update existing action via API
  const updateAction = async () => {
    if (newAction.title.trim() === "" || !editingAction) return;
   
    setLoading(true);
    try {
      const response = await fetch(`/api/response-actions/${editingAction}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAction)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedAction = await response.json();
      setActiveActions(prev =>
        prev.map(action =>
          action.id === editingAction ? updatedAction : action
        )
      );
     
      // Reset form
      setNewAction({
        title: "",
        team: "",
        location: "",
        timeframe: "",
        status: "active"
      });
     
      setEditingAction(null);
      setError('');
    } catch (err) {
      console.error('Error updating action:', err);
      setError('Failed to update action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingAction(null);
    setNewAction({
      title: "",
      team: "",
      location: "",
      timeframe: "",
      status: "active"
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoBar}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png"
            alt="Government Logo"
            style={styles.logo}
          />
          <div>
            <h1 style={styles.title}>Chennai Disaster Management Authority</h1>
            <p style={styles.subtitle}>Response Planning Portal</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.responseContainer}>
          <div style={styles.responseHeader}>
            <h2 style={styles.sectionTitle}>Active Response Actions</h2>
            <div style={styles.buttonGroup}>
              <button
                style={styles.govButton}
                onClick={() => navigate('/dashboard')}
              >
                ← Back to Dashboard
              </button>
              <button
                style={styles.govButton}
                onClick={() => fetchActions()}
                disabled={loading}
              >
                🔄 Refresh
              </button>
              {/* Only show Add New Action button for admin/command users */}
              {canPerformAdminActions() && (
                <button
                  style={styles.govButton}
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setEditingAction(null);
                    setNewAction({
                      title: "",
                      team: "",
                      location: "",
                      timeframe: "",
                      status: "active"
                    });
                  }}
                >
                  {showAddForm ? "Cancel" : "+ Add New Action"}
                </button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div style={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div style={styles.loadingMessage}>
              Loading...
            </div>
          )}

          {/* Add/Edit Form - Only show for admin/command users */}
          {(showAddForm || editingAction) && canPerformAdminActions() && (
            <div style={styles.addActionForm}>
              <h3 style={styles.sectionTitle}>
                {editingAction ? "Edit Action Plan" : "Add New Action Plan"}
              </h3>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Action Title:</label>
                <input
                  type="text"
                  name="title"
                  value={newAction.title}
                  onChange={handleInputChange}
                  placeholder="Enter action title"
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Team:</label>
                <input
                  type="text"
                  name="team"
                  value={newAction.team}
                  onChange={handleInputChange}
                  placeholder="Enter responsible team"
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Location:</label>
                <input
                  type="text"
                  name="location"
                  value={newAction.location}
                  onChange={handleInputChange}
                  placeholder="Enter location"
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Timeframe:</label>
                <input
                  type="text"
                  name="timeframe"
                  value={newAction.timeframe}
                  onChange={handleInputChange}
                  placeholder="Enter timeframe"
                  style={styles.formInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Status:</label>
                <select
                  name="status"
                  value={newAction.status}
                  onChange={handleInputChange}
                  style={styles.formInput}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div style={styles.buttonGroup}>
                <button
                  style={styles.govButton}
                  onClick={editingAction ? updateAction : addNewAction}
                  disabled={loading}
                >
                  {editingAction ? "Update Action" : "Add Action"}
                </button>
                {editingAction && (
                  <button
                    style={styles.cancelButton}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions List */}
          <div style={styles.actionsList}>
            {activeActions.map((action) => (
              <div
                key={action.id}
                style={{
                  ...styles.actionCard,
                  borderLeft: `4px solid ${
                    action.status === 'completed' ? GOV_STYLES.success :
                    action.status === 'pending' ? GOV_STYLES.warning : GOV_STYLES.primary
                  }`,
                  opacity: action.status === 'completed' ? 0.8 : 1
                }}
              >
                <div style={styles.actionHeader}>
                  <div style={styles.actionTitle}>
                    <strong>{action.title}</strong>
                  </div>
                  <div style={styles.actionButtons}>
                    <select
                      value={action.status}
                      onChange={(e) => updateActionStatus(action.id, e.target.value)}
                      style={styles.statusSelect}
                      disabled={loading}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                    {/* Only show Edit button for admin/command users */}
                    {canPerformAdminActions() && (
                      <button
                        style={styles.editButton}
                        onClick={() => startEditAction(action)}
                        disabled={loading}
                      >
                        ✏️ Edit
                      </button>
                    )}
                    {/* Only show Delete button for admin/command users */}
                    {canPerformAdminActions() && (
                      <button
                        style={styles.deleteButton}
                        onClick={() => deleteAction(action.id)}
                        disabled={loading}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
                <div style={styles.actionDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Team:</span>
                    <span>{action.team || 'Not assigned'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Location:</span>
                    <span>{action.location || 'Not specified'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Timeframe:</span>
                    <span>{action.timeframe || 'Not specified'}</span>
                  </div>
                  {action.created_at && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Created:</span>
                      <span>{new Date(action.created_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
           
            {activeActions.length === 0 && !loading && (
              <div style={styles.emptyState}>
                {canPerformAdminActions() 
                  ? 'No response actions found. Click "Add New Action" to get started.'
                  : 'No response actions found.'
                }
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© Chennai Disaster Management Authority | Emergency Hotline: 1078</p>
        <p style={styles.footerNote}>Last updated: {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
};

// Enhanced styles with new components
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
  main: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
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
  },
  responseContainer: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: '1000px',
    margin: '20px auto',
    padding: '20px',
    backgroundColor: GOV_STYLES.white,
    borderRadius: '5px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
  },
  responseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: `2px solid ${GOV_STYLES.primary}`,
    paddingBottom: '10px',
    gap: '10px',
    flexWrap: 'wrap'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  govButton: {
    backgroundColor: GOV_STYLES.primary,
    color: GOV_STYLES.white,
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
    fontSize: '14px'
  },
  cancelButton: {
    backgroundColor: GOV_STYLES.secondary,
    color: GOV_STYLES.white,
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
    fontSize: '14px'
  },
  editButton: {
    backgroundColor: GOV_STYLES.warning,
    color: GOV_STYLES.text,
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  deleteButton: {
    backgroundColor: GOV_STYLES.accent,
    color: GOV_STYLES.white,
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  statusSelect: {
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${GOV_STYLES.secondary}`,
    fontSize: '12px',
    fontWeight: 'bold'
  },
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  actionCard: {
    backgroundColor: GOV_STYLES.lightBg,
    padding: '15px',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
    gap: '10px'
  },
  actionTitle: {
    flex: 1,
    fontSize: '1.1em'
  },
  actionButtons: {
    display: 'flex',
    gap: '5px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  actionDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    color: GOV_STYLES.text
  },
  detailRow: {
    display: 'flex',
    gap: '10px'
  },
  detailLabel: {
    minWidth: '80px',
    fontWeight: '600'
  },
  addActionForm: {
    backgroundColor: GOV_STYLES.lightBg,
    padding: '20px',
    marginBottom: '20px',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: `2px solid ${GOV_STYLES.secondary}`
  },
  formGroup: {
    marginBottom: '15px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold'
  },
  formInput: {
    width: '100%',
    padding: '8px',
    border: `1px solid ${GOV_STYLES.secondary}`,
    borderRadius: '4px',
    boxSizing: 'border-box'
  },
  sectionTitle: {
    color: GOV_STYLES.primary,
    marginTop: '0',
    borderBottom: `2px solid ${GOV_STYLES.secondary}`,
    paddingBottom: '0.5rem'
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb'
  },
  loadingMessage: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #bee5eb',
    textAlign: 'center'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: GOV_STYLES.secondary,
    fontSize: '1.1em'
  }
};

export default Response;