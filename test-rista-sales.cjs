const jwt = require('jsonwebtoken');
const axios = require('axios');

// Configuration
const CONFIG = {
    apiKey: '4b78002c-adc1-44b7-b588-7e1fec58d977',
    secretKey: 'pcQmKBT39KtFVRwY8Vl3SSKNqL8Agdrk71id9OBB5uY',
    baseUrl: 'https://api.ristaapps.com/v1'
};

/**
 * Generate JWT token for API authentication
 */
function generateToken(apiKey, secretKey) {
    const payload = {
        iss: apiKey,
        iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, secretKey, { algorithm: 'HS256' });
}

/**
 * Fetch sales data for a specific branch and day
 * Handles pagination automatically
 */
async function fetchSalesData(branch, day) {
    const token = generateToken(CONFIG.apiKey, CONFIG.secretKey);
    let allSales = [];
    let lastKey = null;
    let hasMore = true;
    
    console.log(`Fetching sales data for branch: ${branch}, day: ${day}`);
    
    while (hasMore) {
        try {
            const params = {
                branch: branch,
                day: day,
                limit: '50'
            };
            
            if (lastKey) {
                params.lastKey = lastKey;
            }
            
            const response = await axios.get(`${CONFIG.baseUrl}/sales/page`, {
                headers: {
                    'x-api-key': CONFIG.apiKey,
                    'x-api-token': token
                },
                params: params
            });
            
            const data = response.data;
            
            // Add sales records to our collection
            if (data.sales && Array.isArray(data.sales)) {
                allSales = allSales.concat(data.sales);
                console.log(`Fetched ${data.sales.length} records (Total so far: ${allSales.length})`);
            }
            
            // Check if there are more pages
            if (data.lastKey) {
                lastKey = data.lastKey;
            } else {
                hasMore = false;
            }
            
        } catch (error) {
            console.error('Error fetching sales data:', error.response?.data || error.message);
            throw error;
        }
    }
    
    return allSales;
}

/**
 * Calculate total sales from sales records
 */
function calculateTotalSales(salesRecords) {
    let totalSales = 0;
    
    salesRecords.forEach(sale => {
        // Adjust this based on the actual field name in the API response
        // Common field names: amount, total, totalAmount, netAmount, etc.
        if (sale.amount) {
            totalSales += parseFloat(sale.amount) || 0;
        } else if (sale.total) {
            totalSales += parseFloat(sale.total) || 0;
        } else if (sale.netAmount) {
            totalSales += parseFloat(sale.netAmount) || 0;
        }
    });
    
    return totalSales;
}

/**
 * Main function to get total sales
 */
async function getTotalSales(branchId, date) {
    try {
        console.log('='.repeat(50));
        console.log('Rista API - Total Sales Report');
        console.log('='.repeat(50));
        
        // Fetch all sales data
        const salesRecords = await fetchSalesData(branchId, date);
        
        // Calculate total
        const totalSales = calculateTotalSales(salesRecords);
        
        // Display results
        console.log('\n' + '='.repeat(50));
        console.log('RESULTS');
        console.log('='.repeat(50));
        console.log(`Branch ID: ${branchId}`);
        console.log(`Date: ${date}`);
        console.log(`Total Records: ${salesRecords.length}`);
        console.log(`Total Sales: ₹${totalSales.toFixed(2)}`);
        console.log('='.repeat(50));
        
        // Optional: Show breakdown by hour or sale type if data is available
        if (salesRecords.length > 0) {
            console.log('\nSample Record (first):', JSON.stringify(salesRecords[0], null, 2));
        }
        
        return {
            branchId,
            date,
            totalRecords: salesRecords.length,
            totalSales: totalSales,
            records: salesRecords
        };
        
    } catch (error) {
        console.error('Failed to get total sales:', error.message);
        throw error;
    }
}

// Run the script
if (require.main === module) {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node test-rista-sales.js <BRANCH_ID> <DATE>');
        console.log('Example: node test-rista-sales.js BRANCH001 2026-02-23');
        process.exit(1);
    }
    
    const branchId = args[0];
    const date = args[1];
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        console.error('Error: Date must be in YYYY-MM-DD format');
        process.exit(1);
    }
    
    // Run the main function
    getTotalSales(branchId, date)
        .then(() => {
            console.log('\nScript completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\nScript failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    getTotalSales,
    fetchSalesData,
    calculateTotalSales,
    generateToken
};
