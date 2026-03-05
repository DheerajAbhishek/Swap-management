const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

/**
 * Backfill Discrepancy Types and Adjustment Amounts
 * 
 * This script updates existing discrepancies to include:
 * - discrepancy_type (SHORTAGE or OVERAGE)
 * - item_price (from franchise price table)
 * - adjustment_amount (calculated cost adjustment)
 */

async function backfillDiscrepancyTypes() {
    try {
        console.log('\n' + '='.repeat(60));
        console.log('BACKFILL DISCREPANCY TYPES & ADJUSTMENT AMOUNTS');
        console.log('='.repeat(60));
        console.log('\nStep 1: Scanning all discrepancies...\n');

        const result = await dynamodb.send(new ScanCommand({
            TableName: 'supply_discrepancies'
        }));

        const discrepancies = result.Items || [];

        // Filter discrepancies that need updating (missing new fields)
        const needUpdate = discrepancies.filter(d =>
            !d.discrepancy_type ||
            d.adjustment_amount === undefined ||
            d.item_price === undefined
        );

        console.log(`Total discrepancies: ${discrepancies.length}`);
        console.log(`Need update: ${needUpdate.length}\n`);

        if (needUpdate.length === 0) {
            console.log('✅ All discrepancies are already up to date!');
            return;
        }

        // Cache for franchises to avoid repeated lookups
        const franchiseCache = {};

        async function getFranchiseItems(franchiseId) {
            if (franchiseCache[franchiseId]) {
                return franchiseCache[franchiseId];
            }

            const franchiseResult = await dynamodb.send(new GetCommand({
                TableName: 'supply_franchises',
                Key: { id: franchiseId }
            }));

            const items = franchiseResult.Item?.items || [];
            franchiseCache[franchiseId] = items;
            return items;
        }

        console.log('Step 2: Updating discrepancies with new fields...\n');

        let updated = 0;
        let skipped = 0;
        let failed = 0;

        for (const disc of needUpdate) {
            const discId = disc.id;
            const itemName = disc.item_name;
            const franchiseId = disc.franchise_id;
            const orderedQty = disc.ordered_qty || 0;
            const receivedQty = disc.received_qty || 0;
            const difference = disc.difference !== undefined ? disc.difference : (orderedQty - receivedQty);

            console.log(`\n📦 ${itemName} (${disc.order_number})`);
            console.log(`   Franchise: ${disc.franchise_name}`);
            console.log(`   Ordered: ${orderedQty}, Received: ${receivedQty}, Diff: ${difference}`);

            // Determine discrepancy type
            let discrepancyType = 'SHORTAGE';
            if (difference < 0) {
                discrepancyType = 'OVERAGE';
            } else if (difference === 0) {
                discrepancyType = 'NONE';
            }

            // Get item price from franchise
            let itemPrice = 0;
            try {
                if (franchiseId) {
                    const franchiseItems = await getFranchiseItems(franchiseId);
                    const item = franchiseItems.find(i => i.name === itemName);
                    if (item && item.price) {
                        itemPrice = item.price;
                    } else {
                        console.log(`   ⚠️  Item price not found in franchise catalog, using 0`);
                    }
                } else {
                    console.log(`   ⚠️  No franchise_id, cannot get price`);
                }
            } catch (err) {
                console.log(`   ⚠️  Error getting franchise items: ${err.message}`);
            }

            // Calculate adjustment amount
            const adjustmentAmount = Math.abs(difference) * itemPrice;

            console.log(`   Type: ${discrepancyType}`);
            console.log(`   Item Price: ₹${itemPrice}`);
            console.log(`   Adjustment: ₹${adjustmentAmount}`);

            // Update the discrepancy
            try {
                await dynamodb.send(new UpdateCommand({
                    TableName: 'supply_discrepancies',
                    Key: { id: discId },
                    UpdateExpression: 'SET discrepancy_type = :type, item_price = :price, adjustment_amount = :amount, #diff = :difference',
                    ExpressionAttributeNames: {
                        '#diff': 'difference'
                    },
                    ExpressionAttributeValues: {
                        ':type': discrepancyType,
                        ':price': itemPrice,
                        ':amount': adjustmentAmount,
                        ':difference': difference
                    }
                }));

                console.log(`   ✅ Updated successfully`);
                updated++;
            } catch (err) {
                console.log(`   ❌ Failed to update: ${err.message}`);
                failed++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Successfully updated: ${updated}`);
        console.log(`⚠️  Skipped: ${skipped}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Total processed: ${needUpdate.length}`);
        console.log('='.repeat(60) + '\n');

        if (updated > 0) {
            console.log('✨ Backfill complete! All discrepancies now have:');
            console.log('   • discrepancy_type (SHORTAGE/OVERAGE)');
            console.log('   • item_price (from franchise catalog)');
            console.log('   • adjustment_amount (cost adjustment)\n');
        }

    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the backfill
console.log('\n🚀 Starting discrepancy backfill process...');
backfillDiscrepancyTypes()
    .then(() => {
        console.log('✅ Process completed successfully\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Process failed:', error);
        process.exit(1);
    });
