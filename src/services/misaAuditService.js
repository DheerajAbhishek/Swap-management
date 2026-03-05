import api from './api';

/**
 * Misa Audit Service - Manage daily morning audits with photo verification
 * Uses presigned S3 URLs for direct photo upload
 */
export const misaAuditService = {
    /**
     * Get all Misa audits for current auditor
     */
    async getMisaAudits() {
        const response = await api.get('/misa-audits');
        return Array.isArray(response.data) ? response.data : [];
    },

    /**
     * Get single Misa audit
     */
    async getMisaAudit(auditId) {
        const response = await api.get(`/misa-audits/${auditId}`);
        return response.data;
    },

    /**
     * Check if Misa audit already submitted for a date
     */
    async checkAuditExists(date) {
        const response = await api.get(`/misa-audits/check?date=${date}`);
        return response.data; // { exists: boolean, audit: object }
    },

    /**
     * Get presigned S3 upload URLs for item photos
     * @param {Array} items - [{ item_id }]
     * @returns {Array} [{ item_id, upload_url, photo_url, key }]
     */
    async getUploadUrls(items) {
        const response = await api.post('/misa-audits/upload-urls', { items });
        return response.data.urls;
    },

    /**
     * Upload a photo directly to S3 using a presigned URL
     * @param {string} presignedUrl - The presigned PUT URL
     * @param {string} base64Photo - The base64 photo data (data URL or raw base64)
     */
    async uploadPhotoToS3(presignedUrl, base64Photo) {
        // Convert base64 to blob
        let base64Data = base64Photo;
        if (base64Photo.startsWith('data:')) {
            base64Data = base64Photo.split(',')[1];
        }
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/jpeg' });

        // PUT directly to S3 (no auth header - presigned URL has it)
        await fetch(presignedUrl, {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': 'image/jpeg' }
        });
    },

    /**
     * Submit new Misa audit (with S3 photo URLs, no base64)
     * @param {Object} data - { audit_date, vendor_id, vendor_name, items: [{ item_id, item_name, category, photo_url, notes, has_complaint, complaint_note }], notes, food_as_per_menu, food_menu_note, misa_dispatch_time }
     */
    async submitMisaAudit(data) {
        const response = await api.post('/misa-audits', data);
        return response.data;
    },

    /**
     * Get audit feedback for kitchen/kitchen-staff (audits for their vendor)
     * @param {string} date - Optional YYYY-MM-DD date filter
     */
    async getAuditFeedbackForVendor(date) {
        const params = date ? `?date=${date}` : '';
        const response = await api.get(`/misa-audits${params}`);
        return Array.isArray(response.data) ? response.data : [];
    }
};

export default misaAuditService;
