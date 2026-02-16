import api from './api';

/**
 * Payment Service - Finance management for vendor payments
 */
export const paymentService = {
    /**
     * Get all vendors with pending payment summary
     */
    async getVendorSummary() {
        const response = await api.get('/vendor-payments/summary');
        return response.data;
    },

    /**
     * Get ledger for a specific vendor
     * @param {string} vendorId - Vendor ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     */
    async getVendorLedger(vendorId, startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const queryString = params.toString() ? `?${params.toString()}` : '';
        const response = await api.get(`/vendor-payments/ledger/${vendorId}${queryString}`);
        return response.data;
    },

    /**
     * Get payment history
     * @param {string} vendorId - Optional vendor ID to filter by
     */
    async getPaymentHistory(vendorId = null) {
        const params = vendorId ? `?vendorId=${vendorId}` : '';
        const response = await api.get(`/vendor-payments/history${params}`);
        return response.data;
    },

    /**
     * Record a payment
     * @param {Object} paymentData - Payment details
     */
    async recordPayment(paymentData) {
        const response = await api.post('/vendor-payments', paymentData);
        return response.data;
    },

    /**
     * Get single payment details
     * @param {string} paymentId - Payment ID
     */
    async getPayment(paymentId) {
        const response = await api.get(`/vendor-payments/${paymentId}`);
        return response.data;
    }
};

export default paymentService;
