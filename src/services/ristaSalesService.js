import api from './api';

const RISTA_LAMBDA_ENDPOINT = import.meta.env.VITE_RISTA_SALES_API_URL ||
    'https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com/rista-sales';

/**
 * Fetch sales data from Rista API via Lambda function
 * @param {Object} params - Query parameters
 * @param {string} params.branchId - Branch/Restaurant ID (e.g., 'MK')
 * @param {string} params.startDate - Start date in YYYY-MM-DD format
 * @param {string} params.endDate - End date in YYYY-MM-DD format
 * @param {string} params.channel - Channel name: 'all', 'swiggy', 'zomato', 'takeaway', 'corporate'
 * @param {string} params.groupBy - Grouping: 'total', 'week', 'month'
 * @returns {Promise<Object>} Sales data
 */
export const fetchRistaSales = async ({
    branchId,
    startDate,
    endDate,
    channel = 'all',
    groupBy = 'total'
}) => {
    try {
        const response = await fetch(
            `${RISTA_LAMBDA_ENDPOINT}?branchId=${branchId}&startDate=${startDate}&endDate=${endDate}&channel=${channel}&groupBy=${groupBy}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching Rista sales:', error);
        throw error;
    }
};

/**
 * Sync today's sales for a specific branch
 * @param {string} branchId - Branch ID
 * @param {string} channel - Channel filter (default: 'all')
 * @returns {Promise<Object>} Today's sales data
 */
export const syncTodaySales = async (branchId, channel = 'all') => {
    const today = new Date().toISOString().split('T')[0];
    return fetchRistaSales({
        branchId,
        startDate: today,
        endDate: today,
        channel,
        groupBy: 'total'
    });
};

/**
 * Get formatted sales summary for display
 * @param {Object} salesData - Raw sales data from Lambda
 * @returns {Object} Formatted sales summary
 */
export const formatSalesSummary = (salesData) => {
    if (!salesData?.body?.consolidatedInsights) {
        return null;
    }

    const insights = salesData.body.consolidatedInsights;

    return {
        restaurantId: salesData.restaurantId,
        date: salesData.startDate,
        totalOrders: insights.noOfOrders,
        grossSale: insights.grossSale,
        packings: insights.packings,
        discounts: insights.discounts,
        gst: insights.gstOnOrder,
        netSale: insights.netSale,
        payout: insights.payout,

        // Formatted for display
        formatted: {
            grossSale: `₹${insights.grossSale.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            packings: `₹${insights.packings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            discounts: `₹${insights.discounts.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            netSale: `₹${insights.netSale.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            discountPercent: `${insights.discountPercent}%`
        }
    };
};

export default {
    fetchRistaSales,
    syncTodaySales,
    formatSalesSummary
};
