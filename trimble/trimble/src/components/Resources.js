import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResourceCrudModal from './ResourceCrudModal';

export default function Resources() {
    // State for active resource category tab
    const [activeTab, setActiveTab] = useState('supplies');
    const [user, setUser] = useState(null);
    
     useEffect(() => {
        fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.user) setUser(data.user);
        });
    }, []);
    // Emergency Resources Data - This will now be populated by the API
    const [emergencyResources, setEmergencyResources] = useState({
        supplies: [],
        vehicles: [],
        personnel: [],
        shelters: []
    });
    const [showCrudModal, setShowCrudModal] = useState(false);
    const [facilities, setFacilities] = useState([]);
    const resourceTabs = {
        shelter: "Shelter Facilities",
        supply_center: "Supply Center",
        hospital: "Hospitals",
        command_center: "Command Center",
        vehicles: "Vehicles and Equipment",
        personnel: "Personnel"
    };
    // States for API fetched data
    const [apiFetchedResourcesData, setApiFetchedResourcesData] = useState(null);

    const navigate = useNavigate();

    // Fetch dashboard summary data
    const fetchDashboardSummary = async () => {
        try {
            const response = await fetch('/api/dashboard/summary');
            const data = await response.json();
            if (response.ok) {
                // Update the emergencyResources state directly with fetched data
                setEmergencyResources({
                    supplies: data.supplies,
                    vehicles: data.vehicles,
                    personnel: data.personnel,
                    shelters: data.shelters
                });
                setApiFetchedResourcesData(data); // Keep a copy of the raw fetched data if needed
            } else {
                console.error('Error fetching dashboard summary:', data.error);
            }
        } catch (error) {
            console.error('Network error fetching dashboard summary:', error);
        }
    };
     // Fetch facilities for CRUD (shelters, supply centers, etc)
    useEffect(() => {
        fetch('/api/facilities')
        .then(res => res.json())
        .then(data => setFacilities(Array.isArray(data) ? data : (Array.isArray(data.facilities) ? data.facilities : [])))
        .catch(() => setFacilities([]));
    }, [showCrudModal]); // refetch after CRUD

    // CRUD handlers
    const handleUpdateFacility = async (facility) => {
        await fetch(`/api/facilities/${facility.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facility)
        });
    };
    const handleDeleteFacility = async (facilityId) => {
        await fetch(`/api/facilities/${facilityId}`, { method: 'DELETE' });
    };
    const handleAddFacility = async (facility) => {
        await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facility)
        });
    };
    // Effect to get user location and fetch initial data on component mount
    useEffect(() => {

        // Fetch dashboard summary immediately on mount
        fetchDashboardSummary();
    }, []); // Empty dependency array, runs once on component mount

    // Helper function to determine status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'adequate': return '#4CAF50';
            case 'low': return '#FF9800';
            case 'critical': return '#F44336';
            default: return '#2196F3'; // Default color for unknown status
        }
    };

    // Renders an individual resource card for dashboard summaries
    const renderSummaryResourceCard = (resource, index) => {
        return (
            <div key={index} style={styles.resourceCard}>
                <div style={styles.resourceHeader}>
                    <h3 style={styles.resourceTitle}>{resource.name}</h3>
                    <div style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(resource.status),
                        color: 'white'
                    }}>
                        {resource.status.toUpperCase()}
                    </div>
                </div>

                <div style={styles.resourceStats}>
                    <div style={styles.statsRow}>
                        <span style={styles.currentValue}>{resource.current}</span>
                        <span style={styles.totalValue}>/ {resource.total} {resource.unit}</span>
                        <span style={styles.percentage}>{resource.percentage}%</span>
                    </div>

                    <div style={styles.progressBar}>
                        <div
                            style={{
                                ...styles.progressFill,
                                width: `${resource.percentage}%`,
                                backgroundColor: getStatusColor(resource.status)
                            }}
                        />
                    </div>

                    {resource.needsReplenishment && (
                        <div style={styles.replenishmentAlert}>
                            <span style={styles.alertIcon}>⚠️</span>
                            Replenishment needed
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Renders supply items grouped by facility
    const renderGroupedSupplies = () => {
        const suppliesData = apiFetchedResourcesData?.supplies || [];

        // Group supplies by facility name
        const suppliesByFacility = suppliesData.reduce((acc, item) => {
            const facilityName = item.facility_name || 'Unassigned Supplies'; // Assuming item has facility_name
            if (!acc[facilityName]) {
                acc[facilityName] = [];
            }
            acc[facilityName].push(item);
            return acc;
        }, {});

        if (Object.keys(suppliesByFacility).length === 0) {
            return <div style={styles.noResults}>No supply data available.</div>;
        }

        return (
            <div style={styles.groupedContainer}>
                {Object.entries(suppliesByFacility).map(([facilityName, items]) => (
                    <div key={facilityName} style={styles.facilityGroup}>
                        <h3 style={styles.facilityGroupTitle}>📦 {facilityName}</h3>
                        <div style={styles.resourceGrid}>
                            {items.map((item, index) => (
                                <div key={index} style={styles.itemCard}>
                                    <h4>{item.name}</h4>
                                    <p>Current: {item.current} {item.unit}</p>
                                    <p>Total Capacity: {item.total} {item.unit}</p>
                                    <div style={styles.statusIndicator}>
                                        <span style={{
                                            ...styles.statusDot,
                                            backgroundColor: getStatusColor(item.status)
                                        }}></span>
                                        {item.status.toUpperCase()} ({item.percentage}%)
                                    </div>
                                    {item.needsReplenishment && (
                                        <p style={styles.replenishmentAlert}>⚠️ Replenishment needed</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Renders the main resource section based on active tab
    const renderResourceSection = () => {
        // Display API-fetched resources for the active tab (from dashboard summary)
        if (apiFetchedResourcesData) {
            if (activeTab === 'supplies') {
                return renderGroupedSupplies(); // Special rendering for supplies
            } else {
                const currentResources = emergencyResources[activeTab]; // Use the updated state
                if (currentResources && currentResources.length > 0) {
                    return (
                        <div style={styles.resourceGrid}>
                            {currentResources.map((resource, index) => renderSummaryResourceCard(resource, index))}
                        </div>
                    );
                }
            }
        }

        return <div style={styles.noResults}>No resources found for this category.</div>;
    };


    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Emergency Resources Dashboard</h1>
             <div style={{ textAlign: 'right', margin: '20px 0' }}>
                {user && (user.role === 'command' || user.role === 'admin') && (
        <div style={{ textAlign: 'right', margin: '20px 0' }}>
          <button onClick={() => setShowCrudModal(true)}>
            Add/Update/Delete Resource
          </button>
        </div>
      )}
      </div>
      <ResourceCrudModal
        show={showCrudModal}
        onClose={() => setShowCrudModal(false)}
        resourceTabs={resourceTabs}
        facilities={facilities}
        onUpdate={handleUpdateFacility}
        onDelete={handleDeleteFacility}
        onAdd={handleAddFacility}
      />

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
                        }}
                    >
                        <span style={styles.tabIcon}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={styles.content}>
                <div style={styles.listContainer}>
                    {renderResourceSection()}
                </div>
            </div>

            <button
                style={styles.backButton}
                onClick={() => navigate(-1)}
            >
                ← Back to Dashboard
            </button>
        </div>
    );
}

// Consolidated and Enhanced Styles object
const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f4f7f6',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '20px'
    },
    header: {
        textAlign: 'center',
        color: '#003366',
        marginBottom: '25px',
        fontSize: '2.2em'
    },
    riskAlert: {
        backgroundColor: '#fff3e0',
        borderLeft: '5px solid #ff9800',
        padding: '10px 15px',
        marginBottom: '20px',
        borderRadius: '4px',
        color: '#333'
    },
    quickActionsContainer: {
        marginBottom: '30px',
        padding: '15px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    },
    quickActionsTitle: {
        color: '#003366',
        marginBottom: '15px',
        textAlign: 'center'
    },
    quickActionsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '15px'
    },
    quickActionButton: {
        display: 'flex',
        alignItems: 'center',
        padding: '15px',
        backgroundColor: '#e0e9f1',
        border: '1px solid #cce0f2',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
        '&:hover': {
            backgroundColor: '#cce0f2',
            borderColor: '#aadcff'
        }
    },
    actionIconContainer: {
        fontSize: '2em',
        marginRight: '15px'
    },
    actionTextContainer: {
        display: 'flex',
        flexDirection: 'column'
    },
    actionMainText: {
        fontWeight: 'bold',
        color: '#003366',
        fontSize: '1.1em'
    },
    actionSubText: {
        fontSize: '0.85em',
        color: '#555'
    },
    tabContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '20px',
        backgroundColor: '#e9ecef',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
    },
    tabButton: {
        flex: 1,
        padding: '15px 20px',
        fontSize: '1.05em',
        fontWeight: 'bold',
        color: '#003366',
        background: 'none',
        border: 'none',
        borderBottom: '3px solid transparent',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        '&:hover': {
            backgroundColor: '#dee2e6'
        }
    },
    activeTab: {
        backgroundColor: '#003366',
        color: 'white',
        borderBottomColor: '#007bff',
        '&:hover': {
            backgroundColor: '#003366' // Prevent hover effect on active tab
        }
    },
    tabIcon: {
        fontSize: '1.2em'
    },
    content: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    },
    listContainer: {
        minHeight: '300px' // Ensure some height even if no data
    },
    resourceGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
    },
    resourceCard: {
        backgroundColor: '#f8f9fa',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
            transform: 'translateY(-3px)'
        }
    },
    resourceHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
    },
    resourceTitle: {
        margin: 0,
        color: '#003366',
        fontSize: '1.2em'
    },
    statusBadge: {
        padding: '5px 10px',
        borderRadius: '20px',
        fontSize: '0.8em',
        fontWeight: 'bold'
    },
    resourceStats: {
        marginTop: '10px'
    },
    statsRow: {
        display: 'flex',
        alignItems: 'baseline',
        marginBottom: '5px'
    },
    currentValue: {
        fontSize: '1.5em',
        fontWeight: 'bold',
        color: '#333'
    },
    totalValue: {
        fontSize: '0.9em',
        color: '#777',
        marginLeft: '5px'
    },
    percentage: {
        fontSize: '1.1em',
        fontWeight: 'bold',
        marginLeft: 'auto',
        color: '#007bff'
    },
    progressBar: {
        backgroundColor: '#e0e0e0',
        borderRadius: '5px',
        height: '8px',
        overflow: 'hidden',
        marginBottom: '10px'
    },
    progressFill: {
        height: '100%',
        borderRadius: '5px'
    },
    replenishmentAlert: {
        backgroundColor: '#ffebee',
        color: '#d32f2f',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '0.85em',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
    },
    alertIcon: {
        fontSize: '1.1em'
    },
    itemCard: {
        backgroundColor: '#f8f9fa',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
            transform: 'translateY(-3px)'
        },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
    },
    statusIndicator: {
        display: 'flex',
        alignItems: 'center',
        marginTop: '10px',
        fontSize: '0.9em',
        color: '#555'
    },
    statusDot: {
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        marginRight: '8px'
    },
    noResults: {
        textAlign: 'center',
        padding: '30px',
        color: '#777',
        fontSize: '1.1em'
    },
    backButton: {
        display: 'block',
        margin: '20px auto',
        padding: '10px 20px',
        fontSize: '1em',
        backgroundColor: '#003366',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        '&:hover': {
            backgroundColor: '#002244'
        }
    },
    groupedContainer: {
        marginTop: '20px',
    },
    facilityGroup: {
        backgroundColor: '#ffffff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    facilityGroupTitle: {
        color: '#003366',
        marginBottom: '15px',
        fontSize: '1.5em',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
};