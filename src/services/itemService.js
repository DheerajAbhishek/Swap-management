import api from './api';

/**
 * Items Service - CRUD operations for items
 */
export const itemService = {
  /**
   * Get all items
   * @returns {Promise<Array>}
   */
  async getItems() {
    const response = await api.get('/items');
    // API returns array directly
    return Array.isArray(response.data) ? response.data : (response.data.items || []);
  },

  /**
   * Create a new item (Admin only)
   * @param {Object} itemData - { name, category, subcategory, defaultUom, standard_price }
   * @returns {Promise<Object>}
   */
  async createItem(itemData) {
    const response = await api.post('/items', itemData);
    return response.data;
  },

  /**
   * Update an item (Admin only)
   * @param {string} itemId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateItem(itemId, updates) {
    const response = await api.put(`/items/${itemId}`, updates);
    return response.data;
  },

  /**
   * Delete an item (Admin only)
   * @param {string} itemId
   * @returns {Promise<void>}
   */
  async deleteItem(itemId) {
    await api.delete(`/items/${itemId}`);
  },

  /**
   * Update item price (Admin only)
   * @param {string} itemId
   * @param {number} price
   * @returns {Promise<Object>}
   */
  async updatePrice(itemId, price) {
    return this.updateItem(itemId, { standard_price: price });
  }
};

export default itemService;
