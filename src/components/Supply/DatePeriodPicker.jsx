import { useState, useEffect } from 'react';

/**
 * DatePeriodPicker - Date range selection component (Responsive)
 */
export default function DatePeriodPicker({ startDate, endDate, onChange }) {
    const [localStart, setLocalStart] = useState(startDate || '');
    const [localEnd, setLocalEnd] = useState(endDate || '');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setLocalStart(startDate || '');
        setLocalEnd(endDate || '');
    }, [startDate, endDate]);

    const handleApply = () => {
        if (localStart && localEnd) {
            onChange({ startDate: localStart, endDate: localEnd });
        }
    };

    // Quick date presets
    const setPreset = (preset) => {
        const today = new Date();
        let start, end;

        switch (preset) {
            case 'today':
                start = end = today.toISOString().split('T')[0];
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                start = end = yesterday.toISOString().split('T')[0];
                break;
            case 'last7':
                end = today.toISOString().split('T')[0];
                const last7 = new Date(today);
                last7.setDate(last7.getDate() - 6);
                start = last7.toISOString().split('T')[0];
                break;
            case 'last30':
                end = today.toISOString().split('T')[0];
                const last30 = new Date(today);
                last30.setDate(last30.getDate() - 29);
                start = last30.toISOString().split('T')[0];
                break;
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                end = today.toISOString().split('T')[0];
                break;
            case 'lastMonth':
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                start = lastMonthStart.toISOString().split('T')[0];
                end = lastMonthEnd.toISOString().split('T')[0];
                break;
            default:
                return;
        }

        setLocalStart(start);
        setLocalEnd(end);
        onChange({ startDate: start, endDate: end });
    };

    const inputStyle = {
        padding: isMobile ? '8px 10px' : '10px 14px',
        borderRadius: 8,
        border: '1px solid #d1d5db',
        fontSize: isMobile ? 13 : 14,
        outline: 'none',
        transition: 'border-color 0.2s',
        minWidth: isMobile ? 0 : 140,
        width: isMobile ? '100%' : 'auto',
        flex: isMobile ? 1 : 'none'
    };

    const presetButtonStyle = {
        padding: isMobile ? '6px 10px' : '6px 12px',
        borderRadius: 6,
        border: '1px solid #e5e7eb',
        background: 'white',
        fontSize: isMobile ? 11 : 12,
        color: '#4b5563',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flex: isMobile ? '1 1 calc(33.33% - 6px)' : 'none'
    };

    return (
        <div style={{
            background: 'white',
            borderRadius: isMobile ? 10 : 12,
            padding: isMobile ? 12 : 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
            {/* Quick Presets */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: isMobile ? 6 : 8,
                marginBottom: isMobile ? 12 : 16
            }}>
                <button style={presetButtonStyle} onClick={() => setPreset('today')}>
                    Today
                </button>
                <button style={presetButtonStyle} onClick={() => setPreset('yesterday')}>
                    Yesterday
                </button>
                <button style={presetButtonStyle} onClick={() => setPreset('last7')}>
                    Last 7 Days
                </button>
                <button style={presetButtonStyle} onClick={() => setPreset('last30')}>
                    Last 30 Days
                </button>
                <button style={presetButtonStyle} onClick={() => setPreset('thisMonth')}>
                    This Month
                </button>
                <button style={presetButtonStyle} onClick={() => setPreset('lastMonth')}>
                    Last Month
                </button>
            </div>

            {/* Date Inputs */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: 'wrap',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? 10 : 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: isMobile ? '1' : 'none' }}>
                    <label style={{ fontSize: isMobile ? 12 : 13, color: '#6b7280', fontWeight: 500, minWidth: isMobile ? 40 : 'auto' }}>From:</label>
                    <input
                        type="date"
                        value={localStart}
                        onChange={(e) => setLocalStart(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: isMobile ? '1' : 'none' }}>
                    <label style={{ fontSize: isMobile ? 12 : 13, color: '#6b7280', fontWeight: 500, minWidth: isMobile ? 40 : 'auto' }}>To:</label>
                    <input
                        type="date"
                        value={localEnd}
                        onChange={(e) => setLocalEnd(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <button
                    onClick={handleApply}
                    disabled={!localStart || !localEnd}
                    style={{
                        padding: isMobile ? '10px 16px' : '10px 20px',
                        borderRadius: 8,
                        border: 'none',
                        background: (!localStart || !localEnd) ? '#d1d5db' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: (!localStart || !localEnd) ? 'not-allowed' : 'pointer',
                        width: isMobile ? '100%' : 'auto'
                    }}
                >
                    Apply
                </button>
            </div>
        </div>
    );
}
