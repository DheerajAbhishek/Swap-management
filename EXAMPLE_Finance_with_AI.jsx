/**
 * EXAMPLE: Admin Finance Page with AI Insights
 * This shows how to add AIInsightsPanel to your existing Finance.jsx
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import AIInsightsPanel from '../../components/AIInsightsPanel'; // ADD THIS

// SVG Icons
const Icons = {
    money: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
    ),
    // ... rest of icons
};

export default function Finance() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadVendorSummary();
    }, []);

    const loadVendorSummary = async () => {
        try {
            setLoading(true);
            const data = await paymentService.getVendorSummary();
            setVendors(data);
        } catch (err) {
            console.error('Failed to load vendor summary:', err);
            setError('Failed to load vendor data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="finance-page">
            <header className="page-header">
                <div className="header-content">
                    <div className="title-section">
                        <div className="icon-wrapper money-icon">{Icons.money}</div>
                        <div>
                            <h1 className="page-title">Finance Management</h1>
                            <p className="page-subtitle">Manage vendor payments and view financial summary</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="content-container">
                {/* ADD AI INSIGHTS HERE - Right after header, before main content */}
                <AIInsightsPanel
                    type="finance"
                    autoLoad={false}  // User clicks to generate (saves API calls)
                />

                {/* Rest of your existing content */}
                {loading && <div className="loading">Loading vendor data...</div>}

                {error && <div className="error-message">{error}</div>}

                {!loading && !error && (
                    <div className="vendor-summary-grid">
                        {/* Your existing vendor cards */}
                        {vendors.map(vendor => (
                            <div key={vendor.vendor_id} className="vendor-card">
                                {/* vendor content */}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
