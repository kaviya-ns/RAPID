//src/components/ResourceCrudModal.js
import React, { useState } from 'react';

export default function ResourceCrudModal({
  show, onClose, resourceType, facilities, onUpdate, onDelete, onAdd
}) {
  const [selectedFacility, setSelectedFacility] = useState('');
  const [formData, setFormData] = useState({});
  const [mode, setMode] = useState('add'); // 'add', 'edit', 'delete'

  if (!show) return null;

  const handleSubmit = () => {
    switch (mode) {
      case 'add':
        onAdd({ ...formData, facility_id: selectedFacility });
        break;
      case 'edit':
        onUpdate(formData);
        break;
      case 'delete':
        onDelete(formData.id);
        break;
    }
    onClose();
  };

  const renderFormFields = () => {
    switch (resourceType) {
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
              placeholder="Unit"
              value={formData.unit || ''}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
              style={styles.input}
            />
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
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3>{mode.charAt(0).toUpperCase() + mode.slice(1)} {resourceType}</h3>
        
        {mode === 'add' && (
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            style={styles.input}
          >
            <option value="">Select Facility</option>
            {facilities.map(facility => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        )}
        
        {renderFormFields()}
        
        <div style={styles.buttonGroup}>
          <button style={styles.saveButton} onClick={handleSubmit}>
            {mode === 'delete' ? 'Delete' : 'Save'}
          </button>
          <button style={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
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
    minWidth: '400px'
  },
  input: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    border: '1px solid #ddd',
    borderRadius: '5px'
  },
  buttonGroup: {
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
  }
};