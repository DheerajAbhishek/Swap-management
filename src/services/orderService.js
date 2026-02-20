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
   * Dispatch order (Kitchen) - with optional photo
   * @param {string} orderId
   * @param {Object} dispatchData - { dispatch_photos: Array, dispatch_notes: string }
   * @returns {Promise<Object>}
   */
  async dispatchOrder(orderId, dispatchData = {}) {
    const response = await api.put(`/orders/${orderId}/dispatch`, dispatchData);
    return response.data;
  },

  /**
   * Receive order (Franchise) - marks order as received with optional photo
   * @param {string} orderId
   * @param {Object} receiveData - { receive_photos: Array }
   * @returns {Promise<Object>}
   */
  async receiveOrder(orderId, receiveData = {}) {
    const response = await api.put(`/orders/${orderId}/receive`, receiveData);
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
   * Edit order (Franchise) - Only allowed within 24hrs and status PLACED
   * @param {string} orderId
   * @param {Object} orderData - { vendor_id, items: Array }
   * @returns {Promise<Object>}
   */
  async editOrder(orderId, orderData) {
    const response = await api.put(`/orders/${orderId}`, orderData);
    return response.data;
  },

  /**
   * Delete order (Franchise) - Only allowed within 24hrs and status PLACED
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async deleteOrder(orderId) {
    const response = await api.delete(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Check if order can be modified (client-side check)
   * @param {Object} order - Order object with created_at and status
   * @returns {Object} - { allowed: boolean, reason: string }
   */
  canModifyOrder(order) {
    if (order.status !== 'PLACED') {
      return { allowed: false, reason: 'Order cannot be modified after it has been accepted' };
    }

    const createdAt = new Date(order.created_at);
    const now = new Date();
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

    if (hoursSinceCreation > 24) {
      return { allowed: false, reason: 'Order can only be modified within 24 hours of creation' };
    }

    return { allowed: true, reason: '' };
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
