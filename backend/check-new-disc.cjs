const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

async function checkNewDiscrepancies() {
  try {
    // Get discrepancies for order PO-20260226-ZJLQ
    const result = await dynamodb.send(new ScanCommand({
      TableName: 'supply_discrepancies',
      FilterExpression: 'order_number = :orderNum',
      ExpressionAttributeValues: {
        ':orderNum': 'PO-20260226-ZJLQ'
      }
    }));

    console.log('\n📊 Discrepancies for PO-20260226-ZJLQ:\n');

    if (!result.Items || result.Items.length === 0) {
      console.log('❌ No discrepancies found for this order');
      return;
    }

    result.Items.forEach((disc, index) => {
      console.log(`\n${index + 1}. ${disc.item_name}`);
      console.log(`   Order #: ${disc.order_number}`);
      console.log(`   Ordered: ${disc.ordered_qty} | Received: ${disc.received_qty}`);
      console.log(`   Difference: ${disc.difference}`);
      console.log(`   Type: ${disc.discrepancy_type || '❌ MISSING'}`);
      console.log(`   Item Price: ₹${disc.item_price || '❌ MISSING'}`);
      console.log(`   Adjustment Amount: ₹${disc.adjustment_amount || '❌ MISSING'}`);
      console.log(`   Vendor Acknowledged: ${disc.vendor_acknowledged ? '✓' : '✗'}`);
      console.log(`   Franchise Closed: ${disc.franchise_closed ? '✓' : '✗'}`);
    });

    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkNewDiscrepancies();
