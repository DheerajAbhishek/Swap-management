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
  }
};

export default vendorService;
