import React, { useState, useEffect } from 'react';
import aiInsightsService from '../services/aiInsights';
import './AIInsightsPanel.css';

/**
 * Reusable AI Insights Panel Component
 * Props:
 *   - type: finance|attendance|discrepancies|daily-reports|vendors
 *   - franchiseId: optional franchise filter (for admin)
 *   - autoLoad: auto-fetch on mount (default: false to save API calls)
 */
const AIInsightsPanel = ({ type, franchiseId = null, autoLoad = false }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const loadInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await aiInsightsService.getInsights(type, franchiseId);
      setInsights(data);
      setExpanded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      loadInsights();
    }
  }, [type, franchiseId, autoLoad]);

  const getTypeLabel = () => {
    const labels = {
      'finance': 'Finance',
      'attendance': 'Attendance',
      'discrepancies': 'Discrepancies',
      'daily-reports': 'Daily Reports',
      'vendors': 'Vendors'
    };
    return labels[type] || type;
  };

  return (
    <div className="ai-insights-panel">
      <div className="ai-insights-header">
        <div className="ai-insights-title">
          <span className="ai-icon">🤖</span>
          <h3>AI Insights - {getTypeLabel()}</h3>
        </div>

        {!insights && !loading && (
          <button
            className="btn-generate-insights"
            onClick={loadInsights}
            disabled={loading}
          >
            Generate Insights
          </button>
        )}

        {insights && (
          <div className="insights-actions">
            <button
              className="btn-refresh"
              onClick={loadInsights}
              disabled={loading}
              title="Refresh insights"
            >
              🔄
            </button>
            <button
              className="btn-toggle"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '▼' : '▶'}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="insights-loading">
          <div className="spinner"></div>
          <p>Analyzing data with AI...</p>
        </div>
      )}

      {error && (
        <div className="insights-error">
          <p>⚠️ {error}</p>
          <button onClick={loadInsights} className="btn-retry">
            Try Again
          </button>
        </div>
      )}

      {insights && expanded && (
        <div className="insights-content">
          {/* Summary Stats */}
          {insights.summary && (
            <div className="insights-summary">
              <h4>📊 Data Summary</h4>
              <div className="summary-grid">
                {Object.entries(insights.summary).map(([key, value]) => (
                  <div key={key} className="summary-item">
                    <span className="summary-label">
                      {key.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="summary-value">
                      {typeof value === 'object' ? JSON.stringify(value) : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {insights.insights && (
            <div className="insights-ai">
              <h4>💡 AI Analysis</h4>
              <div className="insights-text">
                {insights.insights.split('\n').map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="insights-meta">
            <small>
              Generated: {new Date(insights.generated_at).toLocaleString()}
              {insights.cached && ' (Cached)'}
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
