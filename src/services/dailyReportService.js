import api from './api';

/**
 * Daily Report Service
 * Handles closing, wastage, and daily sales data
 */
export const dailyReportService = {
  /**
   * Save daily report (closing, wastage, sales)
   */
  async saveDailyReport(data) {
    const response = await api.post('/daily-reports', data);
    return response.data;
  },

  /**
   * Get daily report for a specific date and franchise
   */
  async getDailyReport(date, franchiseId) {
    const params = new URLSearchParams({ date });
    if (franchiseId) params.append('franchise_id', franchiseId);
    const response = await api.get(`/daily-reports?${params}`);
    return response.data;
  },

  /**
   * Get daily reports for a date range
   */
  async getDailyReports(startDate, endDate, franchiseId) {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (franchiseId) params.append('franchise_id', franchiseId);
    const response = await api.get(`/daily-reports/range?${params}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Update daily report
   */
  async updateDailyReport(data) {
    const response = await api.put('/daily-reports', data);
    return response.data;
  },

  // Aliases for backward compatibility
  async saveClosing(data) {
    return this.saveDailyReport(data);
  },

  async saveWastage(data) {
    return this.saveDailyReport(data);
  },

  async saveSales(data) {
    return this.saveDailyReport(data);
  }
};

export default dailyReportService;
