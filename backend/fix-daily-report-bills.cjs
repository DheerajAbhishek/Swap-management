const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const REPORTS_TABLE = 'supply_daily_reports';
const ORDERS_TABLE = 'supply_orders';

async function fixDailyReportBills() {
    try {
        console.log('🔧 Fixing daily report bill totals...\n');

        // Get all daily reports
        let allReports = [];
        let lastEvaluatedKey = null;

        do {
            const params = { TableName: REPORTS_TABLE };
            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }

            const result = await dynamodb.send(new ScanCommand(params));
            allReports = allReports.concat(result.Items || []);
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        console.log(`📦 Found ${allReports.length} daily reports\n`);

        // Get all orders (we need to match them by franchise and delivery_date)
        let allOrders = [];
        lastEvaluatedKey = null;

        do {
            const params = { TableName: ORDERS_TABLE };
            if (lastEvaluatedKey) {
                params.ExclusiveStartKey = lastEvaluatedKey;
            }

            const result = await dynamodb.send(new ScanCommand(params));
            allOrders = allOrders.concat(result.Items || []);
            lastEvaluatedKey = result.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        console.log(`📦 Found ${allOrders.length} orders\n`);

        let successCount = 0;
        let unchangedCount = 0;
        let errorCount = 0;

        for (const report of allReports) {
            try {
                const franchiseId = report.franchise_id;
                const reportDate = report.report_date;

                // Calculate CORRECT bill_total based on delivery_date
                const ordersForDate = allOrders.filter(order => {
                    if (order.status !== 'RECEIVED' && order.status !== 'DELIVERED') return false;
                    if (order.franchise_id !== franchiseId) return false;

                    // Filter by delivery_date
                    const deliveryDate = order.delivery_date;
                    return deliveryDate && deliveryDate === reportDate;
                });

                const correctBillTotal = ordersForDate.reduce((sum, order) => sum + (order.total_amount || 0), 0);
                const oldBillTotal = report.bill_total || 0;

                // Recalculate COGS with correct bill_total
                // Fetch previous day's closing (opening)
                let opening = 0;
                try {
                    const prevDate = new Date(reportDate);
                    prevDate.setDate(prevDate.getDate() - 1);
                    const prevDateStr = prevDate.toISOString().split('T')[0];

                    const prevReport = await dynamodb.send(new QueryCommand({
                        TableName: REPORTS_TABLE,
                        KeyConditionExpression: 'franchise_id = :fid AND report_date = :date',
                        ExpressionAttributeValues: {
                            ':fid': franchiseId,
                            ':date': prevDateStr
                        }
                    }));

                    opening = prevReport.Items?.[0]?.closing_total || 0;
                } catch (err) {
                    // Ignore, opening stays 0
                }

                const sales = report.sales || 0;
                const closingTotal = report.closing_total || 0;
                const wastageTotal = report.wastage_total || 0;

                const correctCogsPercent = sales > 0
                    ? ((opening + correctBillTotal - closingTotal - wastageTotal) / sales) * 100
                    : 0;

                console.log(`\n📝 ${report.franchise_name || franchiseId} - ${reportDate}`);
                console.log(`   Old Bill: ₹${oldBillTotal.toFixed(2)} → New Bill: ₹${correctBillTotal.toFixed(2)}`);
                console.log(`   Orders matched: ${ordersForDate.length}`);

                if (Math.abs(correctBillTotal - oldBillTotal) < 0.01) {
                    console.log(`   ✓ Already correct, skipping`);
                    unchangedCount++;
                    continue;
                }

                // Update the report
                await dynamodb.send(new UpdateCommand({
                    TableName: REPORTS_TABLE,
                    Key: {
                        franchise_id: franchiseId,
                        report_date: reportDate
                    },
                    UpdateExpression: 'SET bill_total = :billTotal, cogs_percent = :cogsPercent, updated_at = :updatedAt',
                    ExpressionAttributeValues: {
                        ':billTotal': correctBillTotal,
                        ':cogsPercent': correctCogsPercent,
                        ':updatedAt': new Date().toISOString()
                    }
                }));

                successCount++;
                console.log(`   ✅ Updated successfully`);

            } catch (err) {
                errorCount++;
                console.error(`   ❌ Failed to update:`, err.message);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total reports: ${allReports.length}`);
        console.log(`✅ Updated: ${successCount}`);
        console.log(`✓ Already correct: ${unchangedCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log('='.repeat(50));

        if (successCount > 0) {
            console.log('\n✨ Daily report bills fixed! All reports now use delivery_date logic.');
        }

    } catch (error) {
        console.error('❌ Error during migration:', error);
        process.exit(1);
    }
}

console.log('🚀 Starting daily report bill fix...\n');
fixDailyReportBills();
