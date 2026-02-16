import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { franchiseService } from '../../services/franchiseService';
import { vendorService } from '../../services/vendorService';

/**
 * FranchiseItems - Manage item prices for a specific franchise
 * Each franchise has custom prices they pay for items (regardless of vendor)
 */
export default function FranchiseItems() {
    const { franchiseId } = useParams();
    const navigate = useNavigate();

    const [franchise, setFranchise] = useState(null);
    const [items, setItems] = useState([]);
    const [vendorItems, setVendorItems] = useState([]); // Items from assigned vendor
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        category: '',
        unit: 'kg',
        price: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedImportItems, setSelectedImportItems] = useState([]);

    useEffect(() => {
        loadFranchise();
    }, [franchiseId]);

    const loadFranchise = async () => {
        try {
            setLoading(true);
            const data = await franchiseService.getFranchise(franchiseId);
            setFranchise(data);
            setItems(data.items || []);

            // Load vendor items if franchise has assigned vendor
            if (data.vendor_id) {
                try {
                    const vendorData = await vendorService.getVendor(data.vendor_id);
                    setVendorItems(vendorData.items || []);
                } catch (e) {
                    console.log('Could not load vendor items');
                }
            }
        } catch (err) {
            console.error('Failed to load franchise:', err);
            alert('Failed to load franchise data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.price) {
            alert('Please fill in item name and price');
            return;
        }

        setSaving(true);
        try {
            const addedItem = await franchiseService.addFranchiseItem(franchiseId, newItem);
            setItems([...items, addedItem]);
            setNewItem({ name: '', category: '', unit: 'kg', price: '' });
            setShowAddForm(false);
        } catch (err) {
            alert('Failed to add item: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            await franchiseService.updateFranchiseItem(franchiseId, editingId, editForm);
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
            await franchiseService.deleteFranchiseItem(franchiseId, itemId);
            setItems(items.filter(item => item.id !== itemId));
        } catch (err) {
            alert('Failed to delete item: ' + err.message);
        }
    };

    // Import items from vendor
    const handleImportFromVendor = async () => {
        if (selectedImportItems.length === 0) {
            alert('Please select at least one item to import');
            return;
        }

        setSaving(true);
        try {
            const itemsToAdd = selectedImportItems.map(vendorItem => ({
                name: vendorItem.name,
                category: vendorItem.category,
                unit: vendorItem.unit,
                price: vendorItem.franchise_price || vendorItem.vendor_price // Use franchise_price if available
            }));

            for (const item of itemsToAdd) {
                const addedItem = await franchiseService.addFranchiseItem(franchiseId, item);
                setItems(prev => [...prev, addedItem]);
            }

            setShowImportModal(false);
            setSelectedImportItems([]);
        } catch (err) {
            alert('Failed to import items: ' + err.message);
        } finally {
            setSaving(false);
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

    // Get vendor items not already in franchise
    const availableVendorItems = vendorItems.filter(
        vi => !items.some(fi => fi.name.toLowerCase() === vi.name.toLowerCase())
    );

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <button
                    onClick={() => navigate('/admin/franchises')}
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
                    ← Back to Franchises
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                            {franchise?.name} - Item Prices
                        </h1>
                        <p style={{ color: '#6b7280', marginTop: 4 }}>
                            Manage item prices for this franchise • {items.length} items
                            {franchise?.vendor_name && (
                                <span style={{ marginLeft: 8, color: '#f59e0b' }}>
                                    (Vendor: {franchise.vendor_name})
                                </span>
                            )}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {vendorItems.length > 0 && (
                            <button
                                onClick={() => setShowImportModal(true)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 8,
                                    border: '1px solid #3b82f6',
                                    background: '#eff6ff',
                                    color: '#3b82f6',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Import from Vendor
                            </button>
                        )}
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
            </div>

            {/* Info Banner */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 16,
                background: '#f0fdf4',
                borderRadius: 12,
                marginBottom: 24,
                border: '1px solid #bbf7d0'
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span style={{ fontSize: 14, color: '#166534' }}>
                    <strong>Franchise Price</strong> - This is the price the franchise pays when ordering items.
                    Set custom prices for each franchise regardless of which vendor supplies them.
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

            {/* Add Item Form */}
            {showAddForm && (
                <div style={{
                    background: '#f0fdf4',
                    borderRadius: 12,
                    padding: 24,
                    marginBottom: 24,
                    border: '1px solid #86efac'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#166534' }}>Add New Item</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <div>
                            <label style={labelStyle}>Item Name *</label>
                            <input
                                value={newItem.name}
                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                style={inputStyle}
                                placeholder="e.g., Paneer"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Category</label>
                            <input
                                value={newItem.category}
                                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                style={inputStyle}
                                placeholder="e.g., Dairy"
                                list="categories"
                            />
                            <datalist id="categories">
                                {categories.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                        <div>
                            <label style={labelStyle}>Unit</label>
                            <select
                                value={newItem.unit}
                                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
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
                            <label style={labelStyle}>Price (₹) *</label>
                            <input
                                type="number"
                                value={newItem.price}
                                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                style={inputStyle}
                                placeholder="Franchise pays this"
                                min="0"
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
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
                            {saving ? 'Adding...' : 'Add Item'}
                        </button>
                        <button
                            onClick={() => { setShowAddForm(false); setNewItem({ name: '', category: '', unit: 'kg', price: '' }); }}
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
                            <th style={{ ...thStyle, textAlign: 'right', color: '#10b981' }}>Price</th>
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
                                                    value={editForm.price}
                                                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
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
                                                <span style={{ fontWeight: 500 }}>{item.name}</span>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    background: '#f3f4f6',
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                    fontSize: 12
                                                }}>
                                                    {item.category || '-'}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>{item.unit}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: '#10b981',
                                                    fontSize: 15
                                                }}>
                                                    {formatCurrency(item.price)}
                                                </span>
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

            {/* Import from Vendor Modal */}
            {showImportModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 16,
                        padding: 24,
                        maxWidth: 600,
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h2 style={{ margin: '0 0 8px 0' }}>Import Items from Vendor</h2>
                        <p style={{ color: '#6b7280', marginBottom: 20 }}>
                            Select items from <strong>{franchise?.vendor_name}</strong> to import with custom prices
                        </p>

                        {availableVendorItems.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                                All vendor items have already been added
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                                {availableVendorItems.map(item => (
                                    <label
                                        key={item.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: 12,
                                            background: selectedImportItems.includes(item) ? '#f0fdf4' : '#f9fafb',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            border: selectedImportItems.includes(item) ? '1px solid #86efac' : '1px solid transparent'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedImportItems.includes(item)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedImportItems([...selectedImportItems, item]);
                                                } else {
                                                    setSelectedImportItems(selectedImportItems.filter(i => i.id !== item.id));
                                                }
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500 }}>{item.name}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                {item.category} • {item.unit}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>Vendor Price</div>
                                            <div style={{ fontWeight: 600 }}>{formatCurrency(item.vendor_price)}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setShowImportModal(false); setSelectedImportItems([]); }}
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
                                onClick={handleImportFromVendor}
                                disabled={saving || selectedImportItems.length === 0}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: saving || selectedImportItems.length === 0 ? '#9ca3af' : '#10b981',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: saving || selectedImportItems.length === 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {saving ? 'Importing...' : `Import ${selectedImportItems.length} Items`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' };
const tableInputStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 };
const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 13 };
const tdStyle = { padding: '12px 16px', fontSize: 14 };
const saveBtnStyle = { padding: '6px 12px', borderRadius: 6, border: 'none', background: '#10b981', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const cancelBtnStyle = { padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', color: '#6b7280', fontSize: 12, cursor: 'pointer' };
const editBtnStyle = { padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 12, cursor: 'pointer' };
const deleteBtnStyle = { padding: '6px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer' };
