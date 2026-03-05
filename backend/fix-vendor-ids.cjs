/**
 * Fix vendor_id on franchise items
 * Updates items that match the BLR vendor's item names to have the correct vendor_id
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-south-1' }));

const BLR_VENDOR_ID = 'vendor-1771574348140'; // Swap Central Kitchen(BLR - Cooked Food)
const BLR_VENDOR_ITEMS = [
  'Brocolli Salad', 'Boiled Eggs', 'Flavoured Brown Rice', 'Chia Pudding',
  'Cooked Millets', 'Corn Salad', 'Flavoured Boiled Basmati Rice', 'Non Spicy Chicken',
  'Grilled Paneer', 'Grilled Shrimp', 'Mint Yoghourt', 'Multigrain Rotis',
  'Oat Meal', 'Rajma Masala Curry', 'Spicy Chicken', 'Tomato Onion Salad',
  'Spicy paneer', 'Soya'
];

async function fixVendorIds() {
  try {
    // Get all franchises
    const result = await client.send(new ScanCommand({
      TableName: 'supply_franchises'
    }));

    console.log('\n=== FIXING VENDOR IDs ===\n');

    for (const franchise of result.Items) {
      // Only fix franchises that have BLR vendor assigned
      if (franchise.vendor_1_id !== BLR_VENDOR_ID && franchise.vendor_2_id !== BLR_VENDOR_ID) {
        console.log(`Skipping ${franchise.name} (BLR vendor not assigned)`);
        continue;
      }

      if (!franchise.items || franchise.items.length === 0) {
        console.log(`Skipping ${franchise.name} (no items)`);
        continue;
      }

      console.log(`\nProcessing: ${franchise.name}`);
      console.log(`Total items: ${franchise.items.length}`);

      // Update items that match BLR vendor's item names
      let updatedCount = 0;
      const updatedItems = franchise.items.map(item => {
        const shouldUpdate = BLR_VENDOR_ITEMS.some(
          blrItemName => blrItemName.toLowerCase() === item.name.toLowerCase()
        );

        if (shouldUpdate && item.vendor_id !== BLR_VENDOR_ID) {
          updatedCount++;
          return { ...item, vendor_id: BLR_VENDOR_ID };
        }
        return item;
      });

      if (updatedCount > 0) {
        console.log(`Updating ${updatedCount} items to BLR vendor...`);

        await client.send(new UpdateCommand({
          TableName: 'supply_franchises',
          Key: { id: franchise.id },
          UpdateExpression: 'SET #items = :items, #updated_at = :updated_at',
          ExpressionAttributeNames: {
            '#items': 'items',
            '#updated_at': 'updated_at'
          },
          ExpressionAttributeValues: {
            ':items': updatedItems,
            ':updated_at': new Date().toISOString()
          }
        }));

        console.log(`✓ Updated ${updatedCount} items`);
      } else {
        console.log('No items to update');
      }
    }

    console.log('\n=== COMPLETED ===\n');
  } catch (error) {
    console.error('Error:', error);
  }
}

fixVendorIds();
