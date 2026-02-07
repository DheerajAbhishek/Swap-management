/**
 * Complaint Service - API calls for complaints management
 */
import api from './api';

export const complaintService = {
  // Get all complaints (admin) or filtered by franchise/vendor
  async getComplaints(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = params ? `/complaints?${params}` : '/complaints';
    return api.get(url);
  },

  // Get single complaint
  async getComplaint(id) {
    return api.get(`/complaints/${id}`);
  },

  // Create new complaint (franchise only)
  async createComplaint(data) {
    return api.post('/complaints', data);
  },

  // Update complaint status/response (admin/kitchen)
  async updateComplaint(id, data) {
    return api.put(`/complaints/${id}`, data);
  },

  // Delete complaint (admin only)
  async deleteComplaint(id) {
    return api.delete(`/complaints/${id}`);
  }
};
