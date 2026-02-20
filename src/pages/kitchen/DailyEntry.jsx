import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { itemService } from '../../services/itemService';
import { orderService } from '../../services/orderService';
import { dailyReportService } from '../../services/dailyReportService';
import ClosingForm from '../../components/Supply/ClosingForm';
import WastageForm from '../../components/Supply/WastageForm';
import DailyReportCard from '../../components/Supply/DailyReportCard';
import { formatCurrency } from '../../utils/constants';

/**
 * DailyEntry - Page for entering daily closing, wastage, and sales
 */
export default function DailyEntry() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  // Form states
  const [sales, setSales] = useState('');
  const [closingData, setClosingData] = useState({ items: [], total: 0 });
  const [wastageData, setWastageData] = useState({ items: [], total: 0 });
  const [billTotal, setBillTotal] = useState(0);
  const [existingReport, setExistingReport] = useState(null);

  // UI states
  const [activeTab, setActiveTab] = useState('closing');
  const [savingReport, setSavingReport] = useState(false);
  const [message, setMessage] = useState(null);

  // Load items
  useEffect(() => {
    const loadItems = async () => {
      try {
        const data = await itemService.getItems();
        setItems(data);
      } catch (err) {
        console.error('Failed to load items:', err);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  // Load existing report and bill total when date changes
  useEffect(() => {
    const loadDateData = async () => {
      setLoadingReport(true);
      try {
        // Load existing report for selected date
        const report = await dailyReportService.getDailyReport(selectedDate);
        if (report) {
          setExistingReport(report);
          setSales(report.sales?.toString() || '');
          setClosingData({ items: report.closing_items || [], total: report.closing_total || 0 });
          setWastageData({ items: report.wastage_items || [], total: report.wastage_total || 0 });
          setBillTotal(report.bill_total || 0);
        } else {
          // Reset if no report exists
          setExistingReport(null);
          setSales('');
          setClosingData({ items: [], total: 0 });
          setWastageData({ items: [], total: 0 });

          // Load bill total from orders
          const orders = await orderService.getOrders();
          const receivedOnDate = orders.filter(order => {
            if (order.status !== 'RECEIVED' && order.status !== 'DELIVERED') return false;
            const orderDate = order.received_at || order.created_at;
            return orderDate && orderDate.startsWith(selectedDate);
          });
          const total = receivedOnDate.reduce((sum, order) => sum + (order.total_amount || 0), 0);
          setBillTotal(total);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        // Still try to load bill total from orders
        try {
          const orders = await orderService.getOrders();
          const receivedOnDate = orders.filter(order => {
            if (order.status !== 'RECEIVED' && order.status !== 'DELIVERED') return false;
            const orderDate = order.received_at || order.created_at;
            return orderDate && orderDate.startsWith(selectedDate);
          });
          const total = receivedOnDate.reduce((sum, order) => sum + (order.total_amount || 0), 0);
          setBillTotal(total);
        } catch (e) {
          console.error('Failed to load orders:', e);
        }
      } finally {
        setLoadingReport(false);
      }
    };
    loadDateData();
  }, [selectedDate]);

  const handleClosingSubmit = async (data) => {
    setClosingData(data);
    setMessage({ type: 'success', text: 'Closing data updated. Click "Save Daily Report" to save.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleWastageSubmit = async (data) => {
    setWastageData(data);
    setMessage({ type: 'success', text: 'Wastage data updated. Click "Save Daily Report" to save.' });
    setTimeout(() => setMessage(null), 3000);
  };

  // Save entire daily report to backend
  const handleSaveReport = async () => {
    if (!sales || parseFloat(sales) <= 0) {
      setMessage({ type: 'error', text: 'Please enter sales amount' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSavingReport(true);
    try {
      const reportData = {
        date: selectedDate,
        sales: parseFloat(sales) || 0,
        closing_items: closingData.items,
        closing_total: closingData.total,
        wastage_items: wastageData.items,
        wastage_total: wastageData.total,
        bill_total: billTotal
      };

      let savedReport;
      if (existingReport) {
        savedReport = await dailyReportService.updateDailyReport(reportData);
      } else {
        savedReport = await dailyReportService.saveDailyReport(reportData);
      }

      setExistingReport(savedReport);
      setMessage({ type: 'success', text: 'Daily report saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save report:', err);
      setMessage({ type: 'error', text: 'Failed to save report: ' + (err.message || 'Unknown error') });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSavingReport(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Daily Entry
        </h1>
        <p style={{ color: '#6b7280', marginTop: 4 }}>
          Enter closing inventory, wastage, and sales for the day
        </p>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#dc2626'
        }}>
          {message.text}
        </div>
      )}

      {/* Date & Sales Input */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: '2px solid #e5e7eb',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Today's Sales (₹)
            </label>
            <input
              type="number"
              value={sales}
              onChange={(e) => {
                const value = e.target.value;
                // Prevent scientific notation characters
                if (value.includes('e') || value.includes('E')) return;
                setSales(value);
              }}
              onKeyDown={(e) => {
                // Prevent e, E, +, - keys
                if (['e', 'E', '+', '-'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              placeholder="Enter sales amount"
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: '2px solid #22c55e',
                fontSize: 16,
                fontWeight: 600,
                boxSizing: 'border-box',
                background: '#f0fdf4'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Bill Total (Auto from Orders)
            </label>
            <div style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: '2px solid #3b82f6',
              fontSize: 16,
              fontWeight: 600,
              background: '#eff6ff',
              color: '#1d4ed8'
            }}>
              {formatCurrency(billTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for Closing/Wastage */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        {/* Tab Headers */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #e5e7eb', paddingBottom: 16 }}>
          <button
            onClick={() => setActiveTab('closing')}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'closing' ? '#10b981' : '#f3f4f6',
              color: activeTab === 'closing' ? 'white' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Closing Inventory
            {closingData.total > 0 && (
              <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                {formatCurrency(closingData.total)}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('wastage')}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'wastage' ? '#dc2626' : '#f3f4f6',
              color: activeTab === 'wastage' ? 'white' : '#6b7280',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Wastage
            {wastageData.total > 0 && (
              <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                {formatCurrency(wastageData.total)}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'closing' && (
          <ClosingForm
            items={items}
            onSubmit={handleClosingSubmit}
            loading={loadingReport}
            initialData={closingData.items}
          />
        )}

        {activeTab === 'wastage' && (
          <WastageForm
            items={items}
            onSubmit={handleWastageSubmit}
            loading={loadingReport}
            initialData={wastageData.items}
          />
        )}
      </div>

      {/* Daily Financial Report Card */}
      <DailyReportCard
        sales={sales}
        bill={billTotal}
        closing={closingData.total}
        wastage={wastageData.total}
      />

      {/* Save Report Button */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 24,
        marginTop: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {existingReport && (
            <span style={{ color: '#6b7280', fontSize: 13 }}>
              Last saved: {new Date(existingReport.updated_at || existingReport.created_at).toLocaleString()}
            </span>
          )}
          {loadingReport && (
            <span style={{ color: '#6b7280', fontSize: 13 }}>Loading existing data...</span>
          )}
        </div>
        <button
          onClick={handleSaveReport}
          disabled={savingReport || loadingReport}
          style={{
            padding: '14px 32px',
            borderRadius: 10,
            border: 'none',
            background: savingReport ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontWeight: 700,
            fontSize: 16,
            cursor: savingReport ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
          }}
        >
          {savingReport ? 'Saving...' : existingReport ? 'Update Daily Report' : 'Save Daily Report'}
        </button>
      </div>
    </div>
  );
}
