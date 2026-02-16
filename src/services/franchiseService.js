import api from './api';

/**
 * Franchise Service - Manage franchises
 */
export const franchiseService = {
  /**
   * Get all franchises (Admin only)
   */
  async getFranchises() {
    const response = await api.get('/franchises');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Get franchises by vendor (cluster)
   */
  async getFranchisesByVendor(vendorId) {
    const response = await api.get(`/franchises?vendor_id=${vendorId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Get single franchise
   */
  async getFranchise(franchiseId) {
    const response = await api.get(`/franchises/${franchiseId}`);
    return response.data;
  },

  /**
   * Create new franchise (Admin only)
   */
  async createFranchise(data) {
    const response = await api.post('/franchises', data);
    return response.data;
  },

  /**
   * Update franchise (Admin only)
   */
  async updateFranchise(franchiseId, data) {
    const response = await api.put(`/franchises/${franchiseId}`, data);
    return response.data;
  },

  /**
   * Delete franchise (Admin only)
   */
  async deleteFranchise(franchiseId) {
    const response = await api.delete(`/franchises/${franchiseId}`);
    return response.data;
  },

  /**
   * Reset franchise password (Admin only)
   */
  async resetPassword(franchiseId, newPassword) {
    const response = await api.put(`/franchises/${franchiseId}/reset-password`, { password: newPassword });
    return response.data;
  },

  // ============ FRANCHISE ITEM MANAGEMENT ============

  /**
   * Add item to franchise with custom price
   */
  async addFranchiseItem(franchiseId, itemData) {
    const response = await api.post(`/franchises/${franchiseId}/items`, itemData);
    return response.data;
  },

  /**
   * Update franchise item price
   */
  async updateFranchiseItem(franchiseId, itemId, itemData) {
    const response = await api.put(`/franchises/${franchiseId}/items/${itemId}`, itemData);
    return response.data;
  },

  /**
   * Delete item from franchise
   */
  async deleteFranchiseItem(franchiseId, itemId) {
    const response = await api.delete(`/franchises/${franchiseId}/items/${itemId}`);
    return response.data;
  },

  /**
   * Get franchise items (for ordering)
   */
  async getFranchiseItems(franchiseId) {
    const response = await api.get(`/franchises/${franchiseId}/items`);
    return Array.isArray(response.data) ? response.data : [];
  }
};

export default franchiseService;
