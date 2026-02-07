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
    }
};

export default staffService;
