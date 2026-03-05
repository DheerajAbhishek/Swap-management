/**
 * AI Insights Service
 * Fetches AI-powered insights from backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://your-api-gateway.execute-api.ap-south-1.amazonaws.com';

class AIInsightsService {
  /**
   * Get AI insights by type
   * @param {string} type - finance|attendance|discrepancies|daily-reports|vendors
   * @param {string} franchiseId - Optional franchise ID (admin only)
   * @returns {Promise<Object>} Insights data
   */
  async getInsights(type, franchiseId = null) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const validTypes = ['finance', 'attendance', 'discrepancies', 'daily-reports', 'vendors'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    const params = new URLSearchParams({ type });
    if (franchiseId) {
      params.append('franchise_id', franchiseId);
    }

    const response = await fetch(`${API_URL}/ai-insights?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch insights');
    }

    return await response.json();
  }

  /**
   * Get finance insights
   */
  async getFinanceInsights(franchiseId = null) {
    return this.getInsights('finance', franchiseId);
  }

  /**
   * Get attendance insights
   */
  async getAttendanceInsights(franchiseId = null) {
    return this.getInsights('attendance', franchiseId);
  }

  /**
   * Get discrepancy insights
   */
  async getDiscrepancyInsights(franchiseId = null) {
    return this.getInsights('discrepancies', franchiseId);
  }

  /**
   * Get daily reports insights
   */
  async getDailyReportsInsights(franchiseId = null) {
    return this.getInsights('daily-reports', franchiseId);
  }

  /**
   * Get vendor insights
   */
  async getVendorInsights(franchiseId = null) {
    return this.getInsights('vendors', franchiseId);
  }
}

export default new AIInsightsService();
