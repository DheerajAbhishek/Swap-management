import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dailyReportService } from '../../services/dailyReportService';
import { franchiseService } from '../../services/franchiseService';
import { orderService } from '../../services/orderService';
import { fetchRistaSales, formatSalesSummary } from '../../services/ristaSalesService';
import { getRistaBranchId } from '../../services/franchiseMappingService';
import { formatCurrency } from '../../utils/constants';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

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
  const [expandedRow, setExpandedRow] = useState(null);

  // Collapse states for sections
  const [showFormulas, setShowFormulas] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showTable, setShowTable] = useState(true);

  const dateRangeRef = useRef(null);
  const flatpickrInstance = useRef(null);

  // Initialize flatpickr date range picker
  useEffect(() => {
    if (dateRangeRef.current) {
      flatpickrInstance.current = flatpickr(dateRangeRef.current, {
        mode: 'range',
        dateFormat: 'Y-m-d',
        defaultDate: [defaultStartDate, today],
        maxDate: today,
        onChange: (selectedDates) => {
          if (selectedDates.length === 2) {
            setStartDate(flatpickrInstance.current.formatDate(selectedDates[0], 'Y-m-d'));
            setEndDate(flatpickrInstance.current.formatDate(selectedDates[1], 'Y-m-d'));
          }
        }
      });
    }
    return () => {
      if (flatpickrInstance.current) {
        flatpickrInstance.current.destroy();
      }
    };
  }, []);

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
      // 1. Fetch daily reports (has staff_sales, closing, wastage)
      const dailyReports = await dailyReportService.getDailyReports(
        startDate,
        endDate,
        selectedFranchise || undefined
      );

      // 1b. Fetch historical reports before startDate to correctly determine
      //     the opening for the first day of the selected range.
      //     We look back up to 90 days so the most recent closing is always found.
      const lookbackStart = new Date(startDate);
      lookbackStart.setDate(lookbackStart.getDate() - 90);
      const lookbackStartStr = lookbackStart.toISOString().split('T')[0];
      const dayBeforeRangeDate = new Date(startDate);
      dayBeforeRangeDate.setDate(dayBeforeRangeDate.getDate() - 1);
      const dayBeforeRangeStr = dayBeforeRangeDate.toISOString().split('T')[0];

      let historyReports = [];
      try {
        historyReports = await dailyReportService.getDailyReports(
          lookbackStartStr,
          dayBeforeRangeStr,
          selectedFranchise || undefined
        );
      } catch (err) {
        console.warn('Could not fetch historical reports for opening lookup:', err);
      }

      // 2. Fetch all orders to calculate bills by delivery_date
      const allOrders = await orderService.getOrders();
      const receivedOrders = allOrders.filter(o =>
        o.status === 'RECEIVED' || o.status === 'DELIVERED'
      );

      // 3. Get unique franchise+date combinations from daily reports
      const franchiseDateMap = new Map();

      for (const report of dailyReports) {
        const key = `${report.franchise_id}|${report.report_date}`;
        franchiseDateMap.set(key, {
          franchise_id: report.franchise_id,
          franchise_name: report.franchise_name,
          report_date: report.report_date,
          staff_sales: report.sales || 0,
          closing_total: report.closing_total || 0,
          wastage_total: report.wastage_total || 0,
          logistics: report.logistics || 0,
          closing_items: report.closing_items || [],
          wastage_items: report.wastage_items || []
        });
      }

      // 3.5. Build a lookup map for quick access to closings by franchise and date.
      //      Include historyReports (pre-range) so the first day of the selected
      //      range can find its correct opening (most recent closing before it).
      const closingLookup = new Map();
      for (const report of [...historyReports, ...dailyReports]) {
        const franchiseKey = `franchise_${report.franchise_id}`;
        if (!closingLookup.has(franchiseKey)) {
          closingLookup.set(franchiseKey, []);
        }
        if (report.closing_total !== undefined && report.closing_total !== null) {
          closingLookup.get(franchiseKey).push({
            date: report.report_date,
            closing: report.closing_total
          });
        }
      }

      // Sort each franchise's closings by date (descending)
      for (const [key, closings] of closingLookup.entries()) {
        closings.sort((a, b) => new Date(b.date) - new Date(a.date));
      }

      // 4. Calculate bills from orders by delivery_date (filter by date range and franchise)
      receivedOrders.forEach(order => {
        // Skip if outside date range
        if (order.delivery_date < startDate || order.delivery_date > endDate) {
          return;
        }

        // Skip if franchise filter is active and doesn't match
        if (selectedFranchise && order.franchise_id !== selectedFranchise) {
          return;
        }

        const key = `${order.franchise_id}|${order.delivery_date}`;
        if (franchiseDateMap.has(key)) {
          const data = franchiseDateMap.get(key);
          data.bill_total = (data.bill_total || 0) + (order.total_amount || 0);
        } else {
          // Order delivered on a date without a daily report
          // Create entry for it (closing/wastage will be 0)
          franchiseDateMap.set(key, {
            franchise_id: order.franchise_id,
            franchise_name: order.franchise_name,
            report_date: order.delivery_date,
            staff_sales: 0,
            closing_total: 0,
            wastage_total: 0,
            bill_total: order.total_amount || 0,
            closing_items: [],
            wastage_items: []
          });
        }
      });

      // 5. Fetch Rista sales for each franchise+date
      const enrichedReports = [];

      for (const [key, data] of franchiseDateMap.entries()) {
        let ristaSales = 0;

        try {
          // Get Rista branch ID for this franchise
          const ristaBranchId = await getRistaBranchId(data.franchise_id);

          if (ristaBranchId) {
            // Fetch sales for specific date
            const ristaData = await fetchRistaSales({
              branchId: ristaBranchId,
              startDate: data.report_date,
              endDate: data.report_date,
              channel: 'all',
              groupBy: 'total'
            });

            // Extract gross sale from response
            const formatted = formatSalesSummary(ristaData);
            ristaSales = formatted?.grossSale || 0;
          }
        } catch (err) {
          console.warn(`Failed to fetch Rista sales for ${data.franchise_name} on ${data.report_date}:`, err);
        }

        // Calculate opening (most recent closing before this date from cached data)
        let opening = 0;
        let openingDate = null;

        const franchiseKey = `franchise_${data.franchise_id}`;
        const franchiseClosings = closingLookup.get(franchiseKey) || [];

        // Find the most recent closing before this date
        for (const record of franchiseClosings) {
          if (record.date < data.report_date) {
            opening = record.closing;
            openingDate = record.date;
            break;
          }
        }

        // Use Rista sales if > 0, else staff sales
        const salesForCogs = ristaSales > 0 ? ristaSales : data.staff_sales;

        // Calculate COGS and other metrics
        const billTotal = data.bill_total || 0;
        const closingTotal = data.closing_total || 0;
        const wastageTotal = data.wastage_total || 0;
        const cogsPercent = salesForCogs > 0
          ? ((opening + billTotal - closingTotal - wastageTotal) / salesForCogs) * 100
          : 0;

        const gst = salesForCogs * 0.05;
        const royalty = (salesForCogs - gst) * 0.05; // 5% royalty
        const logistics = data.logistics || 0;
        const netPay = salesForCogs - gst - royalty - billTotal - logistics;

        enrichedReports.push({
          ...data,
          rista_sales: ristaSales,
          sales_for_cogs: salesForCogs,
          opening,
          opening_source_date: openingDate,
          cogs_percent: cogsPercent,
          gst,
          royalty,
          logistics,
          net_pay: netPay
        });
      }

      // Sort by date descending
      const sorted = enrichedReports.sort((a, b) =>
        new Date(b.report_date) - new Date(a.report_date)
      );

      setReports(sorted);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // No auto-load — user clicks "Get Report" to trigger

  // Calculate totals
  const totals = reports.reduce((acc, report) => ({
    staff_sales: acc.staff_sales + (report.staff_sales || 0),
    rista_sales: acc.rista_sales + (report.rista_sales || 0),
    sales_for_cogs: acc.sales_for_cogs + (report.sales_for_cogs || 0),
    bill_total: acc.bill_total + (report.bill_total || 0),
    closing_total: acc.closing_total + (report.closing_total || 0),
    wastage_total: acc.wastage_total + (report.wastage_total || 0),
    logistics: acc.logistics + (report.logistics || 0),
    gst: acc.gst + (report.gst || 0),
    royalty: acc.royalty + (report.royalty || 0),
    net_pay: acc.net_pay + (report.net_pay || 0)
  }), {
    staff_sales: 0,
    rista_sales: 0,
    sales_for_cogs: 0,
    bill_total: 0,
    closing_total: 0,
    wastage_total: 0,
    logistics: 0,
    gst: 0,
    royalty: 0,
    net_pay: 0
  });

  // Calculate period opening and closing for detailed breakdown
  const periodOpening = reports.length > 0
    ? reports[reports.length - 1]?.opening || 0  // First day's opening (reports sorted desc)
    : 0;
  const periodOpeningDate = reports.length > 0
    ? reports[reports.length - 1]?.opening_source_date
    : null;
  const periodClosing = reports.length > 0
    ? reports[0]?.closing_total || 0  // Last day's closing (reports sorted desc)
    : 0;
  const totalConsumed = periodOpening + totals.bill_total - periodClosing - totals.wastage_total;

  // COGS % = (Opening + Bills - Closing - Wastage) / Sales × 100
  // Uses periodOpening (first day's opening) and periodClosing (last day's closing),
  // NOT the sum of all daily closings.
  const avgCogsPercent = totals.sales_for_cogs > 0
    ? (totalConsumed / totals.sales_for_cogs) * 100
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
      {/* Fullscreen loading overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16
        }}>
          <div style={{
            width: 52,
            height: 52,
            border: '5px solid rgba(255,255,255,0.3)',
            borderTop: '5px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <div style={{ color: '#ffffff', fontSize: 16, fontWeight: 600 }}>Fetching reports…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Daily Finance Reports</h1>
        <p style={styles.subtitle}>View daily sales, COGS, and financial summaries</p>
      </div>

      {/* Filters */}
      <div style={styles.card}>
        <div style={styles.filtersRow}>
          <div style={{ ...styles.filterGroup, flex: 2 }}>
            <label style={styles.label}>📅 Date Range</label>
            <input
              ref={dateRangeRef}
              type="text"
              placeholder="Select date range"
              style={{
                ...styles.input,
                cursor: 'pointer',
                backgroundColor: 'white'
              }}
              readOnly
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
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={loadReports}
              disabled={loading}
              style={{
                padding: '10px 28px',
                background: loading ? '#93c5fd' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {loading ? 'Loading…' : '🔍 Get Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Formula Explanation */}
      <div style={styles.card}>
        <div
          onClick={() => setShowFormulas(!showFormulas)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            marginBottom: showFormulas ? 16 : 0
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1f2937' }}>
            📊 Calculation Formulas
          </h3>
          <span style={{
            fontSize: 20,
            color: '#3b82f6',
            transform: showFormulas ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>
            ▼
          </span>
        </div>
        {showFormulas && (
          <div style={{
            background: '#f9fafb',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Opening Stock
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace', background: 'white', padding: 8, borderRadius: 6 }}>
                  = Previous Day's Closing
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Bill Total
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace', background: 'white', padding: 8, borderRadius: 6 }}>
                  = Sum of orders by delivery_date
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  Sales Used
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace', background: 'white', padding: 8, borderRadius: 6 }}>
                  = Rista Sales (if {'>'} 0) OR Staff Sales
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#d97706', marginBottom: 8 }}>
                  COGS %
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace', background: 'white', padding: 8, borderRadius: 6 }}>
                  = (Opening + Bill - Closing - Wastage) / Sales × 100
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', marginBottom: 8 }}>
                  GST
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace', background: 'white', padding: 8, borderRadius: 6 }}>
                  = Sales × 5%
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#db2777', marginBottom: 8 }}>
                  Royalty
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace', background: 'white', padding: 8, borderRadius: 6 }}>
                  = (Sales - GST) × 5%
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>
                  Logistics
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace', background: 'white', padding: 8, borderRadius: 6 }}>
                  = Entered by staff daily
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0284c7', marginBottom: 8 }}>
                  Net Pay
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace', background: 'white', padding: 8, borderRadius: 6 }}>
                  = Sales - GST - Royalty - Bill - Logistics
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#fef3c7',
              borderRadius: 8,
              fontSize: 13,
              color: '#92400e',
              border: '1px solid #fde68a'
            }}>
              <strong>Note:</strong> For the selected period ({startDate} to {endDate}), calculations are performed for each day separately, then aggregated. Opening stock is fetched from the previous day's closing. Bills are filtered by delivery_date within the period.
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div style={styles.card}>
        <div
          onClick={() => setShowSummary(!showSummary)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            marginBottom: showSummary ? 16 : 0
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Period Summary</h3>
          <span style={{
            fontSize: 20,
            color: '#3b82f6',
            transform: showSummary ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>
            ▼
          </span>
        </div>
        {showSummary && (<>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard('#22c55e')}>
              <div style={styles.summaryLabel}>Staff Sales</div>
              <div style={styles.summaryValue('#16a34a')}>{formatCurrency(totals.staff_sales)}</div>
            </div>
            <div style={styles.summaryCard('#059669')}>
              <div style={styles.summaryLabel}>Rista Sales</div>
              <div style={styles.summaryValue('#047857')}>{formatCurrency(totals.rista_sales)}</div>
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
            <div style={styles.summaryCard('#f59e0b')}>
              <div style={styles.summaryLabel}>Logistics</div>
              <div style={styles.summaryValue('#d97706')}>{formatCurrency(totals.logistics)}</div>
            </div>
            <div style={styles.summaryCard('#0ea5e9')}>
              <div style={styles.summaryLabel}>Net Pay</div>
              <div style={styles.summaryValue('#0284c7')}>{formatCurrency(totals.net_pay)}</div>
            </div>
          </div>

          {/* Period Calculation Breakdown */}
          <div style={{
            marginTop: 24,
            padding: 20,
            background: '#f0f9ff',
            borderRadius: 12,
            border: '1px solid #bae6fd'
          }}>
            <div
              onClick={() => setShowBreakdown(!showBreakdown)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                marginBottom: showBreakdown ? 16 : 0
              }}
            >
              <h4 style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: '#0c4a6e',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span style={{ fontSize: 18 }}>🧮</span>
                Period Calculation Breakdown ({startDate} to {endDate})
              </h4>
              <span style={{
                fontSize: 16,
                color: '#0c4a6e',
                transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}>
                ▼
              </span>
            </div>
            {showBreakdown && (

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* Opening Stock */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid #e0f2fe'
                }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    Period Opening
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>
                    {formatCurrency(periodOpening)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    {periodOpeningDate ? (
                      <>
                        From closing on <strong>{new Date(periodOpeningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                      </>
                    ) : periodOpening > 0 ? (
                      'Opening at start of period'
                    ) : (
                      'No opening stock found'
                    )}
                  </div>
                </div>

                {/* Total Bills */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid #dbeafe'
                }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    Total Bills
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#2563eb', marginBottom: 8 }}>
                    {formatCurrency(totals.bill_total)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    Sum of all orders delivered during period
                  </div>
                </div>

                {/* Period Closing */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid #d1fae5'
                }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    Period Closing
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#059669', marginBottom: 8 }}>
                    {formatCurrency(periodClosing)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    Closing stock at end of period (last day's closing)
                  </div>
                </div>

                {/* Total Wastage */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid #fecaca'
                }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    Total Wastage
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>
                    {formatCurrency(totals.wastage_total)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    Sum of wastage across all days
                  </div>
                </div>

                {/* Total Consumed */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid #fed7aa'
                }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    Total Consumed
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#ea580c', marginBottom: 4 }}>
                    {formatCurrency(totalConsumed)}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginBottom: 8, background: '#fff7ed', padding: 6, borderRadius: 4 }}>
                    = {formatCurrency(periodOpening)} + {formatCurrency(totals.bill_total)}<br />
                    - {formatCurrency(periodClosing)} - {formatCurrency(totals.wastage_total)}
                  </div>
                </div>

                {/* Total Sales */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid #86efac'
                }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    Sales Used for COGS
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>
                    {formatCurrency(totals.sales_for_cogs)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, background: '#f0fdf4', padding: 6, borderRadius: 4, border: '1px solid #bbf7d0' }}>
                    Per day: Rista if {'>'} 0, else Staff<br />
                    <span style={{ fontSize: 10, color: '#16a34a' }}>
                      Total Rista: {formatCurrency(totals.rista_sales)}<br />
                      Total Staff: {formatCurrency(totals.staff_sales)}
                    </span>
                  </div>
                </div>

                {/* COGS Calculation */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '2px solid #fbbf24',
                  gridColumn: 'span 2'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#b45309', marginBottom: 8 }}>
                    📊 Avg COGS % Calculation
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace', marginBottom: 10, background: '#fffbeb', padding: 10, borderRadius: 6, lineHeight: 1.6 }}>
                    Total Consumed / Total Sales × 100<br />
                    = {formatCurrency(totalConsumed)} / {formatCurrency(totals.sales_for_cogs)} × 100<br />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>= {avgCogsPercent.toFixed(2)}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#78716c', background: '#fef3c7', padding: 8, borderRadius: 6, border: '1px solid #fde68a' }}>
                    <strong>Note:</strong> This is the aggregate COGS for the entire period, NOT the average of daily COGS percentages.
                  </div>
                </div>

                {/* GST Calculation */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid #e9d5ff'
                }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    Total GST (5%)
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>
                    {formatCurrency(totals.gst)}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', background: '#faf5ff', padding: 6, borderRadius: 4 }}>
                    = {formatCurrency(totals.sales_for_cogs)} × 5%
                  </div>
                </div>

                {/* Royalty Calculation */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid #fce7f3'
                }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    Total Royalty (5%)
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#db2777', marginBottom: 4 }}>
                    {formatCurrency(totals.royalty)}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', background: '#fdf2f8', padding: 6, borderRadius: 4 }}>
                    = ({formatCurrency(totals.sales_for_cogs)} - {formatCurrency(totals.gst)}) × 5%
                  </div>
                </div>

                {/* Total Logistics */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                    Total Logistics
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#d97706', marginBottom: 8 }}>
                    {formatCurrency(totals.logistics)}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    Sum of logistics costs across all days
                  </div>
                </div>

                {/* Net Pay Calculation */}
                <div style={{
                  background: 'white',
                  borderRadius: 8,
                  padding: 14,
                  border: '2px solid #0ea5e9',
                  gridColumn: 'span 2'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0c4a6e', marginBottom: 8 }}>
                    💰 Net Pay Calculation
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace', marginBottom: 4, background: '#f0f9ff', padding: 10, borderRadius: 6, lineHeight: 1.6 }}>
                    Sales - GST - Royalty - Bills - Logistics<br />
                    = {formatCurrency(totals.sales_for_cogs)} - {formatCurrency(totals.gst)} - {formatCurrency(totals.royalty)} - {formatCurrency(totals.bill_total)} - {formatCurrency(totals.logistics)}<br />
                    <span style={{ fontSize: 16, fontWeight: 700, color: totals.net_pay >= 0 ? '#0284c7' : '#dc2626' }}>
                      = {formatCurrency(totals.net_pay)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
        )}
      </div>

      {/* Reports Table */}
      <div style={styles.card}>
        <div
          onClick={() => setShowTable(!showTable)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            marginBottom: showTable ? 16 : 0
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            Daily Reports ({reports.length} records)
          </h3>
          <span style={{
            fontSize: 20,
            color: '#3b82f6',
            transform: showTable ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>
            ▼
          </span>
        </div>
        {showTable && (
          <>
            {error ? (
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
                      <th style={{ ...styles.th, textAlign: 'right' }}>Staff Sales</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Rista Sales</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Bill</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Closing</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Wastage</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Logistics</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>COGS%</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>GST</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Royalty</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report, idx) => {
                      const rowKey = `${report.franchise_id}-${report.report_date}`;
                      const isExpanded = expandedRow === rowKey;

                      return (
                        <>
                          <tr
                            key={rowKey}
                            onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                            style={{
                              background: idx % 2 === 0 ? 'white' : '#fafafa',
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'}
                            onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#fafafa'}
                          >
                            <td style={styles.td}>
                              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                  fontSize: 11,
                                  color: '#3b82f6',
                                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s'
                                }}>
                                  ▶
                                </span>
                                {new Date(report.report_date).toLocaleDateString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric'
                                })}
                              </span>
                            </td>
                            {user?.role === 'ADMIN' && (
                              <td style={styles.td}>{report.franchise_name || 'N/A'}</td>
                            )}
                            <td style={{ ...styles.td, textAlign: 'right', color: '#16a34a' }}>
                              {formatCurrency(report.staff_sales)}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right', color: '#047857', fontWeight: 600 }}>
                              {formatCurrency(report.rista_sales)}
                              {report.rista_sales > 0 && (
                                <span style={{
                                  marginLeft: 4,
                                  fontSize: 10,
                                  background: '#d1fae5',
                                  color: '#065f46',
                                  padding: '2px 4px',
                                  borderRadius: 4
                                }}>
                                  ✓
                                </span>
                              )}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right', color: '#2563eb' }}>
                              {formatCurrency(report.bill_total || 0)}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right', color: '#059669' }}>
                              {formatCurrency(report.closing_total)}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right', color: '#dc2626' }}>
                              {formatCurrency(report.wastage_total)}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right', color: '#f59e0b' }}>
                              {formatCurrency(report.logistics || 0)}
                            </td>
                            <td style={{
                              ...styles.td,
                              textAlign: 'right',
                              color: (report.cogs_percent || 0) > 35 ? '#dc2626' : '#d97706',
                              fontWeight: 600
                            }}>
                              {(report.cogs_percent || 0).toFixed(1)}%
                              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>
                                {report.rista_sales > 0 ? '(Rista)' : '(Staff)'}
                              </div>
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

                          {/* Expanded Calculation Details */}
                          {isExpanded && (
                            <tr style={{ background: '#eff6ff' }}>
                              <td colSpan={user?.role === 'ADMIN' ? 12 : 11} style={{ padding: 20 }}>
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                  gap: 16
                                }}>
                                  {/* Opening Stock */}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: 8,
                                    padding: 12,
                                    border: '1px solid #dbeafe'
                                  }}>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                      Opening Stock
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
                                      {formatCurrency(report.opening || 0)}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                      {report.opening_source_date ? (
                                        <>
                                          From closing on <strong>{new Date(report.opening_source_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                                        </>
                                      ) : (
                                        'No previous closing found'
                                      )}
                                    </div>
                                  </div>

                                  {/* Bill Calculation */}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: 8,
                                    padding: 12,
                                    border: '1px solid #dbeafe'
                                  }}>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                      Bill Total
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>
                                      {formatCurrency(report.bill_total || 0)}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                      Orders delivered on this date
                                    </div>
                                  </div>

                                  {/* COGS Breakdown */}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: 8,
                                    padding: 12,
                                    border: '1px solid #fef3c7'
                                  }}>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                      COGS Calculation
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, fontFamily: 'monospace' }}>
                                      ({formatCurrency(report.opening || 0)} + {formatCurrency(report.bill_total || 0)}<br />
                                      - {formatCurrency(report.closing_total)} - {formatCurrency(report.wastage_total)})<br />
                                      / {formatCurrency(report.sales_for_cogs)} × 100
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#d97706' }}>
                                      {((report.opening || 0) + (report.bill_total || 0) - report.closing_total - report.wastage_total).toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                      = {(report.cogs_percent || 0).toFixed(1)}%
                                    </div>
                                  </div>

                                  {/* GST Calculation */}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: 8,
                                    padding: 12,
                                    border: '1px solid #e9d5ff'
                                  }}>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                      GST (5%)
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, fontFamily: 'monospace' }}>
                                      {formatCurrency(report.sales_for_cogs)} × 5%
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#7c3aed' }}>
                                      {formatCurrency(report.gst)}
                                    </div>
                                  </div>

                                  {/* Royalty Calculation */}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: 8,
                                    padding: 12,
                                    border: '1px solid #fce7f3'
                                  }}>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                      Royalty (5%)
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, fontFamily: 'monospace' }}>
                                      ({formatCurrency(report.sales_for_cogs)} - {formatCurrency(report.gst)}) × 5%
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: '#db2777' }}>
                                      {formatCurrency(report.royalty)}
                                    </div>
                                  </div>

                                  {/* Net Pay Calculation */}
                                  <div style={{
                                    background: 'white',
                                    borderRadius: 8,
                                    padding: 12,
                                    border: '1px solid #cffafe'
                                  }}>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                      Net Pay
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, fontFamily: 'monospace' }}>
                                      {formatCurrency(report.sales_for_cogs)} - {formatCurrency(report.gst)}<br />
                                      - {formatCurrency(report.royalty)} - {formatCurrency(report.bill_total || 0)}<br />
                                      - {formatCurrency(report.logistics || 0)}
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: report.net_pay >= 0 ? '#0284c7' : '#dc2626' }}>
                                      {formatCurrency(report.net_pay)}
                                    </div>
                                  </div>

                                  {/* Sales Source Info */}
                                  <div style={{
                                    background: report.rista_sales > 0 ? '#d1fae5' : '#fef3c7',
                                    borderRadius: 8,
                                    padding: 12,
                                    border: report.rista_sales > 0 ? '1px solid #86efac' : '1px solid #fde68a'
                                  }}>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                                      Sales Source
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: report.rista_sales > 0 ? '#047857' : '#92400e' }}>
                                      {report.rista_sales > 0 ? '✓ Rista Sales' : '⚠ Staff Sales'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                                      Rista: {formatCurrency(report.rista_sales)}<br />
                                      Staff: {formatCurrency(report.staff_sales)}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                      Using: {formatCurrency(report.sales_for_cogs)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                    {/* Totals Row */}
                    <tr style={{ background: '#f3f4f6', fontWeight: 700 }}>
                      <td style={{ ...styles.td, fontWeight: 700 }}>TOTAL</td>
                      {user?.role === 'ADMIN' && <td style={styles.td}>-</td>}
                      <td style={{ ...styles.td, textAlign: 'right', color: '#16a34a' }}>
                        {formatCurrency(totals.staff_sales)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#047857' }}>
                        {formatCurrency(totals.rista_sales)}
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
                      <td style={{ ...styles.td, textAlign: 'right', color: '#f59e0b' }}>
                        {formatCurrency(totals.logistics)}
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
          </>
        )}
      </div>
    </div>
  );
}
