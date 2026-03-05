import React, { useState, useEffect } from 'react';
import { syncTodaySales, formatSalesSummary } from '../services/ristaSalesService';
import { getRistaBranchId, getRistaBranchIdFallback } from '../services/franchiseMappingService';
import './SyncSalesButton.css';

/**
 * Sync Sales Button Component
 * Fetches and auto-populates sales data from Rista API
 * Automatically detects franchise's Rista branch ID
 */
function SyncSalesButton({ franchiseId, onDataSynced }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [ristaBranchId, setRistaBranchId] = useState(null);

    // Get Rista branch ID for this franchise
    useEffect(() => {
        const fetchBranchId = async () => {
            if (!franchiseId) return;

            // Try to get from API first
            const branchId = await getRistaBranchId(franchiseId);

            // Fallback to static mapping if API fails
            if (!branchId) {
                const fallbackId = getRistaBranchIdFallback(franchiseId);
                setRistaBranchId(fallbackId);
            } else {
                setRistaBranchId(branchId);
            }
        };

        fetchBranchId();
    }, [franchiseId]);

    const handleSync = async () => {
        if (!ristaBranchId) {
            setError('Rista branch ID not configured for this franchise');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Fetch today's sales from all channels
            const rawData = await syncTodaySales(ristaBranchId, 'all');
            const formattedData = formatSalesSummary(rawData);

            if (!formattedData) {
                throw new Error('No sales data available');
            }

            // Pass data to parent component to populate form
            if (onDataSynced) {
                onDataSynced(formattedData);
            }

            setLastSyncTime(new Date());
        } catch (err) {
            setError(err.message);
            console.error('Sync error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Don't show button if Rista branch ID is not configured
    if (!ristaBranchId) {
        return (
            <div className="sync-sales-container">
                <span style={{ fontSize: '12px', color: '#999' }}>
                    Rista sync not configured for this franchise
                </span>
            </div>
        );
    }

    return (
        <div className="sync-sales-container">
            <button
                onClick={handleSync}
                disabled={loading}
                className={`sync-button ${loading ? 'loading' : ''}`}
                type="button"
                title={`Sync sales from Rista (Branch: ${ristaBranchId})`}
            >
                {loading ? 'Syncing...' : 'Sync from Rista'}
            </button>

            {lastSyncTime && (
                <span className="sync-time">
                    Last synced: {lastSyncTime.toLocaleTimeString()}
                </span>
            )}

            {error && (
                <div className="sync-error">
                    {error}
                </div>
            )}
        </div>
    );
}

export default SyncSalesButton;
