import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vendorService } from '../../services/vendorService';

/**
 * VendorItems - Manage items for a specific vendor
 * Each vendor has custom items with vendor_price and franchise_price
 */
export default function VendorItems() {
    const { vendorId } = useParams();
    const navigate = useNavigate();

    const [vendor, setVendor] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newItems, setNewItems] = useState([{ name: '', category: '', unit: 'kg', vendor_price: '' }]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    useEffect(() => {
        loadVendor();
    }, [vendorId]);

    const loadVendor = async () => {
        try {
            setLoading(true);
            const data = await vendorService.getVendor(vendorId);
            setVendor(data);
            setItems(data.items || []);
        } catch (err) {
            console.error('Failed to load vendor:', err);
            alert('Failed to load vendor data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        const validItems = newItems.filter(item => item.name && item.vendor_price);
        if (validItems.length === 0) {
            alert('Please fill in at least one item with name and vendor price');
            return;
        }

        setSaving(true);
        try {
            if (validItems.length === 1) {
                const addedItem = await vendorService.addVendorItem(vendorId, validItems[0]);
                setItems([...items, addedItem]);
            } else {
                const result = await vendorService.addBulkVendorItems(vendorId, validItems);
                setItems([...items, ...result.added]);
            }
            setNewItems([{ name: '', category: '', unit: 'kg', vendor_price: '' }]);
            setShowAddForm(false);
        } catch (err) {
            alert('Failed to add item(s): ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const updateNewItem = (index, field, value) => {
        setNewItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const addNewRow = () => {
        setNewItems(prev => [...prev, { name: '', category: '', unit: 'kg', vendor_price: '' }]);
    };

    const removeNewRow = (index) => {
        if (newItems.length <= 1) return;
        setNewItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            await vendorService.updateVendorItem(vendorId, editingId, editForm);
            setItems(items.map(item => item.id === editingId ? { ...item, ...editForm } : item));
            setEditingId(null);
            setEditForm({});
        } catch (err) {
            alert('Failed to update item: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (itemId) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            await vendorService.deleteVendorItem(vendorId, itemId);
            setItems(items.filter(item => item.id !== itemId));
        } catch (err) {
            alert('Failed to delete item: ' + err.message);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    // Get unique categories
    const categories = [...new Set(items.map(item => item.category).filter(Boolean))];

    // Filter items
    const filteredItems = items.filter(item => {
        const matchesSearch = !searchTerm ||
            item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !filterCategory || item.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <button
                    onClick={() => navigate('/admin/vendors')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginBottom: 8,
                        fontSize: 14
                    }}
                >
                    ← Back to Vendors
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                            {vendor?.name} - Item List
                        </h1>
                        <p style={{ color: '#6b7280', marginTop: 4 }}>
                            Manage items and prices for this vendor • {items.length} items
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#10b981',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        + Add Item
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 16,
                background: '#eff6ff',
                borderRadius: 12,
                marginBottom: 24,
                border: '1px solid #bfdbfe'
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span style={{ fontSize: 14, color: '#1e40af' }}>
                    <strong>Vendor Price</strong> - This is the cost price the kitchen/vendor charges.
                    Franchise prices are set separately in Franchise Management.
                </span>
            </div>

            {/* Search and Filter */}
            <div style={{
                display: 'flex',
                gap: 16,
                marginBottom: 24,
                flexWrap: 'wrap'
            }}>
                <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 14,
                        minWidth: 250
                    }}
                />
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 14,
                        background: 'white'
                    }}
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Add Items Form */}
            {showAddForm && (
                <div style={{
                    background: '#f0fdf4',
                    borderRadius: 12,
                    padding: 24,
                    marginBottom: 24,
                    border: '1px solid #86efac'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, color: '#166534' }}>Add Items</h3>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{newItems.length} item{newItems.length > 1 ? 's' : ''}</span>
                    </div>

                    {newItems.map((item, idx) => (
                        <div key={idx} style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1.5fr 100px 120px 40px',
                            gap: 12,
                            marginBottom: 10,
                            alignItems: 'end'
                        }}>
                            <div>
                                {idx === 0 && <label style={labelStyle}>Item Name *</label>}
                                <input
                                    value={item.name}
                                    onChange={(e) => updateNewItem(idx, 'name', e.target.value)}
                                    style={inputStyle}
                                    placeholder="e.g., Paneer"
                                />
                            </div>
                            <div>
                                {idx === 0 && <label style={labelStyle}>Category</label>}
                                <input
                                    value={item.category}
                                    onChange={(e) => updateNewItem(idx, 'category', e.target.value)}
                                    style={inputStyle}
                                    placeholder="e.g., Dairy"
                                    list="categories"
                                />
                                <datalist id="categories">
                                    {categories.map(cat => <option key={cat} value={cat} />)}
                                </datalist>
                            </div>
                            <div>
                                {idx === 0 && <label style={labelStyle}>Unit</label>}
                                <select
                                    value={item.unit}
                                    onChange={(e) => updateNewItem(idx, 'unit', e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="L">L</option>
                                    <option value="ml">ml</option>
                                    <option value="pcs">pcs</option>
                                    <option value="dozen">dozen</option>
                                    <option value="pack">pack</option>
                                    <option value="box">box</option>
                                </select>
                            </div>
                            <div>
                                {idx === 0 && <label style={labelStyle}>Price (₹) *</label>}
                                <input
                                    type="number"
                                    value={item.vendor_price}
                                    onChange={(e) => updateNewItem(idx, 'vendor_price', e.target.value)}
                                    style={inputStyle}
                                    placeholder="Cost"
                                    min="0"
                                />
                            </div>
                            <div>
                                {idx === 0 && <label style={{ ...labelStyle, visibility: 'hidden' }}>X</label>}
                                <button
                                    onClick={() => removeNewRow(idx)}
                                    disabled={newItems.length <= 1}
                                    style={{
                                        width: 36,
                                        height: 38,
                                        borderRadius: 8,
                                        border: '1px solid #fca5a5',
                                        background: newItems.length <= 1 ? '#f9fafb' : '#fef2f2',
                                        color: newItems.length <= 1 ? '#d1d5db' : '#dc2626',
                                        cursor: newItems.length <= 1 ? 'default' : 'pointer',
                                        fontSize: 18,
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Remove row"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                        <button
                            onClick={addNewRow}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: '1px dashed #86efac',
                                background: '#f0fdf4',
                                color: '#166534',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            + Add Another Row
                        </button>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => { setShowAddForm(false); setNewItems([{ name: '', category: '', unit: 'kg', vendor_price: '' }]); }}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 8,
                                    border: '1px solid #d1d5db',
                                    background: 'white',
                                    color: '#6b7280',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddItem}
                                disabled={saving}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: saving ? '#9ca3af' : '#10b981',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: saving ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {saving ? 'Adding...' : `Add ${newItems.filter(i => i.name && i.vendor_price).length} Item${newItems.filter(i => i.name && i.vendor_price).length !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Items Table */}
            <div style={{
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb' }}>
                            <th style={thStyle}>Item Name</th>
                            <th style={thStyle}>Category</th>
                            <th style={thStyle}>Unit</th>
                            <th style={{ ...thStyle, textAlign: 'right', color: '#3b82f6' }}>Vendor Price</th>
                            <th style={{ ...thStyle, width: 120 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ ...tdStyle, textAlign: 'center', color: '#6b7280', padding: 40 }}>
                                    {items.length === 0 ? 'No items added yet' : 'No items match your search'}
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    {editingId === item.id ? (
                                        <>
                                            <td style={tdStyle}>
                                                <input
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                    style={tableInputStyle}
                                                />
                                            </td>
                                            <td style={tdStyle}>
                                                <input
                                                    value={editForm.category || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                                    style={tableInputStyle}
                                                    list="edit-categories"
                                                />
                                                <datalist id="edit-categories">
                                                    {categories.map(cat => <option key={cat} value={cat} />)}
                                                </datalist>
                                            </td>
                                            <td style={tdStyle}>
                                                <select
                                                    value={editForm.unit}
                                                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                                    style={tableInputStyle}
                                                >
                                                    <option value="kg">kg</option>
                                                    <option value="g">g</option>
                                                    <option value="L">L</option>
                                                    <option value="ml">ml</option>
                                                    <option value="pcs">pcs</option>
                                                    <option value="dozen">dozen</option>
                                                    <option value="pack">pack</option>
                                                    <option value="box">box</option>
                                                </select>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <input
                                                    type="number"
                                                    value={editForm.vendor_price}
                                                    onChange={(e) => setEditForm({ ...editForm, vendor_price: e.target.value })}
                                                    style={{ ...tableInputStyle, width: 100, textAlign: 'right' }}
                                                    min="0"
                                                />
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={handleSaveEdit} disabled={saving} style={saveBtnStyle}>
                                                        {saving ? '...' : 'Save'}
                                                    </button>
                                                    <button onClick={() => { setEditingId(null); setEditForm({}); }} style={cancelBtnStyle}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td style={tdStyle}>
                                                <span style={{ fontWeight: 600, color: '#1f2937' }}>{item.name}</span>
                                            </td>
                                            <td style={tdStyle}>
                                                {item.category && (
                                                    <span style={{
                                                        background: '#f3f4f6',
                                                        padding: '2px 8px',
                                                        borderRadius: 4,
                                                        fontSize: 12
                                                    }}>
                                                        {item.category}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={tdStyle}>{item.unit}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#3b82f6' }}>
                                                {formatCurrency(item.vendor_price)}
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => handleEdit(item)} style={editBtnStyle}>Edit</button>
                                                    <button onClick={() => handleDelete(item.id)} style={deleteBtnStyle}>Delete</button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            {items.length > 0 && (
                <div style={{
                    marginTop: 24,
                    padding: 16,
                    background: '#f9fafb',
                    borderRadius: 12,
                    display: 'flex',
                    gap: 24,
                    flexWrap: 'wrap'
                }}>
                    <div>
                        <span style={{ color: '#6b7280', fontSize: 13 }}>Total Items</span>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{items.length}</div>
                    </div>
                    <div>
                        <span style={{ color: '#6b7280', fontSize: 13 }}>Categories</span>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>{categories.length}</div>
                    </div>
                    <div>
                        <span style={{ color: '#6b7280', fontSize: 13 }}>Avg Vendor Price</span>
                        <div style={{ fontWeight: 700, fontSize: 18, color: '#3b82f6' }}>
                            {formatCurrency(items.reduce((sum, i) => sum + (i.vendor_price || 0), 0) / items.length)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Styles
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' };
const tableInputStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: '100%', boxSizing: 'border-box' };
const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 13 };
const tdStyle = { padding: '12px 16px', fontSize: 14 };
const editBtnStyle = { padding: '4px 12px', borderRadius: 6, border: 'none', background: '#dbeafe', color: '#2563eb', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const deleteBtnStyle = { padding: '4px 12px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const saveBtnStyle = { padding: '4px 12px', borderRadius: 6, border: 'none', background: '#d1fae5', color: '#059669', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const cancelBtnStyle = { padding: '4px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', color: '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
