import api from './api';

/**
 * Order Service - Order lifecycle management
 */
export const orderService = {
  /**
   * Create a new order (Franchise)
   * @param {Object} orderData - { items: Array, notes: string }
   * @returns {Promise<Object>}
   */
  async createOrder(orderData) {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  /**
   * Get orders (filtered by role on backend)
   * @param {Object} filters - { status, startDate, endDate, franchiseId }
   * @returns {Promise<Array>}
   */
  async getOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.franchiseId) params.append('franchiseId', filters.franchiseId);

    const response = await api.get(`/orders?${params.toString()}`);
    return Array.isArray(response.data) ? response.data : (response.data.orders || []);
  },

  /**
   * Get single order by ID
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async getOrder(orderId) {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Accept order (Kitchen)
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async acceptOrder(orderId) {
    const response = await api.put(`/orders/${orderId}/accept`);
    return response.data;
  },

  /**
   * Dispatch order (Kitchen)
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async dispatchOrder(orderId) {
    const response = await api.put(`/orders/${orderId}/dispatch`);
    return response.data;
  },

  /**
   * Receive order (Franchise) - marks order as received
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async receiveOrder(orderId) {
    const response = await api.put(`/orders/${orderId}/receive`);
    return response.data;
  },

  /**
   * Confirm receipt (Franchise)
   * @param {string} orderId
   * @param {Array} receivedItems - [{ orderItemId, receivedQty }]
   * @returns {Promise<Object>}
   */
  async confirmReceipt(orderId, receivedItems) {
    const response = await api.put(`/orders/${orderId}/receive`, { receivedItems });
    return response.data;
  },

  /**
   * Get received items report
   * @param {Object} params - { startDate, endDate, franchiseId }
   * @returns {Promise<Array>}
   */
  async getReceivedItems(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.franchiseId) queryParams.append('franchiseId', params.franchiseId);

    const response = await api.get(`/orders/received-items?${queryParams.toString()}`);
    return Array.isArray(response.data) ? response.data : (response.data.items || []);
  }
};

export default orderService;
