import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dailyReportService } from '../../services/dailyReportService';
import { franchiseService } from '../../services/franchiseService';
import { formatCurrency } from '../../utils/constants';

/**
 * DailyReports - View daily finance summaries for admin
 */
export default function DailyReports() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  // Get first day of current month
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  const defaultStartDate = firstDayOfMonth.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(today);
  const [selectedFranchise, setSelectedFranchise] = useState('');
  const [franchises, setFranchises] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load franchises list for filter
  useEffect(() => {
    const loadFranchises = async () => {
      try {
        const data = await franchiseService.getFranchises();
        setFranchises(data);
      } catch (err) {
        console.error('Failed to load franchises:', err);
      }
    };
    if (user?.role === 'ADMIN') {
      loadFranchises();
    }
  }, [user]);

  // Load reports
  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dailyReportService.getDailyReports(startDate, endDate, selectedFranchise || undefined);
      // Sort by date descending
      const sorted = data.sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
      setReports(sorted);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [startDate, endDate, selectedFranchise]);

  // Calculate totals
  const totals = reports.reduce((acc, report) => ({
    sales: acc.sales + (report.sales || 0),
    bill_total: acc.bill_total + (report.bill_total || 0),
    closing_total: acc.closing_total + (report.closing_total || 0),
    wastage_total: acc.wastage_total + (report.wastage_total || 0),
    gst: acc.gst + (report.gst || 0),
    royalty: acc.royalty + (report.royalty || 0),
    net_pay: acc.net_pay + (report.net_pay || 0)
  }), {
    sales: 0, bill_total: 0, closing_total: 0, wastage_total: 0, gst: 0, royalty: 0, net_pay: 0
  });

  const avgCogsPercent = totals.sales > 0
    ? ((totals.bill_total - totals.closing_total - totals.wastage_total) / totals.sales) * 100
    : 0;

  const styles = {
    container: { padding: 0 },
    header: { marginBottom: 24 },
    title: { fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 },
    subtitle: { color: '#6b7280', marginTop: 4 },
    card: {
      background: 'white',
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    },
    filtersRow: {
      display: 'flex',
      gap: 16,
      alignItems: 'flex-end',
      flexWrap: 'wrap'
    },
    filterGroup: { flex: 1, minWidth: 150 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 },
    input: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      fontSize: 14,
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      fontSize: 14,
      boxSizing: 'border-box',
      background: 'white'
    },
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 16
    },
    summaryCard: (color) => ({
      background: `${color}15`,
      borderRadius: 12,
      padding: 16,
      textAlign: 'center',
      border: `1px solid ${color}30`
    }),
    summaryLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
    summaryValue: (color) => ({ fontSize: 20, fontWeight: 700, color }),
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: 12,
      fontWeight: 600,
      color: '#6b7280',
      textTransform: 'uppercase',
      borderBottom: '2px solid #e5e7eb',
      background: '#f9fafb'
    },
    td: {
      padding: '14px 16px',
      fontSize: 14,
      borderBottom: '1px solid #f3f4f6'
    },
    noData: {
      textAlign: 'center',
      padding: 40,
      color: '#9ca3af'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Daily Finance Reports</h1>
        <p style={styles.subtitle}>View daily sales, COGS, and financial summaries</p>
      </div>

      {/* Filters */}
      <div style={styles.card}>
        <div style={styles.filtersRow}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
              style={styles.input}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.label}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={today}
              style={styles.input}
            />
          </div>
          {user?.role === 'ADMIN' && (
            <div style={{ ...styles.filterGroup, flex: 2 }}>
              <label style={styles.label}>Franchise</label>
              <select
                value={selectedFranchise}
                onChange={(e) => setSelectedFranchise(e.target.value)}
                style={styles.select}
              >
                <option value="">All Franchises</option>
                {franchises.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Period Summary</h3>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard('#22c55e')}>
            <div style={styles.summaryLabel}>Total Sales</div>
            <div style={styles.summaryValue('#16a34a')}>{formatCurrency(totals.sales)}</div>
          </div>
          <div style={styles.summaryCard('#3b82f6')}>
            <div style={styles.summaryLabel}>Total Bill</div>
            <div style={styles.summaryValue('#2563eb')}>{formatCurrency(totals.bill_total)}</div>
          </div>
          <div style={styles.summaryCard('#10b981')}>
            <div style={styles.summaryLabel}>Closing Value</div>
            <div style={styles.summaryValue('#059669')}>{formatCurrency(totals.closing_total)}</div>
          </div>
          <div style={styles.summaryCard('#ef4444')}>
            <div style={styles.summaryLabel}>Wastage</div>
            <div style={styles.summaryValue('#dc2626')}>{formatCurrency(totals.wastage_total)}</div>
          </div>
          <div style={styles.summaryCard('#f59e0b')}>
            <div style={styles.summaryLabel}>Avg COGS%</div>
            <div style={styles.summaryValue('#d97706')}>{avgCogsPercent.toFixed(1)}%</div>
          </div>
          <div style={styles.summaryCard('#8b5cf6')}>
            <div style={styles.summaryLabel}>GST (5%)</div>
            <div style={styles.summaryValue('#7c3aed')}>{formatCurrency(totals.gst)}</div>
          </div>
          <div style={styles.summaryCard('#ec4899')}>
            <div style={styles.summaryLabel}>Royalty</div>
            <div style={styles.summaryValue('#db2777')}>{formatCurrency(totals.royalty)}</div>
          </div>
          <div style={styles.summaryCard('#0ea5e9')}>
            <div style={styles.summaryLabel}>Net Pay</div>
            <div style={styles.summaryValue('#0284c7')}>{formatCurrency(totals.net_pay)}</div>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div style={styles.card}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>
          Daily Reports ({reports.length} records)
        </h3>

        {loading ? (
          <div style={styles.noData}>Loading...</div>
        ) : error ? (
          <div style={{ ...styles.noData, color: '#dc2626' }}>{error}</div>
        ) : reports.length === 0 ? (
          <div style={styles.noData}>No reports found for the selected period</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  {user?.role === 'ADMIN' && <th style={styles.th}>Franchise</th>}
                  <th style={{ ...styles.th, textAlign: 'right' }}>Sales</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Bill</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Closing</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Wastage</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>COGS%</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>GST</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Royalty</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, idx) => (
                  <tr key={`${report.franchise_id}-${report.report_date}`} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600 }}>
                        {new Date(report.report_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </td>
                    {user?.role === 'ADMIN' && (
                      <td style={styles.td}>{report.franchise_name || 'N/A'}</td>
                    )}
                    <td style={{ ...styles.td, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                      {formatCurrency(report.sales)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#2563eb' }}>
                      {formatCurrency(report.bill_total)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#059669' }}>
                      {formatCurrency(report.closing_total)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#dc2626' }}>
                      {formatCurrency(report.wastage_total)}
                    </td>
                    <td style={{
                      ...styles.td,
                      textAlign: 'right',
                      color: (report.cogs_percent || 0) > 35 ? '#dc2626' : '#d97706',
                      fontWeight: 600
                    }}>
                      {(report.cogs_percent || 0).toFixed(1)}%
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {formatCurrency(report.gst)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {formatCurrency(report.royalty)}
                    </td>
                    <td style={{
                      ...styles.td,
                      textAlign: 'right',
                      fontWeight: 600,
                      color: (report.net_pay || 0) >= 0 ? '#0284c7' : '#dc2626'
                    }}>
                      {formatCurrency(report.net_pay)}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr style={{ background: '#f3f4f6', fontWeight: 700 }}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>TOTAL</td>
                  {user?.role === 'ADMIN' && <td style={styles.td}>-</td>}
                  <td style={{ ...styles.td, textAlign: 'right', color: '#16a34a' }}>
                    {formatCurrency(totals.sales)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#2563eb' }}>
                    {formatCurrency(totals.bill_total)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#059669' }}>
                    {formatCurrency(totals.closing_total)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#dc2626' }}>
                    {formatCurrency(totals.wastage_total)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', color: '#d97706' }}>
                    {avgCogsPercent.toFixed(1)}%
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    {formatCurrency(totals.gst)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    {formatCurrency(totals.royalty)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', color: totals.net_pay >= 0 ? '#0284c7' : '#dc2626' }}>
                    {formatCurrency(totals.net_pay)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
