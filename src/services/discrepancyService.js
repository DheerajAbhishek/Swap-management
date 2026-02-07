import api from './api';

/**
 * Discrepancy Service - Manage quantity mismatches
 */
export const discrepancyService = {
  /**
   * Report a discrepancy (Franchise)
   * @param {Object} discrepancyData
   * @returns {Promise<Object>}
   */
  async reportDiscrepancy(discrepancyData) {
    const response = await api.post('/discrepancies', discrepancyData);
    return response.data;
  },

  /**
   * Alias for reportDiscrepancy
   */
  async createDiscrepancy(discrepancyData) {
    return this.reportDiscrepancy(discrepancyData);
  },

  /**
   * Get all discrepancies (Admin/Kitchen)
   * @param {Object} filters - { resolved, orderId }
   * @returns {Promise<Array>}
   */
  async getDiscrepancies(filters = {}) {
    const params = new URLSearchParams();
    if (filters.resolved !== undefined) params.append('resolved', filters.resolved);
    if (filters.order_id) params.append('order_id', filters.order_id);

    const response = await api.get(`/discrepancies?${params.toString()}`);
    return Array.isArray(response.data) ? response.data : (response.data.discrepancies || []);
  },

  /**
   * Resolve a discrepancy (Admin)
   * @param {string} discrepancyId
   * @param {string} notes - Resolution notes
   * @returns {Promise<Object>}
   */
  async resolveDiscrepancy(discrepancyId, notes) {
    const response = await api.put(`/discrepancies/${discrepancyId}/resolve`, { notes });
    return response.data;
  }
};

export default discrepancyService;
