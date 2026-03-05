const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "ap-south-1" });
const dynamodb = DynamoDBDocumentClient.from(client);

async function seedTestData() {
    // Get test franchise
    const scanResult = await dynamodb.send(new ScanCommand({
        TableName: "supply_orders",
        FilterExpression: "contains(franchise_name, :test)",
        ExpressionAttributeValues: { ":test": "test" },
        Limit: 1
    }));
    
    if (!scanResult.Items || scanResult.Items.length === 0) {
        console.log("No test franchise found!");
        return;
    }
    
    const testFranchise = scanResult.Items[0];
    console.log(`Using franchise: ${testFranchise.franchise_name} (${testFranchise.franchise_id})\n`);
    
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    
    console.log(`Today: ${todayStr}`);
    console.log(`Yesterday: ${yesterdayStr}`);
    console.log(`Tomorrow: ${tomorrowStr}\n`);
    
    const testOrders = [
        {
            order_number: `PO-${todayStr}-TEST1`,
            delivery_date: todayStr,
            amount: 1500.00,
            description: "Today''s delivery - Vegetables"
        },
        {
            order_number: `PO-${todayStr}-TEST2`,
            delivery_date: todayStr,
            amount: 2300.50,
            description: "Today''s delivery - Dairy"
        },
        {
            order_number: `PO-${yesterdayStr}-TEST`,
            delivery_date: yesterdayStr,
            amount: 890.25,
            description: "Yesterday''s delivery"
        },
        {
            order_number: `PO-${tomorrowStr}-TEST`,
            delivery_date: tomorrowStr,
            amount: 1250.75,
            description: "Tomorrow''s delivery"
        }
    ];
    
    console.log("Creating test orders...\n");
    
    for (const testOrder of testOrders) {
        const order = {
            id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            order_number: testOrder.order_number,
            franchise_id: testFranchise.franchise_id,
            franchise_name: testFranchise.franchise_name,
            vendor_id: "vendor-test",
            vendor_name: "Test Vendor",
            total_amount: testOrder.amount,
            status: "RECEIVED",
            delivery_date: testOrder.delivery_date,
            created_at: new Date().toISOString(),
            received_at: new Date().toISOString(),
            notes: testOrder.description
        };
        
        await dynamodb.send(new PutCommand({
            TableName: "supply_orders",
            Item: order
        }));
        
        console.log(` Created ${testOrder.order_number}`);
        console.log(`  Delivery Date: ${testOrder.delivery_date}`);
        console.log(`  Amount: ${testOrder.amount.toFixed(2)}`);
        console.log(`  Description: ${testOrder.description}\n`);
        
        // Small delay to avoid duplicate IDs
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log("=== SUMMARY ===");
    console.log(`Yesterday (${yesterdayStr}): 890.25`);
    console.log(`Today (${todayStr}): 3,800.50 (2 orders)`);
    console.log(`Tomorrow (${tomorrowStr}): 1,250.75`);
    console.log("\nNow open Daily Entry and select today''s date to see 3,800.50 in bills!");
}

seedTestData().catch(console.error);
