import { useState, useEffect, useRef } from 'react';

/**
 * DateRangePicker - Simple date range selector
 */
export default function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }) {
    const formatDate = (date) => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>From:</label>
                <input
                    type="date"
                    value={formatDate(startDate)}
                    onChange={(e) => onStartChange(e.target.value ? new Date(e.target.value) : null)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '2px solid #e5e7eb',
                        fontSize: 14,
                        color: '#374151',
                        outline: 'none'
                    }}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>To:</label>
                <input
                    type="date"
                    value={formatDate(endDate)}
                    onChange={(e) => onEndChange(e.target.value ? new Date(e.target.value) : null)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '2px solid #e5e7eb',
                        fontSize: 14,
                        color: '#374151',
                        outline: 'none'
                    }}
                />
            </div>
        </div>
    );
}
