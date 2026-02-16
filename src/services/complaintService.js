/**
 * Complaint Service - API calls for complaints management
 */
import api from './api';

export const complaintService = {
  // Get all complaints (admin) or filtered by franchise/vendor
  async getComplaints(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = params ? `/complaints?${params}` : '/complaints';
    const response = await api.get(url);
    return Array.isArray(response.data) ? response.data : [];
  },

  // Get single complaint
  async getComplaint(id) {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  },

  // Create new complaint (franchise only)
  async createComplaint(data) {
    const response = await api.post('/complaints', data);
    return response.data;
  },

  // Update complaint status/response (admin/kitchen)
  async updateComplaint(id, data) {
    const response = await api.put(`/complaints/${id}`, data);
    return response.data;
  },

  // Delete complaint (admin only)
  async deleteComplaint(id) {
    const response = await api.delete(`/complaints/${id}`);
    return response.data;
  }
};
