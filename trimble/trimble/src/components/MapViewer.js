// Enhanced MapViewer component with comprehensive debugging for facility status
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';
import Graphic from '@arcgis/core/Graphic';
import Polygon from '@arcgis/core/geometry/Polygon';
import Point from '@arcgis/core/geometry/Point';
import RainOverlay from './RainOverlay';

const GOV_STYLES = {
    primary: '#003366',
    secondary: '#417690',
    accent: '#E31937',
    warning: '#FFC107'
};

const FACILITY_ICONS = {
    'hospital': '🏥',
    'shelter': '🏠',
    'supply_center': '📦',
    'command_center': '📡'
};

const FACILITY_TYPE_DISPLAY = {
    'hospital': 'Hospital',
    'shelter': 'Shelter',
    'supply_center': 'Supply Center',
    'command_center': 'Command Center',
};

export default function MapViewer() {
    const mapRef = useRef(null);
    const navigate = useNavigate();
    const [view, setView] = useState(null);
    const [floodZones, setFloodZones] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [rainData, setRainData] = useState(null);
    const [rainfallPermissionDenied, setRainfallPermissionDenied] = useState(false);
    
    const [analysisResults, setAnalysisResults] = useState([]);
    const [showBuffers, setShowBuffers] = useState(false);
    
    // Filter states
    const [showFloodZones, setShowFloodZones] = useState(true);
    const [visibleFacilityTypes, setVisibleFacilityTypes] = useState({
        hospital: true,
        shelter: true,
        supply_center: true,
        command_center: true
    });

    const fetchFloodZones = useCallback(async () => {
        try {
            const response = await fetch('/api/high-risk-zones');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setFloodZones(Array.isArray(data?.zones) ? data.zones : []);
        } catch (error) {
            console.error('Error fetching flood zones:', error);
            setFloodZones([]);
        }
    }, []);

    const fetchFacilities = useCallback(async () => {
        try {
            const baseUrl = window.location.origin.includes('localhost') ?
                'http://localhost:5001' : '';
            const url = `${baseUrl}/api/facilities`;

            console.log('🔍 Fetching facilities from:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('❌ Authentication required - user not logged in or insufficient permissions');
                    throw new Error(`Authentication required (${response.status})`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('📡 Raw facilities API response:', data);
            
            const facilitiesArray = Array.isArray(data?.facilities) ? data.facilities : [];
            console.log(`📊 Facilities array length: ${facilitiesArray.length}`);

            setFacilities(facilitiesArray);

        } catch (error) {
            console.error('❌ Error fetching facilities:', error);
            setFacilities([]);
        }
    }, []);

    const fetchRainData = useCallback(async () => {
        try {
            console.log('🌧️ Attempting to fetch rainfall data...');
            console.log('🌧️ Request URL:', window.location.origin + '/api/rainfall');
            
            const response = await fetch('/api/rainfall', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('🌧️ Response status:', response.status);
            console.log('🌧️ Response ok:', response.ok);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('🌧️ Error response body:', errorText);
                
                if (response.status === 401 || response.status === 403) {
                    console.warn('⚠️ Access denied to rainfall data - insufficient permissions (command/admin role required)');
                    setRainfallPermissionDenied(true);
                    setRainData({
                        rain_last_hour: 0,
                        access_denied: true,
                        message: 'Rainfall data access restricted to command/admin users'
                    });
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('🌧️ Successfully fetched rainfall data:', data);
            setRainfallPermissionDenied(false);
            setRainData(data);
            
        } catch (error) {
            console.error('❌ Error fetching rainfall data:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // Set default rainfall data for users without permission
            if (!rainfallPermissionDenied) {
                setRainData({
                    rain_last_hour: 0,
                    error: true,
                    message: 'Unable to fetch rainfall data'
                });
            }
        }
    }, [rainfallPermissionDenied]);
    
    // Distance calculation function
    const calculateDistance = (point1, point2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLon = (point2.lng - point1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    // Find nearest facilities - handle different possible data structures
    const findNearestFacilities = (targetPoint, facilityType) => {
        return facilities
        .filter(f => f.type === facilityType && f.status !== 'damaged')
        .map(facility => ({
            ...facility,
            distance: calculateDistance(targetPoint, { 
            lat: facility.latitude || facility.lat || facility.location?.lat, 
            lng: facility.longitude || facility.lng || facility.location?.lng 
            })
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3); // Top 3 nearest
    };

    // Get service radius based on facility type
    const getServiceRadius = (facilityType) => {
        switch(facilityType) {
        case 'hospital': return 3000;
        case 'shelter': return 2000;
        case 'supply_center': return 1500;
        case 'command_center': return 5000;
        default: return 2000;
        }
    };

    // Get colors for different facility types
    const getFacilityColor = (facilityType, isBuffer = false) => {
        const colors = {
        hospital: isBuffer ? [255, 0, 0, 0.1] : [255, 0, 0],
        shelter: isBuffer ? [0, 255, 0, 0.1] : [0, 255, 0],
        supply_center: isBuffer ? [0, 0, 255, 0.1] : [0, 0, 255],
        command_center: isBuffer ? [255, 165, 0, 0.1] : [255, 165, 0]
        };
        return colors[facilityType] || [128, 128, 128, isBuffer ? 0.1 : 1];
    };

    // Add buffer zones - handle different coordinate field names
    const addBufferZones = async (mapView) => {
        if (!mapView || !facilities.length) return;

        try {
        const [
            { default: Circle },
            { default: SimpleFillSymbol },
            { default: Graphic }
        ] = await Promise.all([
            import('@arcgis/core/geometry/Circle'),
            import('@arcgis/core/symbols/SimpleFillSymbol'),
            import('@arcgis/core/Graphic')
        ]);

        facilities.forEach(facility => {
            const lat = facility.latitude || facility.lat || facility.location?.lat;
            const lng = facility.longitude || facility.lng || facility.location?.lng;
            
            if (!lat || !lng) {
            console.warn('Missing coordinates for facility:', facility);
            return;
            }

            const circle = new Circle({
            center: [lng, lat],
            radius: getServiceRadius(facility.type),
            radiusUnit: "meters"
            });
            
            const graphic = new Graphic({
            geometry: circle,
            symbol: new SimpleFillSymbol({
                color: getFacilityColor(facility.type, true),
                outline: { 
                color: getFacilityColor(facility.type, false).concat([0.5]),
                width: 2
                }
            }),
            attributes: {
                name: facility.name,
                type: facility.type,
                serviceRadius: getServiceRadius(facility.type)
            }
            });
            
            mapView.graphics.add(graphic);
        });
        } catch (error) {
        console.error('Error adding buffer zones:', error);
        }
    };

    // Add facility markers - handle different coordinate field names
    const addFacilityMarkers = async (mapView) => {
        if (!mapView || !facilities.length) return;

        try {
        const [
            { default: Point },
            { default: SimpleMarkerSymbol },
            { default: Graphic }
        ] = await Promise.all([
            import('@arcgis/core/geometry/Point'),
            import('@arcgis/core/symbols/SimpleMarkerSymbol'),
            import('@arcgis/core/Graphic')
        ]);

        facilities.forEach(facility => {
            const lat = facility.latitude || facility.lat || facility.location?.lat;
            const lng = facility.longitude || facility.lng || facility.location?.lng;
            
            if (!lat || !lng) {
            console.warn('Missing coordinates for facility:', facility);
            return;
            }

            const point = new Point({
            longitude: lng,
            latitude: lat
            });

            const symbol = new SimpleMarkerSymbol({
            color: getFacilityColor(facility.type, false),
            size: facility.status === 'damaged' ? 8 : 12,
            outline: {
                color: facility.status === 'damaged' ? [255, 0, 0] : [255, 255, 255],
                width: 2
            }
            });

            const graphic = new Graphic({
            geometry: point,
            symbol: symbol,
            attributes: facility,
            popupTemplate: {
                title: facility.name,
                content: `
                <b>Type:</b> ${facility.type ? facility.type.replace('_', ' ') : 'Unknown'}<br>
                <b>Status:</b> ${facility.status || 'Unknown'}<br>
                <b>Service Radius:</b> ${getServiceRadius(facility.type)}m<br>
                <b>Capacity:</b> ${facility.capacity || 'N/A'}<br>
                <b>Contact:</b> ${facility.contact || 'N/A'}
                `
            }
            });

            mapView.graphics.add(graphic);
        });
        } catch (error) {
        console.error('Error adding facility markers:', error);
        }
    };

    // Perform spatial analysis
    const performSpatialAnalysis = () => {
        const centerPoint = { lat: 13.0827, lng: 80.2707 }; // Chennai center
        
        const analysis = {
        nearestHospitals: findNearestFacilities(centerPoint, 'hospital'),
        nearestShelters: findNearestFacilities(centerPoint, 'shelter'),
        totalFacilities: facilities.length,
        operationalFacilities: facilities.filter(f => f.status !== 'damaged').length,
        damagedFacilities: facilities.filter(f => f.status === 'damaged').length
        };

        setAnalysisResults([
        `Total Facilities: ${analysis.totalFacilities}`,
        `Operational: ${analysis.operationalFacilities}`,
        `Damaged: ${analysis.damagedFacilities}`,
        `Nearest Hospital: ${analysis.nearestHospitals[0]?.name || 'None'} ${analysis.nearestHospitals[0] ? `(${analysis.nearestHospitals[0].distance.toFixed(2)}km)` : ''}`,
        `Nearest Shelter: ${analysis.nearestShelters[0]?.name || 'None'} ${analysis.nearestShelters[0] ? `(${analysis.nearestShelters[0].distance.toFixed(2)}km)` : ''}`
        ]);
    };

    // Toggle buffer zones
    const toggleBufferZones = () => {
        if (!view) return;
        
        if (showBuffers) {
        view.graphics.removeAll();
        addFacilityMarkers(view);
        } else {
        addBufferZones(view);
        }
        setShowBuffers(!showBuffers);
    };

    // Initial map setup
    useEffect(() => {
        const webmap = new WebMap({
            basemap: 'topo-vector',
            ground: 'world-elevation'
        });

        const mapView = new MapView({
            container: mapRef.current,
            map: webmap,
            center: [80.2707, 13.0827],
            zoom: 11,
            constraints: { minZoom: 10 }
        });

        mapView.when(() => {
            setView(mapView);
            // Initial data fetch
            fetchFloodZones();
            fetchFacilities();
            fetchRainData();
        });

        return () => {
            if (mapView) {
                mapView.destroy();
            }
        };
    }, [fetchFloodZones, fetchFacilities, fetchRainData]);

    // Polling effect with proper dependencies
    useEffect(() => {
        if (!view) return;

        const interval = setInterval(() => {
            fetchFloodZones();
            fetchFacilities();
            // Only attempt to fetch rainfall data if we haven't been denied access
            if (!rainfallPermissionDenied) {
                fetchRainData();
            }
        }, 300000); // 5 minutes

        return () => clearInterval(interval);
    }, [view, fetchFloodZones, fetchFacilities, fetchRainData, rainfallPermissionDenied]);

    // Popup handling
    useEffect(() => {
        if (!view) return;

        let popupHandle = null;

        const setupPopupHandling = () => {
            try {
                const handlePopupAction = (event) => {
                    try {
                        if (event.action.id === 'zone-details') {
                            const zone = view.popup.selectedFeature?.attributes;
                            if (zone) {
                                setSelectedZone(zone);
                            }
                        } else if (event.action.id === 'view-facility-details') {
                            const facilityId = view.popup.selectedFeature?.attributes?.id;
                            if (facilityId) {
                                navigate(`/facility/${facilityId}`);
                            }
                        }
                    } catch (error) {
                        console.error('Error handling popup action:', error);
                    }
                };

                if (view.popup && typeof view.popup.on === 'function') {
                    popupHandle = view.popup.on('trigger-action', handlePopupAction);
                } else {
                    setTimeout(setupPopupHandling, 100);
                }
            } catch (error) {
                console.error('Error in setupPopupHandling:', error);
            }
        };

        view.when(() => {
            setupPopupHandling();
        }).catch(error => {
            console.error('Error setting up popup handling:', error);
        });

        return () => {
            if (popupHandle) {
                popupHandle.remove();
            }
        };
    }, [view, navigate]);

    //Main graphics rendering effect with proper logging
    useEffect(() => {
        if (!view) {
            return;
        }

        console.log('🎨 Starting graphics rendering...');
        console.log(`📊 Rendering with ${floodZones.length} flood zones and ${facilities.length} facilities`);

        // Clear existing graphics
        view.graphics.removeAll();

        let renderStats = {
            successCount: 0,
            errorCount: 0,
            facilitiesProcessed: 0,
            facilitiesSkipped: 0
        };

        // Add flood zones
        if (showFloodZones) {
            console.log(`🌊 Rendering ${floodZones.length} flood zones...`);
            floodZones.forEach((zone, index) => {
                try {
                    const color = zone.risk_level === 'extreme' ? [227, 25, 55, 0.5] :
                        zone.risk_level === 'high' ? [255, 193, 7, 0.5] :
                        [0, 51, 102, 0.3];

                    let coordinates;
                    if (typeof zone.geometry === 'string') {
                        coordinates = JSON.parse(zone.geometry).coordinates[0];
                    } else if (zone.geometry && zone.geometry.coordinates) {
                        coordinates = zone.geometry.coordinates[0];
                    } else {
                        throw new Error('Invalid geometry structure');
                    }

                    const graphic = new Graphic({
                        geometry: new Polygon({
                            rings: [coordinates]
                        }),
                        symbol: {
                            type: "simple-fill",
                            color: color,
                            outline: {
                                color: color.slice(0, 3).concat([1]),
                                width: 2
                            }
                        },
                        attributes: zone,
                        popupTemplate: {
                            title: zone.zone_name,
                            content: `
                                <div style="padding: 10px;">
                                    <p><strong>Risk Level:</strong> <span style="color: ${zone.risk_level === 'extreme' ? '#E31937' : zone.risk_level === 'high' ? '#FFC107' : '#003366'}; font-weight: bold;">${zone.risk_level.toUpperCase()}</span></p>
                                    <p><strong>Water Level:</strong> ${zone.water_level}m</p>
                                    <p><strong>Description:</strong> ${zone.description || 'No description available'}</p>
                                </div>
                            `,
                            actions: [{
                                id: 'zone-details',
                                title: 'View Details'
                            }]
                        }
                    });

                    view.graphics.add(graphic);
                    renderStats.successCount++;
                } catch (error) {
                    console.error(`❌ Error adding flood zone ${index + 1}:`, error);
                    console.error('Zone data:', zone);
                    renderStats.errorCount++;
                }
            });
        }

        // Add facilities
        console.log(`🏢 Processing ${facilities.length} facilities...`);
        facilities.forEach((facility, index) => {
            renderStats.facilitiesProcessed++;

            // Only render if the facility type is enabled in filters
            if (!visibleFacilityTypes[facility.type]) {
                console.log(`   ⏭️ Skipping facility "${facility.name}" - type "${facility.type}" not visible`);
                renderStats.facilitiesSkipped++;
                return;
            }

            try {
                // validation with detailed logging
                if (!facility.location) {
                    console.error(`   ❌ Facility "${facility.name}" has no location object`);
                    renderStats.errorCount++;
                    return;
                }

                // Handle both string and numeric coordinates
                let lat, lng;
                if (typeof facility.location.lat === 'string') {
                    lat = parseFloat(facility.location.lat);
                } else {
                    lat = facility.location.lat;
                }

                if (typeof facility.location.lng === 'string') {
                    lng = parseFloat(facility.location.lng);
                } else {
                    lng = facility.location.lng;
                }

                console.log(`   📍 Coordinates: lat=${lat}, lng=${lng}`);

                if (isNaN(lat) || isNaN(lng) || lat === null || lng === null || lat === undefined || lng === undefined) {
                    console.error(`   ❌ Facility "${facility.name}" has invalid coordinates: lat=${facility.location.lat}, lng=${facility.location.lng}`);
                    renderStats.errorCount++;
                    return;
                }

                // Check if coordinates are reasonable for Chennai area
                if (lat < 12.8 || lat > 13.3 || lng < 79.8 || lng > 80.5) {
                    console.warn(`   ⚠️ Facility "${facility.name}" coordinates may be outside Chennai area: lat=${lat}, lng=${lng}`);
                }

                let statusColor;
                let statusDescription;
                
                if (facility.status === 'operational') {
                    statusColor = [0, 150, 0];
                    statusDescription = 'Green (Operational)';
                } else if (facility.status === 'damaged') {
                    statusColor = [220, 20, 20];
                    statusDescription = 'Red (Damaged)';
                } else if (facility.status === 'low_capacity' || facility.status === 'low_stock' || facility.status === 'full') {
                    statusColor = [255, 140, 0];
                    statusDescription = 'Orange (Limited/Low/Full)';
                } else {
                    statusColor = [128, 128, 128];
                    statusDescription = 'Gray (Unknown/Default)';
                }

                console.log(`   🎨 Color chosen: ${statusDescription} - RGB(${statusColor.join(', ')})`);

                // Create the point geometry
                const pointGeometry = new Point({
                    longitude: lng,
                    latitude: lat
                });

                // Create the graphic with enhanced popup content
                const graphic = new Graphic({
                    geometry: pointGeometry,
                    symbol: {
                        type: "simple-marker",
                        style: "circle",
                        color: statusColor,
                        size: "16px",
                        outline: {
                            color: [255, 255, 255],
                            width: 2
                        }
                    },
                    attributes: {
                        ...facility,
                        displayType: FACILITY_TYPE_DISPLAY[facility.type] || facility.type,
                        debugStatusColor: statusDescription
                    },
                    popupTemplate: {
                        title: `${FACILITY_ICONS[facility.type] || '📍'} ${facility.name}`,
                        content: `
                            <div style="padding: 10px; font-family: Arial, sans-serif;">
                                <p><strong>Type:</strong> ${FACILITY_TYPE_DISPLAY[facility.type] || facility.type}</p>
                                <p><strong>Status:</strong> <span style="color: ${facility.status === 'operational' ? 'green' : facility.status === 'damaged' ? 'red' : 'orange'}; font-weight: bold;">${facility.status ? facility.status.toUpperCase().replace('_', ' ') : 'UNKNOWN'}</span></p>
                                <p><strong>Status Color:</strong> ${statusDescription}</p>
                                ${facility.capacity_overall ? `<p><strong>Capacity:</strong> ${facility.capacity_overall}</p>` : ''}
                                ${facility.contact_info && facility.contact_info !== 'N/A' ? `<p><strong>Contact:</strong> ${facility.contact_info}</p>` : ''}
                                ${facility.description ? `<p><strong>Description:</strong> ${facility.description}</p>` : ''}
                                <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                                <hr>
                                <p style="font-size: 11px; color: #666;"><strong>Debug Info:</strong><br>
                                Raw Status: "${facility.status}"<br>
                                Color Applied: ${statusDescription}</p>
                            </div>
                        `,
                        actions: [{
                            id: 'view-facility-details',
                            title: 'View Details'
                        }]
                    }
                });

                view.graphics.add(graphic);
                console.log(`   ✅ Successfully added facility "${facility.name}" to map`);
                renderStats.successCount++;

            } catch (error) {
                console.error(`   ❌ Error adding facility ${index + 1} ("${facility.name}"):`, error);
                console.error('   Facility data:', facility);
                renderStats.errorCount++;
            }
        });

        // Add rain marker if data exists and user has permission
        if (rainData?.rain_last_hour > 0 && !rainData?.access_denied && !rainData?.error) {
            try {
                const rainGraphic = new Graphic({
                    geometry: new Point({
                        longitude: 80.2707,
                        latitude: 13.0827
                    }),
                    symbol: {
                        type: "simple-marker",
                        color: [0, 100, 255, 0.7],
                        size: Math.min(rainData.rain_last_hour * 3, 50),
                        outline: {
                            color: [0, 100, 255, 1],
                            width: 2
                        }
                    },
                    attributes: {
                        rain_last_hour: rainData.rain_last_hour,
                        forecast: rainData.forecast
                    },
                });

                view.graphics.add(rainGraphic);
                renderStats.successCount++;
            } catch (error) {
                console.error('❌ Error adding rain marker:', error);
                renderStats.errorCount++;
            }
        }

        // Log rendering stats
        const totalGraphics = view.graphics.length;
        console.log(`✅ Graphics rendering complete:`, {
            totalGraphics,
            ...renderStats
        });

    }, [view, floodZones, facilities, rainData, showFloodZones, visibleFacilityTypes]);

    // Handler for facility type checkboxes
    const handleFacilityTypeChange = (type) => {
        console.log(`🔄 Toggling facility type: ${type}`);
        setVisibleFacilityTypes(prev => {
            const newState = {
                ...prev,
                [type]: !prev[type]
            };
            console.log(`   New visibility state:`, newState);
            return newState;
        });
    };

    // Function to get rainfall display info
    const getRainfallDisplayInfo = () => {
        if (rainData?.access_denied) {
            return {
                icon: '🔒',
                text: 'Rainfall data access restricted',
                status: 'RESTRICTED ACCESS',
                detail: 'Command/Admin role required'
            };
        } else if (rainData?.error) {
            return {
                icon: '❌',
                text: 'Unable to fetch rainfall data',
                status: 'DATA ERROR',
                detail: 'Check connection'
            };
        } else if (rainData) {
            const icon = rainData.rain_last_hour > 10 ? '⚠️' : rainData.rain_last_hour > 5 ? '🟠' : '✅';
            return {
                icon: icon,
                text: `Rainfall: ${rainData.rain_last_hour} mm/h`,
                status: rainData.forecast?.risk?.toUpperCase() || 'MONITORING',
                detail: rainData.forecast?.action || null
            };
        } else {
            return {
                icon: '⏳',
                text: 'Loading rainfall data...',
                status: 'LOADING',
                detail: null
            };
        }
    };

    const rainfallInfo = getRainfallDisplayInfo();

    return (
    <div className="w-full h-screen bg-gray-100">
        {/* Rain Overlay - only show if we have valid rain data */}
        {rainData && !rainData.access_denied && !rainData.error && (
            <RainOverlay rainData={rainData}/>
        )}

        {/* Floating Control Buttons - Top Right */}
        <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-end'
        }}>
            <button
                onClick={toggleBufferZones}
                style={{
                    background: GOV_STYLES.primary,
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                {showBuffers ? 'Hide Service Areas' : 'Show Service Areas'}
            </button>

            <button
                onClick={performSpatialAnalysis}
                style={{
                    background: GOV_STYLES.secondary,
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                Run Spatial Analysis
            </button>

            {/* Spatial Analysis Results - Below the buttons */}
            {analysisResults.length > 0 && (
                <div style={{
                    background: 'white',
                    borderLeft: `6px solid ${GOV_STYLES.primary}`,
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    minWidth: '250px',
                    maxWidth: '300px',
                    color: GOV_STYLES.primary,
                    marginTop: '10px'
                }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        marginBottom: '10px'
                    }}>
                        Spatial Analysis Results:
                    </h3>
                    <ul style={{
                        fontSize: '13px',
                        lineHeight: '1.5',
                        color: '#333',
                        paddingLeft: '18px'
                    }}>
                        {analysisResults.map((result, index) => (
                            <li key={index} style={{ marginBottom: '6px' }}>• {result}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>

        {/* Map Container with Overlays */}
        <div className="relative w-full" style={{ height: 'calc(100vh - 20px)' }}>
            {/* Alert Dashboard */}
            <div style={{
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 100,
                background: rainData?.access_denied ? GOV_STYLES.warning : GOV_STYLES.primary,
                color: 'white',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                maxWidth: '350px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '28px' }}>
                        {rainfallInfo.icon}
                    </div>
                    <div>
                        <div style={{ fontSize: '16px' }}>CHENNAI FLOOD MONITORING</div>
                        <div style={{ fontSize: '14px', fontWeight: 'normal', marginTop: '4px' }}>
                            {rainfallInfo.text}<br />
                            Status: <strong>{rainfallInfo.status}</strong><br />
                            {rainfallInfo.detail && rainfallInfo.detail}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Controls */}
            <div style={{
                position: 'absolute',
                top: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                background: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        id="showFloodZones"
                        checked={showFloodZones}
                        onChange={() => setShowFloodZones(!showFloodZones)}
                        style={{ accentColor: GOV_STYLES.primary }}
                    />
                    <label htmlFor="showFloodZones" style={{ fontWeight: 'bold', color: GOV_STYLES.primary }}>Flood Zones</label>
                </div>

                <div style={{ borderLeft: '1px solid #eee', height: '30px', margin: '0 10px' }}></div>

                {Object.keys(FACILITY_TYPE_DISPLAY).map(type => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="checkbox"
                            id={`show-${type}`}
                            checked={visibleFacilityTypes[type]}
                            onChange={() => handleFacilityTypeChange(type)}
                            style={{ accentColor: GOV_STYLES.secondary }}
                        />
                        <label htmlFor={`show-${type}`} style={{ color: GOV_STYLES.secondary }}>
                            {FACILITY_ICONS[type]} {FACILITY_TYPE_DISPLAY[type]}
                        </label>
                    </div>
                ))}
            </div>

            {/* Enhanced Legend - Positioned near bottom with minimal margin */}
            <div style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                zIndex: 100,
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                border: '1px solid #ddd',
                minWidth: '200px'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#003366', fontSize: '14px' }}>
                    📍 MAP LEGEND
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#666', marginBottom: '5px' }}>FLOOD ZONES</div>
                    <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                        <div style={{ width: '16px', height: '16px', background: 'rgba(227, 25, 55, 0.5)', marginRight: '8px', border: '1px solid rgba(227, 25, 55, 1)' }}></div>
                        <div style={{ fontSize: '12px' }}>Extreme Risk</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                        <div style={{ width: '16px', height: '16px', background: 'rgba(255, 193, 7, 0.5)', marginRight: '8px', border: '1px solid rgba(255, 193, 7, 1)' }}></div>
                        <div style={{ fontSize: '12px' }}>High Risk</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                        <div style={{ width: '16px', height: '16px', background: 'rgba(0, 51, 102, 0.3)', marginRight: '8px', border: '1px solid rgba(0, 51, 102, 1)' }}></div>
                        <div style={{ fontSize: '12px' }}>Moderate/Low Risk</div>
                    </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
                    <strong>Facility Status:</strong><br/>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'rgb(0, 150, 0)', borderRadius: '50%', marginRight: '5px' }}></span> Operational<br/>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'rgb(255, 140, 0)', borderRadius: '50%', marginRight: '5px' }}></span> Limited/Low/Full<br/>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'rgb(220, 20, 20)', borderRadius: '50%', marginRight: '5px' }}></span> Damaged<br/>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'rgb(128, 128, 128)', borderRadius: '50%', marginRight: '5px' }}></span> Unknown
                </div>
            </div>

            {/* Map Container */}
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        </div>

        {/* Zone Details Modal */}
        {selectedZone && (
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
                background: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                width: '450px',
                maxWidth: '90%',
                border: '2px solid #003366'
            }}>
                <h3 style={{ marginTop: 0, color: GOV_STYLES.primary, borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                    {selectedZone.zone_name}
                </h3>
                <div style={{ marginBottom: '20px' }}>
                    <p style={{ margin: '10px 0' }}>
                        <strong>Risk Level:</strong>
                        <span style={{
                            color: selectedZone.risk_level === 'extreme' ? GOV_STYLES.accent :
                                selectedZone.risk_level === 'high' ? GOV_STYLES.warning : GOV_STYLES.primary,
                            fontWeight: 'bold',
                            marginLeft: '8px'
                        }}>
                            {selectedZone.risk_level.toUpperCase()}
                        </span>
                    </p>
                    <p style={{ margin: '10px 0' }}><strong>Water Level:</strong> {selectedZone.water_level}m</p>
                    {selectedZone.description && (
                        <p style={{ margin: '10px 0' }}><strong>Description:</strong> {selectedZone.description}</p>
                    )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        onClick={() => setSelectedZone(null)}
                        style={{
                            background: GOV_STYLES.secondary,
                            color: 'white',
                            border: 'none',
                            padding: '10px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            navigate('/response');
                            setSelectedZone(null);
                        }}
                        style={{
                            background: GOV_STYLES.accent,
                            color: 'white',
                            border: 'none',
                            padding: '10px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Initiate Response
                    </button>
                </div>
            </div>
        )}
    </div>
);
}