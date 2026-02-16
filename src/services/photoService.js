import api from './api';

/**
 * Photo Service - Handle photo uploads to S3
 */
export const photoService = {
    /**
     * Upload a single photo
     * @param {Object} photo - { data: base64, name: string, type: string }
     * @param {string} folder - Folder path (e.g., 'complaints', 'orders/dispatch')
     * @returns {Promise<string>} - S3 URL of uploaded photo
     */
    async uploadPhoto(photo, folder = 'general') {
        try {
            const response = await api.post('/photos/upload', {
                image: photo.data,
                filename: photo.name,
                contentType: photo.type,
                folder
            });
            return response.data.url;
        } catch (err) {
            console.error('Failed to upload photo:', err);
            throw new Error('Failed to upload photo');
        }
    },

    /**
     * Upload multiple photos
     * @param {Array} photos - Array of photo objects
     * @param {string} folder - Folder path
     * @returns {Promise<Array>} - Array of S3 URLs
     */
    async uploadPhotos(photos, folder = 'general') {
        const urls = [];
        for (const photo of photos) {
            // If already has URL (from S3), skip upload
            if (photo.url && !photo.data?.startsWith('data:')) {
                urls.push(photo.url);
                continue;
            }
            const url = await this.uploadPhoto(photo, folder);
            urls.push(url);
        }
        return urls;
    },

    /**
     * Delete a photo from S3
     * @param {string} url - S3 URL of the photo
     */
    async deletePhoto(url) {
        try {
            await api.delete('/photos', { data: { url } });
        } catch (err) {
            console.error('Failed to delete photo:', err);
        }
    }
};

export default photoService;
