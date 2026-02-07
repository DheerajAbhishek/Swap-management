import api from './api';

/**
 * Attendance Service - API calls for staff attendance
 */
export const attendanceService = {
    /**
     * Get attendance records
     * @param {Object} params - Query parameters (staffId, franchiseId, date, startDate, endDate)
     */
    getAttendance: async (params = {}) => {
        const response = await api.get('/attendance', { params });
        return response.data;
    },

    /**
     * Get attendance records for a specific franchise (for franchise owner)
     * @param {Object} params - { franchise_id, start_date, end_date }
     */
    getAttendanceRecords: async (params = {}) => {
        const response = await api.get('/attendance', { params });
        return response.data;
    },

    /**
     * Get all attendance records (admin only)
     * @param {Object} params - { franchise_id, start_date, end_date }
     */
    getAllAttendanceRecords: async (params = {}) => {
        const response = await api.get('/attendance', { params: { ...params, all: true } });
        return response.data;
    },

    /**
     * Get today's attendance for current user
     */
    getTodayAttendance: async () => {
        const response = await api.get('/attendance/today');
        return response.data;
    },

    /**
     * Get attendance report
     * @param {Object} params - { type: 'daily'|'weekly', date, franchiseId }
     */
    getAttendanceReport: async (params = {}) => {
        const response = await api.get('/attendance/report', { params });
        return response.data;
    },

    /**
     * Mark check-in with photos
     * @param {Object} data - { selfie_photo: base64, shoes_photo: base64 }
     */
    checkIn: async (data) => {
        const response = await api.post('/attendance/checkin', data);
        return response.data;
    },

    /**
     * Mark check-out
     */
    checkOut: async () => {
        const response = await api.post('/attendance/checkout');
        return response.data;
    }
};

export default attendanceService;
