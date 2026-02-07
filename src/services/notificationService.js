import api from './api';

export const notificationService = {
  // Get notifications for current user
  async getNotifications(limit = 20, unreadOnly = false) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (unreadOnly) params.append('unread', 'true');

    const response = await api.get(`/notifications?${params}`);
    return response.data;
  },

  // Mark single notification as read
  async markAsRead(notificationId) {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead() {
    const response = await api.put(`/notifications/read-all`);
    return response.data;
  },

  // Delete notification
  async deleteNotification(notificationId) {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  }
};
