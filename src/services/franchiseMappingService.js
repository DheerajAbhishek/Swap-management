import api from './api';

/**
 * Get Rista branch ID for a franchise
 * @param {string} franchiseId - The franchise ID from DynamoDB
 * @returns {Promise<string|null>} The Rista branch ID or null if not found
 */
export const getRistaBranchId = async (franchiseId) => {
    try {
        const response = await api.get(`/franchises/${franchiseId}`);
        return response.data?.rista_branch_id || null;
    } catch (error) {
        console.error('Failed to get Rista branch ID:', error);
        return null;
    }
};

/**
 * Static mapping as fallback (in case API is unavailable)
 */
const FRANCHISE_RISTA_MAPPING = {
    'franchise-1771491147552': 'WWR',    // Swap Wework Roshni
    'franchise-1771487755358': 'WWK',    // Swap Wework KE
    'franchise-1771491253345': '91SPBB', // Swap 91sb Blr
    'franchise-1771489162545': 'SMF',    // Swap Captiland
    'franchise-1771491459927': 'WWVS',   // Swap wework Vs
    'franchise-1771491380622': 'WWSS',   // Swap wework Symbiosis
    'franchise-1771488644010': 'RPS',    // Swap wework Rps
    'franchise-1771489078870': '91SPBH'  // Swap 91sb Hyd
};

/**
 * Get Rista branch ID from static mapping (fallback)
 * @param {string} franchiseId - The franchise ID
 * @returns {string|null} The Rista branch ID or null
 */
export const getRistaBranchIdFallback = (franchiseId) => {
    return FRANCHISE_RISTA_MAPPING[franchiseId] || null;
};

export default {
    getRistaBranchId,
    getRistaBranchIdFallback,
    FRANCHISE_RISTA_MAPPING
};
