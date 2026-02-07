import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { complaintService } from '../../services/complaintService';
import { vendorService } from '../../services/vendorService';

/**
 * Complaints - Franchise page to submit and track complaints
 */
export default function Complaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newComplaint, setNewComplaint] = useState({
    category: 'GENERAL',
    subject: '',
    description: '',
    priority: 'MEDIUM',
    vendor_id: '',
    order_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [complaintsData, vendorsData] = await Promise.all([
        complaintService.getComplaints().catch(() => []),
        vendorService.getVendors().catch(() => [])
      ]);
      setComplaints(Array.isArray(complaintsData) ? complaintsData : []);
      setVendors(Array.isArray(vendorsData) ? vendorsData : []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComplaint.subject || !newComplaint.description) {
      alert('Please fill in subject and description');
      return;
    }
    setSubmitting(true);
    try {
      // Add vendor name if vendor selected
      const vendor = vendors.find(v => v.id === newComplaint.vendor_id);
      const complaintData = {
        ...newComplaint,
        vendor_name: vendor?.name || ''
      };
      await complaintService.createComplaint(complaintData);
      await loadData();
      setNewComplaint({
        category: 'GENERAL',
        subject: '',
        description: '',
        priority: 'MEDIUM',
        vendor_id: '',
        order_id: ''
      });
      setShowForm(false);
      alert('Complaint submitted successfully!');
    } catch (err) {
      alert('Failed to submit complaint: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'OPEN': { bg: '#fef3c7', text: '#d97706' },
      'IN_PROGRESS': { bg: '#dbeafe', text: '#2563eb' },
      'RESOLVED': { bg: '#d1fae5', text: '#059669' },
      'CLOSED': { bg: '#f3f4f6', text: '#6b7280' }
    };
    return colors[status] || colors['OPEN'];
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'LOW': { bg: '#f3f4f6', text: '#6b7280' },
      'MEDIUM': { bg: '#fef3c7', text: '#d97706' },
      'HIGH': { bg: '#fee2e2', text: '#dc2626' },
      'URGENT': { bg: '#dc2626', text: '#ffffff' }
    };
    return colors[priority] || colors['MEDIUM'];
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'QUALITY': '⚠️',
      'DELIVERY': '🚚',
      'QUANTITY': '📦',
      'PACKAGING': '📋',
      'GENERAL': '💬'
    };
    return icons[category] || '💬';
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            My Complaints
          </h1>
          <p style={{ color: '#6b7280', marginTop: 4 }}>
            Submit and track your complaints
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#ef4444',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          + New Complaint
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: complaints.length, color: '#6366f1' },
          { label: 'Open', value: complaints.filter(c => c.status === 'OPEN').length, color: '#f59e0b' },
          { label: 'In Progress', value: complaints.filter(c => c.status === 'IN_PROGRESS').length, color: '#3b82f6' },
          { label: 'Resolved', value: complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length, color: '#10b981' }
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'white',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* New Complaint Form */}
      {showForm && (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '2px solid #ef4444'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: '#1f2937' }}>Submit New Complaint</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Category</label>
              <select
                value={newComplaint.category}
                onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                <option value="GENERAL">General</option>
                <option value="QUALITY">Quality Issue</option>
                <option value="DELIVERY">Delivery Issue</option>
                <option value="QUANTITY">Quantity Mismatch</option>
                <option value="PACKAGING">Packaging Issue</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Priority</label>
              <select
                value={newComplaint.priority}
                onChange={(e) => setNewComplaint({ ...newComplaint, priority: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Related Kitchen (Optional)</label>
              <select
                value={newComplaint.vendor_id}
                onChange={(e) => setNewComplaint({ ...newComplaint, vendor_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                <option value="">Select Kitchen...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Subject *</label>
            <input
              type="text"
              value={newComplaint.subject}
              onChange={(e) => setNewComplaint({ ...newComplaint, subject: e.target.value })}
              placeholder="Brief description of the issue"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Description *</label>
            <textarea
              value={newComplaint.description}
              onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
              placeholder="Provide detailed information about your complaint..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Order ID (Optional)</label>
            <input
              type="text"
              value={newComplaint.order_id}
              onChange={(e) => setNewComplaint({ ...newComplaint, order_id: e.target.value })}
              placeholder="Related order ID if applicable"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                background: submitting ? '#9ca3af' : '#ef4444',
                color: 'white',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#374151',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
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
            padding: 32,
            maxWidth: 600,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: getStatusColor(selectedComplaint.status).bg,
                    color: getStatusColor(selectedComplaint.status).text
                  }}>
                    {selectedComplaint.status.replace('_', ' ')}
                  </span>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: getPriorityColor(selectedComplaint.priority).bg,
                    color: getPriorityColor(selectedComplaint.priority).text
                  }}>
                    {selectedComplaint.priority}
                  </span>
                </div>
                <h2 style={{ margin: 0, color: '#1f2937' }}>{selectedComplaint.subject}</h2>
              </div>
              <button onClick={() => setSelectedComplaint(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 14 }}>
                <div><span style={{ color: '#6b7280' }}>Category:</span> <strong>{getCategoryIcon(selectedComplaint.category)} {selectedComplaint.category}</strong></div>
                <div><span style={{ color: '#6b7280' }}>Kitchen:</span> <strong>{selectedComplaint.vendor_name || 'N/A'}</strong></div>
                <div><span style={{ color: '#6b7280' }}>Order:</span> <strong>{selectedComplaint.order_number || selectedComplaint.order_id || 'N/A'}</strong></div>
                <div><span style={{ color: '#6b7280' }}>Submitted:</span> <strong>{new Date(selectedComplaint.created_at).toLocaleDateString()}</strong></div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>Description</h4>
              <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>{selectedComplaint.description}</p>
            </div>

            {/* Attachments/Images */}
            {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Attachments ({selectedComplaint.attachments.length})</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
                  {selectedComplaint.attachments.map((attachment, idx) => (
                    <div 
                      key={idx}
                      style={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(attachment.data, '_blank')}
                    >
                      <img
                        src={attachment.data}
                        alt={attachment.name || `Image ${idx + 1}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedComplaint.response && (
              <div style={{ background: '#ecfdf5', borderRadius: 12, padding: 16 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#059669' }}>Response from {selectedComplaint.responded_by}</h4>
                <p style={{ margin: 0, color: '#047857', lineHeight: 1.6 }}>{selectedComplaint.response}</p>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                  {selectedComplaint.responded_at && new Date(selectedComplaint.responded_at).toLocaleString()}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedComplaint(null)}
              style={{
                marginTop: 20,
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#6366f1',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Complaints List */}
      {complaints.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 60,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3 style={{ margin: 0, marginBottom: 8 }}>No Complaints Yet</h3>
          <p style={{ margin: 0 }}>You haven't submitted any complaints</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {complaints.map(complaint => (
            <div
              key={complaint.id}
              onClick={() => setSelectedComplaint(complaint)}
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: '1px solid #e5e7eb'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: getStatusColor(complaint.status).bg,
                      color: getStatusColor(complaint.status).text
                    }}>
                      {complaint.status.replace('_', ' ')}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: getPriorityColor(complaint.priority).bg,
                      color: getPriorityColor(complaint.priority).text
                    }}>
                      {complaint.priority}
                    </span>
                    <span style={{ fontSize: 11, color: '#6b7280', padding: '4px 0' }}>
                      {getCategoryIcon(complaint.category)} {complaint.category}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, marginBottom: 4, fontSize: 16, color: '#1f2937' }}>{complaint.subject}</h3>
                  <p style={{ margin: 0, fontSize: 14, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                    {complaint.description}
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af' }}>
                  {new Date(complaint.created_at).toLocaleDateString()}
                  {complaint.response && (
                    <div style={{ color: '#10b981', marginTop: 4 }}>✓ Responded</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
