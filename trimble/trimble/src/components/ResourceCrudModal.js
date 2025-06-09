import React, { useState } from 'react';

export default function ResourceCrudModal({
  show, onClose, resourceType, resourceTabs, facilities, onUpdate, onDelete, onAdd
}) {
  const [tab, setTab] = useState(resourceType || 'shelter'); // default to shelter
  const [resourceName, setResourceName] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [editAttrs, setEditAttrs] = useState({});
  const [newAttr, setNewAttr] = useState({ key: '', value: '' });

  // Find resource in facilities array
  const handleSearch = () => {
    const found = facilities.find(
      f => f.type === tab && f.name.toLowerCase() === resourceName.toLowerCase()
    );
    if (found) {
      setSearchResult(found);
      setEditAttrs(found.attributes || {});
      setNotFound(false);
    } else {
      setSearchResult(null);
      setEditAttrs({});
      setNotFound(true);
    }
  };

  // Handle attribute value change
  const handleAttrChange = (key, value) => {
    setEditAttrs(prev => ({ ...prev, [key]: value }));
  };
  // Remove attribute
  const handleAttrRemove = key => {
    setEditAttrs(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };
  // Add new attribute
  const handleAddAttr = () => {
    if (newAttr.key) {
      setEditAttrs(prev => ({ ...prev, [newAttr.key]: newAttr.value }));
      setNewAttr({ key: '', value: '' });
    }
  };

  // Callbacks for CRUD
  const handleUpdate = () => {
    onUpdate({ ...searchResult, attributes: editAttrs });
    onClose();
  };
  const handleDelete = () => {
    onDelete(searchResult.id);
    onClose();
  };
  const handleAdd = () => {
    onAdd({
      type: tab,
      name: resourceName,
      attributes: editAttrs
    });
    onClose();
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
    }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, minWidth: 350 }}>
        <h2>{resourceTabs[tab]} Management</h2>
        <div>
          <label>
            Resource Type:&nbsp;
            <select value={tab} onChange={e => setTab(e.target.value)}>
              {Object.entries(resourceTabs).map(([key, label]) =>
                <option key={key} value={key}>{label}</option>
              )}
            </select>
          </label>
        </div>
        <div style={{ margin: '12px 0' }}>
          <label>
            Resource Name:&nbsp;
            <input
              value={resourceName}
              onChange={e => setResourceName(e.target.value)}
              placeholder={`e.g. "zyx shelter"`}
            />
          </label>
          <button onClick={handleSearch} style={{ marginLeft: 8 }}>Search</button>
        </div>
        {searchResult &&
          <div style={{ margin: '10px 0 16px' }}>
            <h4>Attributes</h4>
            <ul style={{ paddingLeft: 0 }}>
              {Object.entries(editAttrs).map(([k, v]) =>
                <li key={k} style={{ marginBottom: 4, listStyle: 'none' }}>
                  <span style={{ marginRight: 10 }}>{k}:</span>
                  <input
                    value={v}
                    onChange={e => handleAttrChange(k, e.target.value)}
                    style={{ width: 80, marginRight: 5 }}
                  />
                  <button onClick={() => handleAttrRemove(k)}>Delete</button>
                </li>
              )}
            </ul>
            <div>
              <input
                placeholder="New attribute"
                value={newAttr.key}
                onChange={e => setNewAttr({ ...newAttr, key: e.target.value })}
                style={{ width: 80, marginRight: 4 }}
              />
              <input
                placeholder="Value"
                value={newAttr.value}
                onChange={e => setNewAttr({ ...newAttr, value: e.target.value })}
                style={{ width: 60, marginRight: 4 }}
              />
              <button onClick={handleAddAttr}>Add</button>
            </div>
            <div style={{ marginTop: 14 }}>
              <button onClick={handleUpdate}>Update</button>
              <button onClick={handleDelete} style={{ marginLeft: 10, color: 'red' }}>Delete</button>
            </div>
          </div>
        }
        {notFound &&
          <div style={{ margin: '10px 0' }}>
            <span style={{ color: '#e74c3c' }}>That {resourceTabs[tab]} does not exist.</span>
            <div style={{ marginTop: 10 }}>
              <h4>Add new attributes</h4>
              <ul style={{ paddingLeft: 0 }}>
                {Object.entries(editAttrs).map(([k, v]) =>
                  <li key={k} style={{ marginBottom: 4, listStyle: 'none' }}>
                    <span style={{ marginRight: 10 }}>{k}:</span>
                    <input
                      value={v}
                      onChange={e => handleAttrChange(k, e.target.value)}
                      style={{ width: 80, marginRight: 5 }}
                    />
                    <button onClick={() => handleAttrRemove(k)}>Delete</button>
                  </li>
                )}
              </ul>
              <div>
                <input
                  placeholder="New attribute"
                  value={newAttr.key}
                  onChange={e => setNewAttr({ ...newAttr, key: e.target.value })}
                  style={{ width: 80, marginRight: 4 }}
                />
                <input
                  placeholder="Value"
                  value={newAttr.value}
                  onChange={e => setNewAttr({ ...newAttr, value: e.target.value })}
                  style={{ width: 60, marginRight: 4 }}
                />
                <button onClick={handleAddAttr}>Add</button>
              </div>
              <button onClick={handleAdd} style={{ marginTop: 10 }}>Add {resourceTabs[tab]}</button>
            </div>
          </div>
        }
        <button onClick={onClose} style={{ marginTop: 14 }}>Close</button>
      </div>
    </div>
  );
}