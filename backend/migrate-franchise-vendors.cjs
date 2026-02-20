/**
 * Migration Script: Update Franchise and Vendor Structure
 * 
 * Changes:
 * 1. Franchises: vendor_id → vendor_1_id / vendor_2_id
 * 2. Vendors: Add vendor_type ("SFI" or "RAW_MATERIALS")
 * 3. Franchise items: Add vendor_id to track which vendor supplies each item
 * 
 * Mapping:
 * - "Homes Kitchen" → SFI vendor (vendor_1)
 * - "Swap Central Kitchen" → Raw Materials vendor (vendor_2)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(client);

const FRANCHISES_TABLE = 'supply_franchises';
const VENDORS_TABLE = 'supply_vendors';

// Known vendor mappings
const VENDOR_MAPPINGS = {
  'Homes Kitchen': { type: 'SFI', slot: 1 },
  'Swap Central Kitchen': { type: 'RAW_MATERIALS', slot: 2 }
};

async function migrateFranchises() {
  console.log('🔄 Starting franchise migration...\n');

  try {
    // Get all franchises
    const result = await dynamoDB.send(new ScanCommand({
      TableName: FRANCHISES_TABLE
    }));

    const franchises = result.Items || [];
    console.log(`Found ${franchises.length} franchises to migrate\n`);

    for (const franchise of franchises) {
      console.log(`Processing: ${franchise.name} (${franchise.id})`);
      
      const oldVendorId = franchise.vendor_id || '';
      const oldVendorName = franchise.vendor_name || '';

      // Skip if already migrated
      if (franchise.vendor_1_id || franchise.vendor_2_id) {
        console.log(`  ✓ Already migrated\n`);
        continue;
      }

      let updateExpression = 'SET #updated_at = :updated_at';
      const expressionAttributeNames = { '#updated_at': 'updated_at' };
      const expressionAttributeValues = { ':updated_at': new Date().toISOString() };

      // Determine which slot based on vendor name
      const vendorMapping = VENDOR_MAPPINGS[oldVendorName];
      
      if (vendorMapping) {
        if (vendorMapping.slot === 1) {
          // SFI vendor
          updateExpression += ', #vendor_1_id = :vendor_1_id, #vendor_1_name = :vendor_1_name';
          expressionAttributeNames['#vendor_1_id'] = 'vendor_1_id';
          expressionAttributeNames['#vendor_1_name'] = 'vendor_1_name';
          expressionAttributeValues[':vendor_1_id'] = oldVendorId;
          expressionAttributeValues[':vendor_1_name'] = oldVendorName;
          console.log(`  → Setting as vendor_1 (SFI): ${oldVendorName}`);
        } else {
          // Raw Materials vendor
          updateExpression += ', #vendor_2_id = :vendor_2_id, #vendor_2_name = :vendor_2_name';
          expressionAttributeNames['#vendor_2_id'] = 'vendor_2_id';
          expressionAttributeNames['#vendor_2_name'] = 'vendor_2_name';
          expressionAttributeValues[':vendor_2_id'] = oldVendorId;
          expressionAttributeValues[':vendor_2_name'] = oldVendorName;
          console.log(`  → Setting as vendor_2 (Raw Materials): ${oldVendorName}`);
        }

        // Tag existing items with vendor_id if they have items
        if (franchise.items && franchise.items.length > 0) {
          const updatedItems = franchise.items.map(item => ({
            ...item,
            vendor_id: item.vendor_id || oldVendorId // Add vendor_id if not present
          }));
          
          updateExpression += ', #items = :items';
          expressionAttributeNames['#items'] = 'items';
          expressionAttributeValues[':items'] = updatedItems;
          console.log(`  → Tagged ${updatedItems.length} items with vendor_id`);
        }

        // Update franchise
        await dynamoDB.send(new UpdateCommand({
          TableName: FRANCHISES_TABLE,
          Key: { id: franchise.id },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues
        }));

        console.log(`  ✓ Migrated successfully\n`);
      } else {
        console.log(`  ⚠ Unknown vendor: ${oldVendorName} - Skipping\n`);
      }
    }

    console.log('✅ Franchise migration complete!\n');
  } catch (error) {
    console.error('❌ Error migrating franchises:', error);
    throw error;
  }
}

async function migrateVendors() {
  console.log('🔄 Starting vendor migration...\n');

  try {
    // Get all vendors
    const result = await dynamoDB.send(new ScanCommand({
      TableName: VENDORS_TABLE
    }));

    const vendors = result.Items || [];
    console.log(`Found ${vendors.length} vendors to migrate\n`);

    for (const vendor of vendors) {
      console.log(`Processing: ${vendor.name} (${vendor.id})`);

      // Skip if already has vendor_type
      if (vendor.vendor_type) {
        console.log(`  ✓ Already has vendor_type: ${vendor.vendor_type}\n`);
        continue;
      }

      const vendorMapping = VENDOR_MAPPINGS[vendor.name];
      
      if (vendorMapping) {
        // Update vendor with vendor_type
        await dynamoDB.send(new UpdateCommand({
          TableName: VENDORS_TABLE,
          Key: { id: vendor.id },
          UpdateExpression: 'SET #vendor_type = :vendor_type, #updated_at = :updated_at',
          ExpressionAttributeNames: {
            '#vendor_type': 'vendor_type',
            '#updated_at': 'updated_at'
          },
          ExpressionAttributeValues: {
            ':vendor_type': vendorMapping.type,
            ':updated_at': new Date().toISOString()
          }
        }));

        console.log(`  ✓ Set vendor_type: ${vendorMapping.type}\n`);
      } else {
        console.log(`  ⚠ Unknown vendor - you'll need to manually set vendor_type\n`);
      }
    }

    console.log('✅ Vendor migration complete!\n');
  } catch (error) {
    console.error('❌ Error migrating vendors:', error);
    throw error;
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  try {
    // Check franchises
    const franchisesResult = await dynamoDB.send(new ScanCommand({
      TableName: FRANCHISES_TABLE
    }));

    const franchises = franchisesResult.Items || [];
    const migratedCount = franchises.filter(f => f.vendor_1_id || f.vendor_2_id).length;
    const unmigrated = franchises.filter(f => !f.vendor_1_id && !f.vendor_2_id);

    console.log(`Franchises:`);
    console.log(`  Total: ${franchises.length}`);
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Unmigrated: ${unmigrated.length}`);
    
    if (unmigrated.length > 0) {
      console.log(`\n  Unmigrated franchises:`);
      unmigrated.forEach(f => console.log(`    - ${f.name} (old vendor: ${f.vendor_name || 'none'})`));
    }

    // Check vendors
    const vendorsResult = await dynamoDB.send(new ScanCommand({
      TableName: VENDORS_TABLE
    }));

    const vendors = vendorsResult.Items || [];
    const vendorsWithType = vendors.filter(v => v.vendor_type).length;
    const vendorsWithoutType = vendors.filter(v => !v.vendor_type);

    console.log(`\nVendors:`);
    console.log(`  Total: ${vendors.length}`);
    console.log(`  With vendor_type: ${vendorsWithType}`);
    console.log(`  Without vendor_type: ${vendorsWithoutType.length}`);
    
    if (vendorsWithoutType.length > 0) {
      console.log(`\n  Vendors without type:`);
      vendorsWithoutType.forEach(v => console.log(`    - ${v.name}`));
    }

    console.log('\n✅ Verification complete!\n');
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
    throw error;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('FRANCHISE & VENDOR MIGRATION SCRIPT');
  console.log('='.repeat(60));
  console.log('\n');

  try {
    // Step 1: Migrate vendors first
    await migrateVendors();

    // Step 2: Migrate franchises
    await migrateFranchises();

    // Step 3: Verify
    await verifyMigration();

    console.log('='.repeat(60));
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    process.exit(1);
  }
}

// Run migration
main();
