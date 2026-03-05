const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "ap-south-1" });
const dynamodb = DynamoDBDocumentClient.from(client);

async function removeTestData() {
    // Find the test orders we created
    const result = await dynamodb.send(new ScanCommand({
        TableName: "supply_orders",
        FilterExpression: "contains(order_number, :today) OR contains(order_number, :yesterday) OR contains(order_number, :tomorrow)",
        ExpressionAttributeValues: {
            ":today": "2026-03-02",
            ":yesterday": "2026-03-01",
            ":tomorrow": "2026-03-03"
        }
    }));
    
    const orders = result.Items || [];
    const testOrders = orders.filter(o => 
        o.order_number === "PO-2026-03-01-TEST" ||
        o.order_number === "PO-2026-03-02-TEST1" ||
        o.order_number === "PO-2026-03-02-TEST2" ||
        o.order_number === "PO-2026-03-03-TEST"
    );
    
    console.log(`Found ${testOrders.length} test orders to delete\n`);
    
    for (const order of testOrders) {
        await dynamodb.send(new DeleteCommand({
            TableName: "supply_orders",
            Key: { id: order.id }
        }));
        
        console.log(` Deleted ${order.order_number} (${order.total_amount.toFixed(2)})`);
    }
    
    console.log(`\nAll test data removed successfully!`);
}

removeTestData().catch(console.error);
