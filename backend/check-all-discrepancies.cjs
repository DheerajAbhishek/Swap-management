const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

async function checkAllDiscrepancies() {
    try {
        const result = await dynamodb.send(new ScanCommand({
            TableName: 'supply_discrepancies'
        }));
        
        const discrepancies = result.Items || [];
        
        console.log(`Total discrepancies: ${discrepancies.length}\n`);
        
        discrepancies.forEach(d => {
            console.log(`ID: ${d.id}`);
            console.log(`  Order: ${d.order_number}`);
            console.log(`  Item: ${d.item_name}`);
            console.log(`  Franchise: ${d.franchise_name} (${d.franchise_id})`);
            console.log(`  Vendor ID: ${d.vendor_id || 'NULL/MISSING'}`);
            console.log(`  Vendor Name: ${d.vendor_name || 'NULL/MISSING'}`);
            console.log(`  Created: ${d.created_at}`);
            console.log('---');
        });
        
        const withVendor = discrepancies.filter(d => d.vendor_id);
        const withoutVendor = discrepancies.filter(d => !d.vendor_id);
        
        console.log(`\nSummary:`);
        console.log(`- With vendor_id: ${withVendor.length}`);
        console.log(`- Without vendor_id: ${withoutVendor.length}`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAllDiscrepancies();
