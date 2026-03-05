import { handler } from './index.js';

// Mock environment variables
process.env.VITE_RISTA_API_KEY = '4b78002c-adc1-44b7-b588-7e1fec58d977';
process.env.VITE_RISTA_SECRET_KEY = 'pcQmKBT39KtFVRwY8Vl3SSKNqL8Agdrk71id9OBB5uY';

// Create mock event
const mockEvent = {
    httpMethod: 'GET',
    queryStringParameters: {
        branchId: 'MK',
        startDate: '2026-02-23',
        endDate: '2026-02-23',
        channel: 'all',
        groupBy: 'total'
    }
};

// Run the handler
console.log('Testing Rista Sales Lambda Function');
console.log('=====================================');
console.log('Branch ID: MK');
console.log('Date: 2026-02-23');
console.log('Channel: all (showing all channels)');
console.log('');

handler(mockEvent, {})
    .then(response => {
        console.log('Status Code:', response.statusCode);
        console.log('');

        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);

            // Show key metrics
            const insights = data.body.consolidatedInsights;
            console.log('=== SALES SUMMARY ===');
            console.log(`Total Orders: ${insights.noOfOrders}`);
            console.log(`Gross Sale: ₹${insights.grossSale}`);
            console.log(`  - Subtotal: ₹${insights.netOrderBreakdown.subtotal}`);
            console.log(`  - Packaging: ₹${insights.packings}`);
            console.log(`Discounts: ₹${insights.discounts} (${insights.discountPercent}%)`);
            console.log(`GST: ₹${insights.gstOnOrder}`);
            console.log(`Net Sale/Payout: ₹${insights.netSale}`);
            console.log('');
            console.log('Full Response:');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log('Error Response:');
            console.log(response.body);
        }
    })
    .catch(error => {
        console.error('Error running handler:', error);
    });
