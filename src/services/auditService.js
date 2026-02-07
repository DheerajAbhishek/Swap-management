import api from './api';

/**
 * Audit Service - Manage audits
 */
export const auditService = {
    /**
     * Get all audits (Admin only)
     */
    async getAudits() {
        const response = await api.get('/audits');
        return Array.isArray(response.data) ? response.data : [];
    },

    /**
     * Get audits by franchise
     */
    async getAuditsByFranchise(franchiseId) {
        const response = await api.get(`/audits?franchise_id=${franchiseId}`);
        return Array.isArray(response.data) ? response.data : [];
    },

    /**
     * Get audits by auditor
     */
    async getAuditsByAuditor(auditorId) {
        const response = await api.get(`/audits?auditor_id=${auditorId}`);
        return Array.isArray(response.data) ? response.data : [];
    },

    /**
     * Get single audit
     */
    async getAudit(auditId) {
        const response = await api.get(`/audits/${auditId}`);
        return response.data;
    },

    /**
     * Submit new audit (Auditor only)
     */
    async submitAudit(data) {
        const response = await api.post('/audits', data);
        return response.data;
    },

    /**
     * Update audit (Admin only - for notes/status)
     */
    async updateAudit(auditId, data) {
        const response = await api.put(`/audits/${auditId}`, data);
        return response.data;
    },

    /**
     * Delete audit (Admin only)
     */
    async deleteAudit(auditId) {
        const response = await api.delete(`/audits/${auditId}`);
        return response.data;
    },

    /**
     * Get all auditors (Admin only)
     */
    async getAuditors() {
        const response = await api.get('/auditors');
        return Array.isArray(response.data) ? response.data : [];
    },

    /**
     * Get single auditor
     */
    async getAuditor(auditorId) {
        const response = await api.get(`/auditors/${auditorId}`);
        return response.data;
    },

    /**
     * Create new auditor (Admin only)
     */
    async createAuditor(data) {
        const response = await api.post('/auditors', data);
        return response.data;
    },

    /**
     * Update auditor (Admin only)
     */
    async updateAuditor(auditorId, data) {
        const response = await api.put(`/auditors/${auditorId}`, data);
        return response.data;
    },

    /**
     * Delete auditor (Admin only)
     */
    async deleteAuditor(auditorId) {
        const response = await api.delete(`/auditors/${auditorId}`);
        return response.data;
    },

    /**
     * Reset auditor password (Admin only)
     */
    async resetAuditorPassword(auditorId, newPassword) {
        const response = await api.put(`/auditors/${auditorId}/reset-password`, { password: newPassword });
        return response.data;
    }
};

export default auditService;
