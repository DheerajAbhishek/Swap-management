const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

async function checkDailyReports() {
    try {
        console.log('🔍 Checking daily reports structure...\n');

        const result = await dynamodb.send(new ScanCommand({
            TableName: 'supply_daily_reports',
            Limit: 5 // Check last 5 reports
        }));

        const reports = result.Items || [];
        console.log(`Found ${reports.length} sample reports\n`);

        if (reports.length === 0) {
            console.log('No daily reports found in the table');
            return;
        }

        // Sort by report_date desc
        reports.sort((a, b) => b.report_date.localeCompare(a.report_date));

        console.log('=== SAMPLE DAILY REPORTS ===\n');
        reports.forEach((report, index) => {
            console.log(`--- Report ${index + 1} ---`);
            console.log('Franchise ID:', report.franchise_id);
            console.log('Franchise Name:', report.franchise_name || 'N/A');
            console.log('Report Date (Key):', report.report_date);
            console.log('Sales:', report.sales);
            console.log('Bill Total:', report.bill_total);
            console.log('Closing Total:', report.closing_total);
            console.log('Wastage Total:', report.wastage_total);
            console.log('COGS%:', report.cogs_percent?.toFixed(2) + '%' || 'N/A');
            console.log('Created At:', report.created_at);
            console.log('');
        });

        console.log('\n=== KEY STRUCTURE ===');
        console.log('Partition Key: franchise_id');
        console.log('Sort Key: report_date (YYYY-MM-DD)');
        console.log('\n=== CURRENT LOGIC ===');
        console.log('When user selects a date in Daily Entry:');
        console.log('1. Filters orders by delivery_date = selected date');
        console.log('2. Calculates bill_total from those orders');
        console.log('3. Saves report with report_date = selected date');
        console.log('\n✅ This means: report_date represents the BUSINESS DAY');
        console.log('   and includes orders DELIVERED on that day');

    } catch (error) {
        console.error('Error:', error);
    }
}

checkDailyReports();
