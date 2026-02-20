/**
 * Import Vendor Items from Excel Data
 * This script adds items to existing vendors in DynamoDB
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'supply_vendors';

// Excel data extracted from the sheet
const VENDOR_ITEMS_DATA = {
  'Homes Kitchen': [
    { name: 'Brocolli Salad', category: 'SFI', unit: 'Kg', vendor_price: 279 },
    { name: 'Boiled Eggs', category: 'Finished Product', unit: 'Nos', vendor_price: 10 },
    { name: 'Flavoured Brown Rice', category: 'SFI', unit: 'Kg', vendor_price: 85 },
    { name: 'Chia Pudding', category: 'Finished Product', unit: 'Nos', vendor_price: 104 },
    { name: 'Cooked Millets', category: 'SFI', unit: 'Kg', vendor_price: 92 },
    { name: 'Corn Salad', category: 'SFI', unit: 'Kg', vendor_price: 150 },
    { name: 'Flavoured Boiled Basmati Rice', category: 'SFI', unit: 'Kg', vendor_price: 98 },
    { name: 'Non Spicy Chicken', category: 'SFI', unit: 'Kg', vendor_price: 557 },
    { name: 'Grilled Paneer', category: 'SFI', unit: 'Kg', vendor_price: 403 },
    { name: 'Grilled Shrimp', category: 'SFI', unit: 'Kg', vendor_price: 596 },
    { name: 'Mint Yoghourt', category: 'SFI', unit: 'Kg', vendor_price: 166 },
    { name: 'Multigrain Rotis', category: 'SFI', unit: 'Nos', vendor_price: 17 },
    { name: 'Oat Meal', category: 'Finished Product', unit: 'Nos', vendor_price: 98 },
    { name: 'Rajma Masala Curry', category: 'SFI', unit: 'Kg', vendor_price: 115 },
    { name: 'Spicy Chicken', category: 'SFI', unit: 'Kg', vendor_price: 569 },
    { name: 'Tomato Onion Salad', category: 'SFI', unit: 'Kg', vendor_price: 107 },
    { name: 'Spicy paneer', category: 'SFI', unit: 'Kg', vendor_price: 363 },
    { name: 'Soya', category: 'SFI', unit: 'Kg', vendor_price: 132 }
  ],
  'Swap Central Kitchen': [
    { name: 'Lettuce(Ice Berg)', category: 'Vegetables', unit: 'Kg', vendor_price: 230 },
    { name: 'Papaya', category: 'Fruits', unit: 'Kg', vendor_price: 81 },
    { name: 'Watermelon', category: 'Fruits', unit: 'Kg', vendor_price: 58 },
    { name: 'Jalapenos', category: 'Vegetables', unit: 'Kg', vendor_price: 138 },
    { name: 'Kitchen Tissue Roll', category: 'Housekeeping', unit: 'Nos', vendor_price: 263 },
    { name: 'Colin', category: 'Housekeeping', unit: 'Nos', vendor_price: 104 },
    { name: 'Garlic Mayo', category: 'Drystore', unit: 'Kgs', vendor_price: 216 },
    { name: 'Sriracha Sauce', category: 'Drystore', unit: 'Kgs', vendor_price: 248 },
    { name: 'Sweet Onion Sauce', category: 'Drystore', unit: 'Kgs', vendor_price: 201 },
    { name: 'Zume Rectnagle Baggage', category: 'Packings', unit: 'Nos', vendor_price: 11 },
    { name: 'Sporks', category: 'Packings', unit: 'Pkts', vendor_price: 105 },
    { name: '250ml Round Bowls', category: 'Packings', unit: 'Nos', vendor_price: 4 },
    { name: 'Brown food packing bags', category: 'Packings', unit: 'Nos', vendor_price: 3 },
    { name: 'Garbage bags', category: 'Housekeeping', unit: 'Nos', vendor_price: 104 },
    { name: 'Tissues(9*9)', category: 'Packings', unit: 'Nos', vendor_price: 17 },
    { name: 'Coke Zero', category: 'FMCG', unit: 'Nos', vendor_price: 38 },
    { name: 'Pineapple', category: 'Fruits', unit: 'Pcs', vendor_price: 61 },
    { name: 'Muskmelon', category: 'Fruits', unit: 'Pcs', vendor_price: 52 },
    { name: 'Kiwi', category: 'Fruits', unit: 'Pcs', vendor_price: 382 },
    { name: 'guava', category: 'Fruits', unit: 'Kg', vendor_price: 76 },
    { name: '500ml Rectangle', category: 'Packings', unit: 'Nos', vendor_price: 7 },
    { name: 'Peanut butter', category: 'Drystore', unit: 'Kg', vendor_price: 276 },
    { name: 'Butter paper', category: 'Packings', unit: 'Roll', vendor_price: 138 }
  ]
};

/**
 * Find vendor by name
 */
