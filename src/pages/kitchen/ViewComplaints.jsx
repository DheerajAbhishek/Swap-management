import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { complaintService } from '../../services/complaintService';

/**
 * ViewComplaints - Kitchen page to view and respond to complaints from their franchises
 */
export default function ViewComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '' });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [response, setResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const complaintsData = await complaintService.getComplaints().catch(() => []);
      setComplaints(Array.isArray(complaintsData) ? complaintsData : []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateComplaint = async () => {
    if (!newStatus && !response) {
      alert('Please provide a status or response');
      return;
    }
    setUpdating(true);
    try {
      const updateData = {};
      if (newStatus) updateData.status = newStatus;
      if (response) updateData.response = response;

      await complaintService.updateComplaint(selectedComplaint.id, updateData);
      await loadData();
      setSelectedComplaint(null);
      setResponse('');
      setNewStatus('');
    } catch (err) {
      alert('Failed to update complaint: ' + err.message);
    } finally {
      setUpdating(false);
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

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    if (filter.status && c.status !== filter.status) return false;
    return true;
  });

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Franchise Complaints
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          View and respond to complaints from your assigned franchises
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: complaints.length, color: '#6366f1' },
          { label: 'Open', value: complaints.filter(c => c.status === 'OPEN').length, color: '#f59e0b' },
          { label: 'In Progress', value: complaints.filter(c => c.status === 'IN_PROGRESS').length, color: '#3b82f6' },
          { label: 'Urgent', value: complaints.filter(c => c.priority === 'URGENT' && c.status === 'OPEN').length, color: '#dc2626' }
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

      {/* Filter */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        display: 'flex',
        gap: 16,
        alignItems: 'center'
      }}>
        <div>
          <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Filter by Status</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 14, color: '#6b7280' }}>
          Showing {filteredComplaints.length} of {complaints.length} complaints
        </div>
      </div>

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
            maxWidth: 700,
            width: '90%',
            maxHeight: '85vh',
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
              <button onClick={() => { setSelectedComplaint(null); setResponse(''); setNewStatus(''); }} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 14 }}>
                <div><span style={{ color: '#6b7280' }}>Franchise:</span> <strong>{selectedComplaint.franchise_name}</strong></div>
                <div><span style={{ color: '#6b7280' }}>Category:</span> <strong>{getCategoryIcon(selectedComplaint.category)} {selectedComplaint.category}</strong></div>
                <div><span style={{ color: '#6b7280' }}>Order:</span> <strong>{selectedComplaint.order_number || selectedComplaint.order_id || 'N/A'}</strong></div>
                <div><span style={{ color: '#6b7280' }}>Submitted:</span> <strong>{new Date(selectedComplaint.created_at).toLocaleString()}</strong></div>
                {selectedComplaint.created_by_name && (
                  <div><span style={{ color: '#6b7280' }}>Reported By:</span> <strong>{selectedComplaint.created_by_name} ({selectedComplaint.created_by_role})</strong></div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>Description</h4>
              <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6, background: '#f9fafb', padding: 16, borderRadius: 8 }}>{selectedComplaint.description}</p>
            </div>

            {/* Photos */}
            {((selectedComplaint.photos && selectedComplaint.photos.length > 0) || (selectedComplaint.attachments && selectedComplaint.attachments.length > 0)) && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Photos ({(selectedComplaint.photos || selectedComplaint.attachments || []).length})</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                  {(selectedComplaint.photos || []).map((photoUrl, idx) => (
                    <div
                      key={`photo-${idx}`}
                      style={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '2px solid #e5e7eb',
                        cursor: 'pointer',
                        background: '#f9fafb'
                      }}
                      onClick={() => window.open(photoUrl, '_blank')}
                    >
                      <img
                        src={photoUrl}
                        alt={`Photo ${idx + 1}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#9ca3af;font-size:12px;text-align:center;">📷<br/>Failed</div>';
                        }}
                      />
                    </div>
                  ))}
                  {(selectedComplaint.attachments || []).map((attachment, idx) => (
                    <div
                      key={`attach-${idx}`}
                      style={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '2px solid #e5e7eb',
                        cursor: 'pointer',
                        background: '#f9fafb'
                      }}
                      onClick={() => window.open(attachment.data, '_blank')}
                    >
                      <img
                        src={attachment.data}
                        alt={attachment.name || `Photo ${idx + 1}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#9ca3af;font-size:12px;text-align:center;">📷<br/>Failed</div>';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedComplaint.response && (
              <div style={{ background: '#ecfdf5', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#059669' }}>Previous Response from {selectedComplaint.responded_by}</h4>
                <p style={{ margin: 0, color: '#047857', lineHeight: 1.6 }}>{selectedComplaint.response}</p>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                  {selectedComplaint.responded_at && new Date(selectedComplaint.responded_at).toLocaleString()}
                </div>
              </div>
            )}

            {/* Response Form */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#374151' }}>Respond to Complaint</h4>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Update Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                >
                  <option value="">Keep Current Status</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Your Response</label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Write your response to this complaint..."
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleUpdateComplaint}
                  disabled={updating}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 8,
                    border: 'none',
                    background: updating ? '#9ca3af' : '#f59e0b',
                    color: 'white',
                    fontWeight: 600,
                    cursor: updating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {updating ? 'Updating...' : 'Send Response'}
                </button>
                <button
                  onClick={() => { setSelectedComplaint(null); setResponse(''); setNewStatus(''); }}
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
          </div>
        </div>
      )}

      {/* Complaints List */}
      {filteredComplaints.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 60,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
          <h3 style={{ margin: 0, marginBottom: 8 }}>No Complaints</h3>
          <p style={{ margin: 0 }}>No complaints from your franchises</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredComplaints.map(complaint => (
            <div
              key={complaint.id}
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: complaint.priority === 'URGENT' ? '2px solid #dc2626' : '1px solid #e5e7eb'
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
                  <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                    From: <strong>{complaint.franchise_name}</strong>
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                    {complaint.description}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    {new Date(complaint.created_at).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => { setSelectedComplaint(complaint); setNewStatus(complaint.status); }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#f59e0b',
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {complaint.response ? 'View / Update' : 'Respond'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
