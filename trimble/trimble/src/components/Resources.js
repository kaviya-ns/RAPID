//src/componenets/resources.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Resources() {
    const [activeTab, setActiveTab] = useState('supplies');
    const [user, setUser] = useState(null);
    const [facilities, setFacilities] = useState({});
    const [selectedFacility, setSelectedFacility] = useState(null);
    const [facilityResources, setFacilityResources] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingResource, setEditingResource] = useState(null);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // Form state for adding/editing resources
    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetch('/api/user/profile')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.user) setUser(data.user);
            });
        
        fetchFacilities();
    }, []);

    // Add this useEffect to handle shelters when activeTab changes
    useEffect(() => {
        if (activeTab === 'shelters') {
            fetchShelters();
        } else {
            // Reset selection when switching away from shelters
            setSelectedFacility(null);
            setFacilityResources([]);
        }
    }, [activeTab]);

    const fetchFacilities = async () => {
        try {
            const response = await fetch('/api/resources/facilities');
            const data = await response.json();
            if (data.success) {
                setFacilities(data.facilities);
            }
        } catch (error) {
            console.error('Error fetching facilities:', error);
        }
    };

    const fetchFacilityResources = async (facilityId, resourceType) => {
        setLoading(true);
        try {
            let endpoint = '';
            switch (resourceType) {
                case 'supplies':
                    endpoint = `/api/resources/supplies/${facilityId}`;
                    break;
                case 'vehicles':
                    endpoint = `/api/resources/vehicles/${facilityId}`;
                    break;
                case 'personnel':
                    endpoint = `/api/resources/personnel/${facilityId}`;
                    break;
                default:
                    return;
            }

            const response = await fetch(endpoint);
            const data = await response.json();
            if (data.success) {
                setFacilityResources(data[resourceType] || []);
            }
        } catch (error) {
            console.error('Error fetching facility resources:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchShelters = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/resources/shelters');
            const data = await response.json();
            if (data.success) {
                setFacilityResources(data.shelters || []);
            }
        } catch (error) {
            console.error('Error fetching shelters:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddResource = async () => {
        try {
            let endpoint = '';
            let payload = { ...formData };

            if (selectedFacility) {
                payload.facility_id = selectedFacility.id;
            }

            switch (activeTab) {
                case 'supplies':
                    endpoint = '/api/resources/supplies';
                    break;
                case 'vehicles':
                    endpoint = '/api/resources/vehicles';
                    break;
                case 'personnel':
                    endpoint = '/api/resources/personnel';
                    break;
                case 'shelters':
                    endpoint = '/api/resources/shelters';
                    payload.location = payload.location || 'POINT(0 0)'; // Default or get from form
                    break;
                default:
                    return;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.success) {
                setShowAddModal(false);
                setFormData({});
                if (activeTab === 'shelters') {
                    fetchShelters();
                } else if (selectedFacility) {
                    fetchFacilityResources(selectedFacility.id, activeTab);
                }
            } else {
                alert('Error adding resource: ' + data.error);
            }
        } catch (error) {
            console.error('Error adding resource:', error);
            alert('Error adding resource');
        }
    };

    const handleUpdateResource = async () => {
        try {
            let endpoint = '';
            switch (activeTab) {
                case 'supplies':
                    endpoint = `/api/resources/supplies/${editingResource.id}`;
                    break;
                case 'vehicles':
                    endpoint = `/api/resources/vehicles/${editingResource.id}`;
                    break;
                case 'personnel':
                    endpoint = `/api/resources/personnel/${editingResource.id}`;
                    break;
                case 'shelters':
                    endpoint = `/api/resources/shelters/${editingResource.id}`;
                    break;
                default:
                    return;
            }

            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                setShowEditModal(false);
                setFormData({});
                setEditingResource(null);
                if (activeTab === 'shelters') {
                    fetchShelters();
                } else if (selectedFacility) {
                    fetchFacilityResources(selectedFacility.id, activeTab);
                }
            } else {
                alert('Error updating resource: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating resource:', error);
            alert('Error updating resource');
        }
    };

    const handleDeleteResource = async (resourceId) => {
        if (!window.confirm('Are you sure you want to delete this resource?')) return;

        try {
            let endpoint = '';
            switch (activeTab) {
                case 'supplies':
                    endpoint = `/api/resources/supplies/${resourceId}`;
                    break;
                case 'vehicles':
                    endpoint = `/api/resources/vehicles/${resourceId}`;
                    break;
                case 'personnel':
                    endpoint = `/api/resources/personnel/${resourceId}`;
                    break;
                case 'shelters':
                    endpoint = `/api/resources/shelters/${resourceId}`;
                    break;
                default:
                    return;
            }

            const response = await fetch(endpoint, { method: 'DELETE' });
            const data = await response.json();
            
            if (data.success) {
                if (activeTab === 'shelters') {
                    fetchShelters();
                } else if (selectedFacility) {
                    fetchFacilityResources(selectedFacility.id, activeTab);
                }
            } else {
                alert('Error deleting resource: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting resource:', error);
            alert('Error deleting resource');
        }
    };

    const openEditModal = (resource) => {
        setEditingResource(resource);
        setFormData({ ...resource });
        setShowEditModal(true);
    };

    const getFacilitiesForTab = () => {
        switch (activeTab) {
            case 'supplies':
                return [...(facilities.hospitals || []), ...(facilities.supply_centers || [])];
            case 'vehicles':
                return facilities.command_centers || [];
            case 'personnel':
                return [...(facilities.hospitals || []), ...(facilities.ngo_centers || []), ...(facilities.command_centers || [])];
            case 'shelters':
                return facilities.shelters || [];
            default:
                return [];
        }
    };

    const renderFacilityList = () => {
        const facilitiesForTab = getFacilitiesForTab();
        
        if (activeTab === 'shelters') {
            // For shelters, show them directly - the useEffect will handle fetching
            return (
                <div style={styles.facilityGrid}>
                    {facilityResources.map(shelter => (
                        <div key={shelter.id} style={styles.facilityCard}>
                            <h3>{shelter.name}</h3>
                            <p>Capacity: {shelter.capacity_overall || 'Not specified'}</p>
                            <p>Status: {shelter.status}</p>
                            <p>Contact: {shelter.contact_info || 'N/A'}</p>
                            {shelter.description && <p>Description: {shelter.description}</p>}
                            {user && (user.role === 'command' || user.role === 'admin') && (
                                <div style={styles.buttonGroup}>
                                    <button 
                                        style={styles.editButton}
                                        onClick={() => openEditModal(shelter)}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        style={styles.deleteButton}
                                        onClick={() => handleDeleteResource(shelter.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div style={styles.facilityGrid}>
                {facilitiesForTab.map(facility => (
                    <div 
                        key={facility.id} 
                        style={styles.facilityCard}
                        onClick={() => {
                            setSelectedFacility(facility);
                            fetchFacilityResources(facility.id, activeTab);
                        }}
                    >
                        <h3>{facility.name}</h3>
                        <p>Type: {facility.type.replace('_', ' ').toUpperCase()}</p>
                        <p>Status: {facility.status}</p>
                        <p>Click to view {activeTab}</p>
                    </div>
                ))}
            </div>
        );
    };

    const renderResourceList = () => {
        if (!selectedFacility && activeTab !== 'shelters') {
            return <div style={styles.noSelection}>Select a facility to view resources</div>;
        }

        if (loading) {
            return <div style={styles.loading}>Loading resources...</div>;
        }

        return (
            <div>
                {selectedFacility && (
                    <div style={styles.selectedFacilityHeader}>
                        <h3>{selectedFacility.name} - {activeTab.toUpperCase()}</h3>
                        <button 
                            style={styles.backButton}
                            onClick={() => {
                                setSelectedFacility(null);
                                setFacilityResources([]);
                            }}
                        >
                            ← Back to Facilities
                        </button>
                    </div>
                )}
                
                {user && (user.role === 'command' || user.role === 'admin') && (
                    <button 
                        style={styles.addButton}
                        onClick={() => setShowAddModal(true)}
                    >
                        Add New {activeTab.slice(0, -1)}
                    </button>
                )}

                <div style={styles.resourceGrid}>
                    {facilityResources.map(resource => (
                        <div key={resource.id} style={styles.resourceCard}>
                            {renderResourceCardContent(resource)}
                            {user && (user.role === 'command' || user.role === 'admin') && (
                                <div style={styles.buttonGroup}>
                                    <button 
                                        style={styles.editButton}
                                        onClick={() => openEditModal(resource)}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        style={styles.deleteButton}
                                        onClick={() => handleDeleteResource(resource.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderResourceCardContent = (resource) => {
        switch (activeTab) {
            case 'supplies':
                return (
                    <>
                        <h4>{resource.item_name}</h4>
                        <p>Current: {resource.quantity_current} {resource.unit}</p>
                        <p>Capacity: {resource.quantity_capacity} {resource.unit}</p>
                        <p>Status: {resource.status}</p>
                    </>
                );
            case 'vehicles':
                return (
                    <>
                        <h4>{resource.vehicle_type}</h4>
                        <p>License: {resource.license_plate || 'N/A'}</p>
                        <p>Status: {resource.status}</p>
                        <p>Capacity: {resource.capacity_load || 'N/A'}</p>
                        <p>Assigned to: {resource.assigned_to || 'Unassigned'}</p>
                    </>
                );
            case 'personnel':
                return (
                    <>
                        <h4>{resource.name}</h4>
                        <p>Role: {resource.role}</p>
                        <p>Status: {resource.status}</p>
                        <p>Skills: {resource.skills || 'N/A'}</p>
                        <p>Contact: {resource.contact_number || 'N/A'}</p>
                        <p>Assignment: {resource.current_assignment || 'None'}</p>
                    </>
                );
            case 'shelters':
                return (
                    <>
                        <h4>{resource.name}</h4>
                        <p>Capacity: {resource.capacity_overall || 'Not specified'}</p>
                        <p>Status: {resource.status}</p>
                        <p>Contact: {resource.contact_info || 'N/A'}</p>
                        {resource.description && <p>Description: {resource.description}</p>}
                    </>
                );
            default:
                return null;
        }
    };

    const renderAddModal = () => {
        if (!showAddModal) return null;

        return (
            <div style={styles.modalOverlay}>
                <div style={styles.modal}>
                    <h3>Add New {activeTab.slice(0, -1)}</h3>
                    {renderFormFields()}
                    <div style={styles.modalButtons}>
                        <button style={styles.saveButton} onClick={handleAddResource}>
                            Add
                        </button>
                        <button style={styles.cancelButton} onClick={() => {
                            setShowAddModal(false);
                            setFormData({});
                        }}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderEditModal = () => {
        if (!showEditModal) return null;

        return (
            <div style={styles.modalOverlay}>
                <div style={styles.modal}>
                    <h3>Edit {activeTab.slice(0, -1)}</h3>
                    {renderFormFields()}
                    <div style={styles.modalButtons}>
                        <button style={styles.saveButton} onClick={handleUpdateResource}>
                            Update
                        </button>
                        <button style={styles.cancelButton} onClick={() => {
                            setShowEditModal(false);
                            setFormData({});
                            setEditingResource(null);
                        }}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderFormFields = () => {
        switch (activeTab) {
            case 'supplies':
                return (
                    <>
                        <input
                            type="text"
                            placeholder="Item Name"
                            value={formData.item_name || ''}
                            onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                            style={styles.input}
                        />
                        <input
                            type="number"
                            placeholder="Current Quantity"
                            value={formData.quantity_current || ''}
                            onChange={(e) => setFormData({...formData, quantity_current: parseInt(e.target.value)})}
                            style={styles.input}
                        />
                        <input
                            type="number"
                            placeholder="Capacity"
                            value={formData.quantity_capacity || ''}
                            onChange={(e) => setFormData({...formData, quantity_capacity: parseInt(e.target.value)})}
                            style={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="Unit (e.g., kg, pieces)"
                            value={formData.unit || ''}
                            onChange={(e) => setFormData({...formData, unit: e.target.value})}
                            style={styles.input}
                        />
                        <select
                            value={formData.status || 'adequate'}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            style={styles.input}
                        >
                            <option value="adequate">Adequate</option>
                            <option value="low">Low</option>
                            <option value="critical">Critical</option>
                        </select>
                    </>
                );
            case 'vehicles':
                return (
                    <>
                        <input
                            type="text"
                            placeholder="Vehicle Type"
                            value={formData.vehicle_type || ''}
                            onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                            style={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="License Plate"
                            value={formData.license_plate || ''}
                            onChange={(e) => setFormData({...formData, license_plate: e.target.value})}
                            style={styles.input}
                        />
                        <select
                            value={formData.status || 'available'}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            style={styles.input}
                        >
                            <option value="available">Available</option>
                            <option value="in_use">In Use</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="out_of_service">Out of Service</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Capacity/Load"
                            value={formData.capacity_load || ''}
                            onChange={(e) => setFormData({...formData, capacity_load: e.target.value})}
                            style={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="Assigned To"
                            value={formData.assigned_to || ''}
                            onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                            style={styles.input}
                        />
                    </>
                );
            case 'personnel':
                return (
                    <>
                        <input
                            type="text"
                            placeholder="Name"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            style={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="Role"
                            value={formData.role || ''}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                            style={styles.input}
                        />
                        <textarea
                            placeholder="Skills"
                            value={formData.skills || ''}
                            onChange={(e) => setFormData({...formData, skills: e.target.value})}
                            style={styles.textarea}
                        />
                        <select
                            value={formData.status || 'available'}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            style={styles.input}
                        >
                            <option value="available">Available</option>
                            <option value="assigned">Assigned</option>
                            <option value="off_duty">Off Duty</option>
                            <option value="unavailable">Unavailable</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Current Assignment"
                            value={formData.current_assignment || ''}
                            onChange={(e) => setFormData({...formData, current_assignment: e.target.value})}
                            style={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="Contact Number"
                            value={formData.contact_number || ''}
                            onChange={(e) => setFormData({...formData, contact_number: e.target.value})}
                            style={styles.input}
                        />
                    </>
                );
            case 'shelters':
                return (
                    <>
                        <input
                            type="text"
                            placeholder="Shelter Name"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            style={styles.input}
                        />
                        <input
                            type="number"
                            placeholder="Capacity"
                            value={formData.capacity_overall || ''}
                            onChange={(e) => setFormData({...formData, capacity_overall: parseInt(e.target.value)})}
                            style={styles.input}
                        />
                        <select
                            value={formData.status || 'operational'}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            style={styles.input}
                        >
                            <option value="operational">Operational</option>
                            <option value="full">Full</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="closed">Closed</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Contact Info"
                            value={formData.contact_info || ''}
                            onChange={(e) => setFormData({...formData, contact_info: e.target.value})}
                            style={styles.input}
                        />
                        <textarea
                            placeholder="Description"
                            value={formData.description || ''}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            style={styles.textarea}
                        />
                        <input
                            type="text"
                            placeholder="Location (optional)"
                            value={formData.location || ''}
                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                            style={styles.input}
                        />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Emergency Resources Management</h1>
            
            {/* Resource Category Tabs */}
            <div style={styles.tabContainer}>
                {[
                    { key: 'supplies', label: 'Emergency Supplies', icon: '📦' },
                    { key: 'vehicles', label: 'Vehicles & Equipment', icon: '🚗' },
                    { key: 'personnel', label: 'Personnel', icon: '👥' },
                    { key: 'shelters', label: 'Shelter Facilities', icon: '🏠' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        style={{
                            ...styles.tabButton,
                            ...(activeTab === tab.key ? styles.activeTab : {})
                        }}
                        onClick={() => {
                            setActiveTab(tab.key);
                            setSelectedFacility(null);
                            setFacilityResources([]);
                        }}
                    >
                        <span style={styles.tabIcon}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={styles.content}>
                <div style={styles.listContainer}>
                    {!selectedFacility && activeTab !== 'shelters' ? renderFacilityList() : renderResourceList()}
                </div>
            </div>

            {renderAddModal()}
            {renderEditModal()}

            <button
                style={styles.backButton}
                onClick={() => navigate(-1)}
            >
                ← Back to Dashboard
            </button>
        </div>
    );
}

// Styles
const styles = {
    container: {
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh'
    },
    header: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '30px'
    },
    tabContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap'
    },
    tabButton: {
        padding: '12px 20px',
        margin: '5px',
        border: '2px solid #ddd',
        backgroundColor: '#fff',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s'
    },
    activeTab: {
        backgroundColor: '#007bff',
        color: 'white',
        borderColor: '#007bff'
    },
    tabIcon: {
        fontSize: '18px'
    },
    content: {
        maxWidth: '1200px',
        margin: '0 auto'
    },
    listContainer: {
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    },
    facilityGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
    },
    facilityCard: {
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        backgroundColor: '#f9f9f9'
    },
    resourceGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '15px',
        marginTop: '20px'
    },
    resourceCard: {
        padding: '15px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#fff'
    },
    selectedFacilityHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '2px solid #eee'
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px',
        marginTop: '10px'
    },
    editButton: {
        padding: '8px 15px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
    },
    deleteButton: {
        padding: '8px 15px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
    },
    addButton: {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginBottom: '20px'
    },
    backButton: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginTop: '20px'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        minWidth: '400px',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto'
    },
    input: {
        width: '100%',
        padding: '10px',
        margin: '10px 0',
        border: '1px solid #ddd',
        borderRadius: '5px',
        fontSize: '14px'
    },
    textarea: {
        width: '100%',
        padding: '10px',
        margin: '10px 0',
        border: '1px solid #ddd',
        borderRadius: '5px',
        fontSize: '14px',
        minHeight: '80px',
        resize: 'vertical'
    },
    modalButtons: {
        display: 'flex',
        gap: '10px',
        marginTop: '20px'
    },
    saveButton: {
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        flex: 1
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        flex: 1
    },
    noSelection: {
        textAlign: 'center',
        color: '#666',
        fontSize: '18px',
        padding: '40px'
    },
    loading: {
        textAlign: 'center',
        color: '#666',
        fontSize: '16px',
        padding: '20px'
    }
};