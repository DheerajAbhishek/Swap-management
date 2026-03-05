const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

/**
 * Fix Order Costs for Resolved Discrepancies
 * 
 * This script finds all resolved discrepancies and applies the cost
 * adjustments to their orders (for cases where discrepancies were
 * resolved before the cost adjustment feature was deployed)
 */

async function fixResolvedDiscrepancyCosts() {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('FIX ORDER COSTS FOR RESOLVED DISCREPANCIES');
        console.log('='.repeat(60));
        console.log('\nStep 1: Finding all resolved discrepancies...\n');

        const result = await dynamodb.send(new ScanCommand({
            TableName: 'supply_discrepancies',
            FilterExpression: 'franchise_closed = :closed',
            ExpressionAttributeValues: {
                ':closed': true
            }
        }));

        const resolvedDiscrepancies = result.Items || [];
        console.log(`Found ${resolvedDiscrepancies.length} resolved discrepancies\n`);

        if (resolvedDiscrepancies.length === 0) {
            console.log('✅ No resolved discrepancies to process');
            return;
        }

        // Group by order_id
        const orderGroups = {};
        for (const disc of resolvedDiscrepancies) {
            if (!disc.order_id) continue;
            if (!orderGroups[disc.order_id]) {
                orderGroups[disc.order_id] = [];
            }
            orderGroups[disc.order_id].push(disc);
        }

        console.log(`Grouped into ${Object.keys(orderGroups).length} orders\n`);
        console.log('Step 2: Processing each order...\n');

        let ordersUpdated = 0;
        let ordersSkipped = 0;
        let ordersFailed = 0;

        for (const [orderId, discs] of Object.entries(orderGroups)) {
            // Get order
            const orderResult = await dynamodb.send(new GetCommand({
                TableName: 'supply_orders',
                Key: { id: orderId }
            }));

            const order = orderResult.Item;
            if (!order) {
                console.log(`❌ Order not found: ${orderId}`);
                ordersFailed++;
                continue;
            }

            console.log(`\n📦 Order: ${order.order_number}`);
            console.log(`   Franchise: ${order.franchise_name}`);
            console.log(`   Current Total: ₹${order.total_amount || 0}`);
            console.log(`   Current Vendor Cost: ₹${order.total_vendor_cost || 0}`);

            // Calculate total adjustment for this order
            let totalAdjustment = 0;
            let totalVendorAdjustment = 0;
            let adjustmentDetails = [];

            for (const disc of discs) {
                const type = disc.discrepancy_type;
                const amount = disc.adjustment_amount || 0;

                if (!type || amount === 0) {
                    console.log(`   ⚠️  Skipping ${disc.item_name} - missing type or amount`);
                    continue;
                }

                // For SHORTAGE: reduce cost (received less)
                // For OVERAGE: increase cost (received more)
                const adjustment = type === 'OVERAGE' ? amount : -amount;
                totalAdjustment += adjustment;
                totalVendorAdjustment += adjustment; // Same adjustment for vendor cost

                adjustmentDetails.push({
                    item: disc.item_name,
                    type: type,
                    adjustment: adjustment
                });

                console.log(`   ${type === 'OVERAGE' ? '📦' : '⚠️'}  ${disc.item_name}: ${type} (${adjustment > 0 ? '+' : ''}₹${adjustment})`);
            }

            if (totalAdjustment === 0) {
                console.log(`   → No adjustments needed`);
                ordersSkipped++;
                continue;
            }

            const newTotalAmount = (order.total_amount || 0) + totalAdjustment;
            const newVendorCost = (order.total_vendor_cost || 0) + totalVendorAdjustment;

            console.log(`   💰 Total Adjustment: ${totalAdjustment > 0 ? '+' : ''}₹${totalAdjustment}`);
            console.log(`   → New Total: ₹${newTotalAmount}`);
            console.log(`   → New Vendor Cost: ₹${newVendorCost}`);

            // Update the order
            try {
                await dynamodb.send(new UpdateCommand({
                    TableName: 'supply_orders',
                    Key: { id: orderId },
                    UpdateExpression: 'SET total_amount = :amount, total_vendor_cost = :vendorCost, cost_adjusted = :adjusted, cost_adjusted_at = :adjustedAt',
                    ExpressionAttributeValues: {
                        ':amount': Math.max(0, newTotalAmount),
                        ':vendorCost': Math.max(0, newVendorCost),
                        ':adjusted': true,
                        ':adjustedAt': new Date().toISOString()
                    }
                }));

                console.log(`   ✅ Order updated successfully`);
                ordersUpdated++;
            } catch (err) {
                console.log(`   ❌ Failed to update: ${err.message}`);
                ordersFailed++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Orders updated: ${ordersUpdated}`);
        console.log(`⚠️  Orders skipped: ${ordersSkipped}`);
        console.log(`❌ Orders failed: ${ordersFailed}`);
        console.log(`📊 Total processed: ${Object.keys(orderGroups).length}`);
        console.log('='.repeat(60) + '\n');

        if (ordersUpdated > 0) {
            console.log('✨ Cost adjustments applied retroactively!');
            console.log('   All resolved discrepancies now reflect in order costs.\n');
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the fix
console.log('\n🚀 Starting retroactive cost adjustment...');
fixResolvedDiscrepancyCosts()
    .then(() => {
        console.log('✅ Process completed successfully\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Process failed:', error);
        process.exit(1);
    });
