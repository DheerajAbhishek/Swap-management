import api from './api';

/**
 * Hygiene Monitor Service - API calls for hygiene monitor management
 */
export const hygieneMonitorService = {
    /**
     * Get all hygiene monitors (admin only)
     */
    getHygieneMonitors: async () => {
        const response = await api.get('/hygiene-monitors');
        return response.data;
    },

    /**
     * Get assigned franchises for logged-in hygiene monitor
     */
    getAssignedFranchises: async () => {
        const response = await api.get('/hygiene-monitors/assigned-franchises');
        return response.data;
    },

    /**
     * Get attendance data for assigned franchises
     * @param {Object} params - Optional filters { franchise_id, start_date, end_date }
     */
    getAttendance: async (params = {}) => {
        const response = await api.get('/hygiene-monitors/attendance', { params });
        return response.data;
    },

    /**
     * Get audit data for assigned franchises
     * @param {Object} params - Optional filters { franchise_id }
     */
    getAudits: async (params = {}) => {
        const response = await api.get('/hygiene-monitors/audits', { params });
        return response.data;
    },

    /**
     * Get staff for assigned franchises (hygiene monitor only)
     */
    getStaff: async () => {
        const response = await api.get('/staff');
        return response.data;
    },

    /**
     * Get staff attendance statistics
     * @param {string} staffId - Staff ID
     */
    getStaffAttendanceStats: async (staffId) => {
        const response = await api.get(`/staff/${staffId}/attendance-stats`);
        return response.data;
    },

    /**
     * Create new hygiene monitor (admin only)
     * @param {Object} monitorData - Hygiene monitor data
     */
    createHygieneMonitor: async (monitorData) => {
        const response = await api.post('/hygiene-monitors', monitorData);
        return response.data;
    },

    /**
     * Update hygiene monitor (admin only)
     * @param {string} id - Hygiene monitor ID
     * @param {Object} monitorData - Updated data
     */
    updateHygieneMonitor: async (id, monitorData) => {
        const response = await api.put(`/hygiene-monitors/${id}`, monitorData);
        return response.data;
    },

    /**
     * Delete hygiene monitor (admin only)
     * @param {string} id - Hygiene monitor ID
     */
    deleteHygieneMonitor: async (id) => {
        const response = await api.delete(`/hygiene-monitors/${id}`);
        return response.data;
    }
};
