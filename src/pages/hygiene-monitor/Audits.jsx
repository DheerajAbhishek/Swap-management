import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { hygieneMonitorService } from '../../services/hygieneMonitorService';

/**
 * HygieneMonitorAudits - View franchise audits for assigned franchises
 */
export default function HygieneMonitorAudits() {
  const [searchParams] = useSearchParams();
  const [franchises, setFranchises] = useState([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(searchParams.get('franchise_id') || '');
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState(null);

  useEffect(() => {
    loadFranchises();
  }, []);

  useEffect(() => {
    if (selectedFranchiseId) {
      loadAudits();
    }
  }, [selectedFranchiseId]);

  const loadFranchises = async () => {
    try {
      setLoading(true);
      const data = await hygieneMonitorService.getAssignedFranchises();
      setFranchises(data);

      // Auto-select first franchise if none selected
      if (!selectedFranchiseId && data.length > 0) {
        setSelectedFranchiseId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load franchises:', err);
      alert('Failed to load franchises: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAudits = async () => {
    try {
      setLoading(true);
      const params = { franchise_id: selectedFranchiseId };
      const data = await hygieneMonitorService.getAudits(params);
      setAudits(data);
    } catch (err) {
      console.error('Failed to load audits:', err);
      alert('Failed to load audits: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!audits || audits.length === 0) {
      return { totalAudits: 0, avgScore: 0, passCount: 0, failCount: 0 };
    }

    let totalScore = 0;
    let passCount = 0;
    let failCount = 0;

    audits.forEach(audit => {
      totalScore += audit.total_score || 0;
      if ((audit.total_score || 0) >= 70) passCount++;
      else failCount++;
    });

    return {
      totalAudits: audits.length,
      avgScore: totalScore / audits.length,
      passCount,
      failCount
    };
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#d97706';
    return '#dc2626';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return '#d1fae5';
    if (score >= 60) return '#fef3c7';
    return '#fee2e2';
  };

  const stats = calculateStats();
  const selectedFranchise = franchises.find(f => f.id === selectedFranchiseId);

  if (loading && audits.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ color: '#6b7280', fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 24, marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Franchise Audits
          </h1>
          <p style={{ color: '#6b7280', marginTop: 4, margin: 0 }}>
            Monitor franchise audit compliance and scores
          </p>
        </div>

        {/* Filters */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>
                Franchise
              </label>
              <select
                value={selectedFranchiseId}
                onChange={(e) => setSelectedFranchiseId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
              >
                <option value="">Select franchise</option>
                {franchises.map(franchise => (
                  <option key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!selectedFranchiseId ? (
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 48, textAlign: 'center', color: '#6b7280' }}>
            Please select a franchise to view audits
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 16 }}>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Total Audits</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginTop: 4, margin: 0 }}>
                  {stats.totalAudits}
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 16 }}>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Average Score</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: getScoreColor(stats.avgScore), marginTop: 4, margin: 0 }}>
                  {stats.avgScore.toFixed(1)}%
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 16 }}>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Passed (≥70%)</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginTop: 4, margin: 0 }}>
                  {stats.passCount}
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: 16 }}>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Failed (&lt;70%)</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginTop: 4, margin: 0 }}>
                  {stats.failCount}
                </p>
              </div>
            </div>

            {/* Audits List */}
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', margin: 0 }}>
                  Audit History - {selectedFranchise?.name}
                </h2>
              </div>

              {audits.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
                  No audit records found for this franchise
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb' }}>
                      <tr>
                        <th style={thStyle}>Audit Date</th>
                        <th style={thStyle}>Auditor</th>
                        <th style={thStyle}>Total Score</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Actions</th>
                      </tr>
                    </thead>
                    <tbody style={{ background: 'white' }}>
                      {audits.map((audit, idx) => (
                        <tr key={audit.id} style={{ borderBottom: idx < audits.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          <td style={tdStyle}>
                            <div style={{ fontSize: 14, color: '#1f2937' }}>
                              {new Date(audit.audit_date).toLocaleDateString()}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontSize: 14, color: '#1f2937' }}>{audit.auditor_name || 'N/A'}</div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: getScoreColor(audit.total_score || 0) }}>
                              {(audit.total_score || 0).toFixed(1)}%
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '4px 8px',
                              fontSize: 12,
                              borderRadius: 4,
                              background: (audit.total_score || 0) >= 80 ? '#d1fae5' : (audit.total_score || 0) >= 60 ? '#fef3c7' : '#fee2e2',
                              color: (audit.total_score || 0) >= 80 ? '#065f46' : (audit.total_score || 0) >= 60 ? '#92400e' : '#991b1b'
                            }}>
                              {(audit.total_score || 0) >= 70 ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <button
                              onClick={() => setSelectedAudit(audit)}
                              style={{ color: '#2563eb', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={(e) => e.target.style.color = '#1e40af'}
                              onMouseLeave={(e) => e.target.style.color = '#2563eb'}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Audit Details Modal */}
        {selectedAudit && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: 896, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: 24, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1f2937', margin: 0 }}>Audit Details</h2>
                <button
                  onClick={() => setSelectedAudit(null)}
                  style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = '#4b5563'}
                  onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
                >
                  <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div style={{ padding: 24 }}>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
                  <div>
                    <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Audit Date</p>
                    <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>
                      {new Date(selectedAudit.audit_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Auditor</p>
                    <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{selectedAudit.auditor_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Total Score</p>
                    <p style={{ fontSize: 24, fontWeight: 700, color: getScoreColor(selectedAudit.total_score || 0), margin: 0 }}>
                      {(selectedAudit.total_score || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Status</p>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      fontSize: 14,
                      borderRadius: 4,
                      marginTop: 4,
                      background: (selectedAudit.total_score || 0) >= 70 ? '#d1fae5' : '#fee2e2',
                      color: (selectedAudit.total_score || 0) >= 70 ? '#065f46' : '#991b1b'
                    }}>
                      {(selectedAudit.total_score || 0) >= 70 ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>

                {/* Scores Breakdown */}
                {selectedAudit.scores && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Score Breakdown</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(selectedAudit.scores).map(([category, score]) => (
                        <div key={category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{category.replace(/_/g, ' ')}</span>
                          <span style={{ fontSize: 18, fontWeight: 700, color: getScoreColor(score) }}>{score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues */}
                {selectedAudit.issues && selectedAudit.issues.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Issues Found</h3>
                    <ul style={{ listStyleType: 'disc', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 4, color: '#374151' }}>
                      {selectedAudit.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Remarks */}
                {selectedAudit.remarks && (
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Remarks</h3>
                    <p style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{selectedAudit.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '12px 24px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 500,
  color: '#6b7280',
  textTransform: 'uppercase'
};

const tdStyle = {
  padding: '16px 24px'
};
