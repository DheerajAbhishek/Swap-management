import api from './api';

/**
 * Staff Service - API calls for staff management
 */
export const staffService = {
    /**
     * Get staff members (filtered by role/franchise/kitchen)
     * @param {Object} params - Optional filters { type, parentId, franchise_id, kitchen_id }
     */
    getStaff: async (params = {}) => {
        const response = await api.get('/staff', { params });
        return response.data;
    },

    /**
     * Get all staff members (admin only)
     */
    getAllStaff: async () => {
        const response = await api.get('/staff', { params: { all: true } });
        return response.data;
    },

    /**
     * Get a single staff member
     * @param {string} id - Staff ID
     */
    getStaffById: async (id) => {
        const response = await api.get(`/staff/${id}`);
        return response.data;
    },

    /**
     * Create new staff member
     * @param {Object} staffData - Staff data
     */
    createStaff: async (staffData) => {
        const response = await api.post('/staff', staffData);
        return response.data;
    },

    /**
     * Update staff member
     * @param {string} id - Staff ID
     * @param {Object} staffData - Updated data
     */
    updateStaff: async (id, staffData) => {
        const response = await api.put(`/staff/${id}`, staffData);
        return response.data;
    },

    /**
     * Reset staff password
     * @param {string} id - Staff ID
     * @param {string} password - New password
     */
    resetPassword: async (id, password) => {
        const response = await api.put(`/staff/${id}/reset-password`, { password });
        return response.data;
    },

    /**
     * Delete staff member
     * @param {string} id - Staff ID
     */
    deleteStaff: async (id) => {
        const response = await api.delete(`/staff/${id}`);
        return response.data;
    },

    /**
     * Get managers (KITCHEN or FRANCHISE role)
     * @param {string} type - Optional: 'KITCHEN' or 'FRANCHISE'
     */
    getManagers: async (type = '') => {
        const response = await api.get('/staff/managers', { params: { type } });
        return response.data;
    },

    /**
     * Create new manager
     * @param {Object} managerData - Manager data with role KITCHEN or FRANCHISE
     */
    createManager: async (managerData) => {
        const response = await api.post('/staff', managerData);
        return response.data;
    },

    /**
     * Delete manager
     * @param {string} id - Manager ID
     */
    deleteManager: async (id) => {
        const response = await api.delete(`/staff/managers/${id}`);
        return response.data;
    },

    /**
     * Set staff score directly (admin only)
     * @param {string} id - Staff ID
     * @param {number} score - New score (0-100)
     * @param {string} reason - Reason for change
     */
    setStaffScore: async (id, score, reason = '') => {
        const response = await api.put(`/staff/${id}/set-score`, { score, reason });
        return response.data;
    },

    /**
     * Get staff attendance statistics
     * @param {string} id - Staff ID
     */
    getStaffAttendanceStats: async (id) => {
        const response = await api.get(`/staff/${id}/attendance-stats`);
        return response.data;
    },

    // ==================== STAFF SCORING METHODS ====================

    /**
     * Create or update staff performance score
     * @param {Object} scoreData - { staff_id, staff_name, attendance_score, hygiene_score, discipline_score, notes }
     */
    updateStaffScore: async (scoreData) => {
        const response = await api.post('/staff/score', scoreData);
        return response.data;
    },

    /**
     * Get staff score for current month
     * @param {string} staffId - Staff ID
     */
    getCurrentMonthScore: async (staffId) => {
        const response = await api.get(`/staff/${staffId}/score/current`);
        return response.data;
    },

    /**
     * Get staff score for a specific month
     * @param {string} staffId - Staff ID
     * @param {string} monthYear - Month in YYYY-MM format (e.g., "2026-03")
     */
    getMonthScore: async (staffId, monthYear) => {
        const response = await api.get(`/staff/${staffId}/score/${monthYear}`);
        return response.data;
    },

    /**
     * Get staff score history
     * @param {string} staffId - Staff ID
     * @param {number} limit - Number of months to retrieve (default: 12)
     */
    getStaffScoreHistory: async (staffId, limit = 12) => {
        const response = await api.get(`/staff/${staffId}/score/history`, { params: { limit } });
        return response.data;
    },

    /**
     * Get monthly leaderboard
     * @param {string} monthYear - Optional month in YYYY-MM format (default: current month)
     * @param {number} limit - Number of top performers (default: 10)
     */
    getLeaderboard: async (monthYear = '', limit = 10) => {
        const response = await api.get('/staff/scores/leaderboard', {
            params: { month_year: monthYear, limit }
        });
        return response.data;
    }
};

export default staffService;