async function findVendorByName(vendorName) {
  console.log(`\nSearching for vendor: ${vendorName}`);
  
  // Note: In production, you would use a GSI on vendor name
  // For now, we'll scan the table (suitable for small datasets)
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
  
  const scanClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-south-1' }));
  const result = await scanClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: '#name = :name',
    ExpressionAttributeNames: { '#name': 'name' },
    ExpressionAttributeValues: { ':name': vendorName }
  }));

  if (result.Items && result.Items.length > 0) {
    console.log(`✓ Found vendor: ${vendorName} (ID: ${result.Items[0].id})`);
    return result.Items[0];
  }
  
  console.log(`✗ Vendor not found: ${vendorName}`);
  return null;
}

/**
 * Add items to vendor
 */
async function addItemsToVendor(vendorId, vendorName, items) {
  console.log(`\nAdding ${items.length} items to ${vendorName}...`);

  // Get current vendor data
  const vendorResult = await dynamoDB.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId }
  }));

  if (!vendorResult.Item) {
    console.error(`✗ Vendor not found with ID: ${vendorId}`);
    return false;
  }

  const currentItems = vendorResult.Item.items || [];
  console.log(`Current items count: ${currentItems.length}`);

  // Create new items
  const newItems = items.map(item => ({
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: item.name,
    category: item.category,
    unit: item.unit,
    vendor_price: item.vendor_price,
    franchise_price: 0, // Will be calculated with margin
    created_at: new Date().toISOString()
  }));

  // Combine with existing items
  const allItems = [...currentItems, ...newItems];

  // Update vendor
  await dynamoDB.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: vendorId },
    UpdateExpression: 'SET #items = :items, #updated_at = :updated_at',
    ExpressionAttributeNames: {
      '#items': 'items',
      '#updated_at': 'updated_at'
    },
    ExpressionAttributeValues: {
      ':items': allItems,
      ':updated_at': new Date().toISOString()
    }
  }));

  console.log(`✓ Successfully added ${newItems.length} items`);
  console.log(`Total items now: ${allItems.length}`);
  
  return true;
}

/**
 * Main import function
 */
async function importVendorItems() {
  console.log('========================================');
  console.log('VENDOR ITEMS IMPORT SCRIPT');
  console.log('========================================');

  try {
    for (const [vendorName, items] of Object.entries(VENDOR_ITEMS_DATA)) {
      console.log(`\n--- Processing ${vendorName} ---`);
      
      // Find vendor
      const vendor = await findVendorByName(vendorName);
      
      if (!vendor) {
        console.error(`⚠ Skipping ${vendorName} - vendor not found`);
        console.log(`Please create the vendor first or check the vendor name`);
        continue;
      }

      // Add items
      await addItemsToVendor(vendor.id, vendorName, items);
    }

    console.log('\n========================================');
    console.log('IMPORT COMPLETED');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR during import:', error);
    throw error;
  }
}

// Run the import
if (require.main === module) {
  importVendorItems()
    .then(() => {
      console.log('✓ Import process finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('✗ Import process failed:', error);
      process.exit(1);
    });
}

module.exports = { importVendorItems, findVendorByName, addItemsToVendor };
