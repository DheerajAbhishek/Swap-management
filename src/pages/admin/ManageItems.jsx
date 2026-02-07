import { useState, useEffect } from 'react';
import SearchableDropdown from '../../components/SearchableDropdown';
import StyledDropdown from '../../components/StyledDropdown';
import { CATEGORIES, DEFAULT_UOM_OPTIONS, formatCurrency } from '../../utils/constants';
import { categorizeItem, getCategories, getSubcategories } from '../../utils/categorizeItem';
import itemService from '../../services/itemService';

/**
 * Admin Manage Items - CRUD for items with pricing
 */
export default function ManageItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [autoSuggested, setAutoSuggested] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    subcategory: '',
    defaultUom: 'kg',
    standard_price: ''
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await itemService.getItems();
      setItems(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const categories = getCategories();
  const subcategories = newItem.category ? getSubcategories(newItem.category) : [];
  const editSubcategories = editingItem?.category ? getSubcategories(editingItem.category) : [];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Auto-categorize when item name changes
  const handleNameChange = (name) => {
    if (name.length >= 3) {
      const { category, subcategory } = categorizeItem(name);
      if (category && category !== 'Unknown') {
        setNewItem({
          ...newItem,
          name,
          category,
          subcategory: subcategory || ''
        });
        setAutoSuggested(true);
      } else {
        setNewItem({ ...newItem, name });
        setAutoSuggested(false);
      }
    } else {
      setNewItem({ ...newItem, name });
      setAutoSuggested(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.standard_price) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const item = {
        ...newItem,
        standard_price: parseFloat(newItem.standard_price)
      };
      await itemService.createItem(item);
      await fetchItems();
      setShowAddModal(false);
      setNewItem({ name: '', category: '', subcategory: '', defaultUom: 'kg', standard_price: '' });
      setAutoSuggested(false);
    } catch (err) {
      alert('Failed to add item: ' + err.message);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      await itemService.updateItem(editingItem.id, {
        ...editingItem,
        standard_price: parseFloat(editingItem.standard_price)
      });
      await fetchItems();
      setEditingItem(null);
    } catch (err) {
      alert('Failed to update item: ' + err.message);
    }
  };

  const handleDeleteItem = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await itemService.deleteItem(id);
        await fetchItems();
      } catch (err) {
        alert('Failed to delete item: ' + err.message);
      }
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading items...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Manage Items
          </h1>
          <p style={{ color: '#6b7280', marginTop: 4 }}>
            Add, edit, and set prices for items
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '12px 24px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          ➕ Add Item
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '2px solid #e5e7eb',
              fontSize: 14
            }}
          />
        </div>
        <div style={{ width: 200 }}>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '2px solid #e5e7eb',
              fontSize: 14
            }}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={thStyle}>Item Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Subcategory</th>
                <th style={thStyle}>UOM</th>
                <th style={thStyle}>Standard Price</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                  </td>
                  <td style={tdStyle}>{item.category}</td>
                  <td style={tdStyle}>{item.subcategory || '-'}</td>
                  <td style={tdStyle}>{item.defaultUom}</td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: '#059669' }}>
                      {formatCurrency(item.standard_price)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setEditingItem({ ...item })}
                        style={editBtnStyle}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        style={deleteBtnStyle}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
            No items found
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Add New Item</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Item Name *</label>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => handleNameChange(e.target.value)}
                style={inputStyle}
                placeholder="Enter item name (auto-categorize after 3 chars)"
              />
              {autoSuggested && newItem.category && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    background: '#d1fae5',
                    color: '#065f46',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    ✨ Auto-detected: {newItem.category} → {newItem.subcategory}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>Category *</label>
                {autoSuggested && (
                  <span style={{ fontSize: 11, color: '#6b7280' }}>(auto-suggested, can override)</span>
                )}
              </div>
              <StyledDropdown
                items={categories}
                selectedItem={newItem.category}
                onChange={(value) => {
                  setNewItem({ ...newItem, category: value, subcategory: '' });
                  setAutoSuggested(false);
                }}
                placeholder="Select category"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <StyledDropdown
                label="Subcategory"
                items={subcategories}
                selectedItem={newItem.subcategory}
                onChange={(value) => setNewItem({ ...newItem, subcategory: value })}
                placeholder="Select subcategory"
              />
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>UOM</label>
                <select
                  value={newItem.defaultUom}
                  onChange={(e) => setNewItem({ ...newItem, defaultUom: e.target.value })}
                  style={inputStyle}
                >
                  {DEFAULT_UOM_OPTIONS.map(uom => (
                    <option key={uom} value={uom}>{uom}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Standard Price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.standard_price}
                  onChange={(e) => setNewItem({ ...newItem, standard_price: e.target.value })}
                  style={inputStyle}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => {
                setShowAddModal(false);
                setNewItem({ name: '', category: '', subcategory: '', defaultUom: 'kg', standard_price: '' });
                setAutoSuggested(false);
              }} style={cancelBtnStyle}>
                Cancel
              </button>
              <button onClick={handleAddItem} style={saveBtnStyle}>
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Edit Item</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Item Name</label>
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => {
                  const name = e.target.value;
                  if (name.length >= 3) {
                    const { category, subcategory } = categorizeItem(name);
                    if (category && category !== 'Unknown') {
                      setEditingItem({ ...editingItem, name, category, subcategory: subcategory || '' });
                    } else {
                      setEditingItem({ ...editingItem, name });
                    }
                  } else {
                    setEditingItem({ ...editingItem, name });
                  }
                }}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Category</label>
              <select
                value={editingItem.category}
                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value, subcategory: '' })}
                style={inputStyle}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Subcategory</label>
              <select
                value={editingItem.subcategory || ''}
                onChange={(e) => setEditingItem({ ...editingItem, subcategory: e.target.value })}
                style={inputStyle}
              >
                <option value="">Select subcategory</option>
                {editSubcategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>UOM</label>
                <select
                  value={editingItem.defaultUom}
                  onChange={(e) => setEditingItem({ ...editingItem, defaultUom: e.target.value })}
                  style={inputStyle}
                >
                  {DEFAULT_UOM_OPTIONS.map(uom => (
                    <option key={uom} value={uom}>{uom}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Standard Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingItem.standard_price}
                  onChange={(e) => setEditingItem({ ...editingItem, standard_price: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setEditingItem(null)} style={cancelBtnStyle}>
                Cancel
              </button>
              <button onClick={handleUpdateItem} style={saveBtnStyle}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 13 };
const tdStyle = { padding: '12px 16px', fontSize: 14 };
const labelStyle = { display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151', fontSize: 13 };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContent = { background: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500 };
const editBtnStyle = { padding: '6px 12px', borderRadius: 6, border: 'none', background: '#dbeafe', color: '#1e40af', fontSize: 13, cursor: 'pointer' };
const deleteBtnStyle = { padding: '6px 12px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: 13, cursor: 'pointer' };
const cancelBtnStyle = { flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: '#e5e7eb', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const saveBtnStyle = { flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' };
