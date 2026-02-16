import api from './api';

/**
 * Vendor Service - Manage vendors/kitchens
 */
export const vendorService = {
  /**
   * Get all vendors (Admin only)
   */
  async getVendors() {
    const response = await api.get('/vendors');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Get single vendor
   */
  async getVendor(vendorId) {
    const response = await api.get(`/vendors/${vendorId}`);
    return response.data;
  },

  /**
   * Create new vendor (Admin only)
   */
  async createVendor(data) {
    const response = await api.post('/vendors', data);
    return response.data;
  },

  /**
   * Update vendor (Admin only)
   */
  async updateVendor(vendorId, data) {
    const response = await api.put(`/vendors/${vendorId}`, data);
    return response.data;
  },

  /**
   * Delete vendor (Admin only)
   */
  async deleteVendor(vendorId) {
    const response = await api.delete(`/vendors/${vendorId}`);
    return response.data;
  },

  /**
   * Reset vendor password (Admin only)
   */
  async resetPassword(vendorId, newPassword) {
    const response = await api.put(`/vendors/${vendorId}/reset-password`, { password: newPassword });
    return response.data;
  },

  /**
   * Get own vendor profile (Kitchen user)
   */
  async getProfile(vendorId) {
    const response = await api.get(`/vendors/${vendorId}/profile`);
    return response.data;
  },

  /**
   * Update own vendor profile (Kitchen user)
   */
  async updateProfile(vendorId, data) {
    const response = await api.put(`/vendors/${vendorId}/profile`, data);
    return response.data;
  },

  // ============== Vendor Items Management ==============

  /**
   * Get vendor items for franchise (franchise prices only)
   */
  async getVendorItemsForFranchise(vendorId) {
    const response = await api.get(`/vendors/${vendorId}/items`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Add item to vendor (Admin only)
   */
  async addVendorItem(vendorId, itemData) {
    const response = await api.post(`/vendors/${vendorId}/items`, itemData);
    return response.data;
  },

  /**
   * Add multiple items to vendor at once (Admin only)
   */
  async addBulkVendorItems(vendorId, items) {
    const response = await api.post(`/vendors/${vendorId}/items/bulk`, { items });
    return response.data;
  },

  /**
   * Update vendor item (Admin only)
   */
  async updateVendorItem(vendorId, itemId, itemData) {
    const response = await api.put(`/vendors/${vendorId}/items/${itemId}`, itemData);
    return response.data;
  },

  /**
   * Delete vendor item (Admin only)
   */
  async deleteVendorItem(vendorId, itemId) {
    const response = await api.delete(`/vendors/${vendorId}/items/${itemId}`);
    return response.data;
  }
};

export default vendorService;
