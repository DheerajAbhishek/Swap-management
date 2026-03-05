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
   * Get discrepancies for a specific order
   * @param {string} orderId
   * @returns {Promise<Object>} { discrepancies, hasUnresolved, count, unresolvedCount }
   */
  async getOrderDiscrepancies(orderId) {
    const response = await api.get(`/discrepancies/order/${orderId}`);
    return response.data;
  },

  /**
   * Resolve a discrepancy (Admin) - Legacy/Admin override
   * @param {string} discrepancyId
   * @param {string} notes - Resolution notes
   * @returns {Promise<Object>}
   */
  async resolveDiscrepancy(discrepancyId, notes) {
    const response = await api.put(`/discrepancies/${discrepancyId}/resolve`, {
      resolution_notes: notes
    });
    return response.data;
  },

  /**
   * Vendor acknowledges discrepancy and promises to send items (Kitchen/Vendor)
   * @param {string} discrepancyId
   * @param {string} vendor_notes - What vendor will do (e.g., "Will send items with next delivery")
   * @returns {Promise<Object>}
   */
  async vendorAcknowledge(discrepancyId, vendor_notes) {
    const response = await api.put(`/discrepancies/${discrepancyId}/vendor-acknowledge`, {
      vendor_notes
    });
    return response.data;
  },

  /**
   * Franchise confirms items received and closes discrepancy (Franchise)
   * @param {string} discrepancyId
   * @param {string} franchise_notes - Optional notes (e.g., "Items received on March 5")
   * @returns {Promise<Object>}
   */
  async franchiseClose(discrepancyId, franchise_notes = 'Items received') {
    const response = await api.put(`/discrepancies/${discrepancyId}/franchise-close`, {
      franchise_notes
    });
    return response.data;
  },

  /**
   * Vendor rejects discrepancy with reason (Kitchen/Vendor)
   * @param {string} discrepancyId
   * @param {string} rejection_reason - Why the discrepancy is being rejected
   * @returns {Promise<Object>}
   */
  async vendorReject(discrepancyId, rejection_reason) {
    const response = await api.put(`/discrepancies/${discrepancyId}/vendor-reject`, {
      rejection_reason
    });
    return response.data;
  },

  /**
   * Delete discrepancy (Franchise: pending only, Admin: anytime)
   * @param {string} discrepancyId
   * @param {boolean} softDelete - Admin only: true for soft delete (audit trail), false for hard delete
   * @returns {Promise<Object>}
   */
  async deleteDiscrepancy(discrepancyId, softDelete = false) {
    const response = await api.delete(`/discrepancies/${discrepancyId}`, {
      data: { soft_delete: softDelete }
    });
    return response.data;
  },

  /**
   * Admin force closes discrepancy (Admin only)
   * @param {string} discrepancyId
   * @param {string} reason - Reason for force closing
   * @returns {Promise<Object>}
   */
  async forceClose(discrepancyId, reason) {
    const response = await api.put(`/discrepancies/${discrepancyId}/force-close`, {
      reason
    });
    return response.data;
  }
};

export default discrepancyService;
