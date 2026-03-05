const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function checkOrder() {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: 'supply_orders',
      Key: { id: 'ord-mm8zngh0igb5lgi5w' }
    }));

    if (!result.Item) {
      console.log('Order not found');
      return;
    }

    const order = result.Item;
    console.log('Order Details:\n');
    console.log(JSON.stringify(order, null, 2));

    console.log('\n--- Analysis ---');
    console.log('Order Number:', order.order_number);
    console.log('Franchise ID:', order.franchise_id);
    console.log('Franchise Name:', order.franchise_name);
    console.log('Vendor ID:', order.vendor_id || '(EMPTY)');
    console.log('Vendor Name:', order.vendor_name || '(EMPTY)');
    console.log('Status:', order.status);
    console.log('Created:', order.created_at);
    console.log('Created By:', order.created_by_name, `(${order.created_by_role})`);
    console.log('Total Amount:', order.total_amount);
    console.log('Delivery Date:', order.delivery_date);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkOrder();
