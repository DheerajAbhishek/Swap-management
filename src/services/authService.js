import api from './api';

/**
 * Authentication Service
 */
export const authService = {
  /**
   * Login user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: Object, token: string}>}
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Get current user info
   * @returns {Promise<Object>}
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Logout user - just clears local storage (no API call needed)
   */
  logout() {
    localStorage.removeItem('supply_user');
    localStorage.removeItem('supply_token');
  }
};

export default authService;
