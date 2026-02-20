/**
 * Migration Script: Move Attendance Photos from DynamoDB to S3
 * 
 * This script:
 * 1. Scans all attendance records in DynamoDB
 * 2. Identifies records with base64-encoded photos
 * 3. Uploads photos to S3
 * 4. Updates DynamoDB records with S3 URLs
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const dynamoClient = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: 'ap-south-1' });

const ATTENDANCE_TABLE = 'supply_staff_attendance';
const S3_BUCKET = 'swap-management-photos';

// Upload photo to S3
async function uploadPhotoToS3(base64Image, photoType, staffId, recordId, timestamp) {
    try {
        if (!base64Image || !base64Image.startsWith('data:')) {
            // Already a URL, skip
            return base64Image;
        }

        // Extract base64 data
        const imageData = base64Image.split(',')[1];
        
        // Generate unique filename
        const random = Math.random().toString(36).substr(2, 8);
        const key = `attendance/${staffId}/${timestamp}-${photoType}-${random}.jpg`;

        // Convert base64 to buffer
        const buffer = Buffer.from(imageData, 'base64');

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: 'image/jpeg',
            Metadata: {
                'photo-type': photoType,
                'staff-id': staffId,
                'record-id': recordId,
                'migrated': 'true',
                'migration-date': new Date().toISOString()
            }
        }));

        // Return S3 URL
        return `https://${S3_BUCKET}.s3.ap-south-1.amazonaws.com/${key}`;
    } catch (error) {
        console.error(`Error uploading ${photoType} photo:`, error.message);
        throw error;
    }
}

// Check if photo is base64 encoded
function isBase64Photo(photo) {
    return photo && typeof photo === 'string' && photo.startsWith('data:image');
}

// Migrate a single attendance record
async function migrateRecord(record) {
    const { id, staff_id, selfie_photo, shoes_photo, mesa_photo, standing_area_photo, checkin_time } = record;
    
    // Check if any photos need migration
    const needsMigration = 
        isBase64Photo(selfie_photo) || 
        isBase64Photo(shoes_photo) || 
        isBase64Photo(mesa_photo) || 
        isBase64Photo(standing_area_photo);

    if (!needsMigration) {
        console.log(`  ✓ Record ${id} - already migrated or no photos`);
        return { migrated: false, skipped: true };
    }

    console.log(`  → Migrating record ${id} for staff ${staff_id}...`);

    const timestamp = new Date(checkin_time).getTime();
    const updates = {};
    const photosUploaded = [];

    try {
        // Upload selfie photo
        if (isBase64Photo(selfie_photo)) {
            updates.selfie_photo = await uploadPhotoToS3(selfie_photo, 'selfie', staff_id, id, timestamp);
            photosUploaded.push('selfie');
        }

        // Upload shoes photo
        if (isBase64Photo(shoes_photo)) {
            updates.shoes_photo = await uploadPhotoToS3(shoes_photo, 'shoes', staff_id, id, timestamp);
            photosUploaded.push('shoes');
        }

        // Upload mesa photo
        if (isBase64Photo(mesa_photo)) {
            updates.mesa_photo = await uploadPhotoToS3(mesa_photo, 'mesa', staff_id, id, timestamp);
            photosUploaded.push('mesa');
        }

        // Upload standing area photo
        if (isBase64Photo(standing_area_photo)) {
            updates.standing_area_photo = await uploadPhotoToS3(standing_area_photo, 'standing-area', staff_id, id, timestamp);
            photosUploaded.push('standing-area');
        }

        // Update DynamoDB record with URLs
        if (Object.keys(updates).length > 0) {
            const updateExpression = Object.keys(updates)
                .map((key, idx) => `${key} = :val${idx}`)
                .join(', ');

            const expressionAttributeValues = {};
            Object.keys(updates).forEach((key, idx) => {
                expressionAttributeValues[`:val${idx}`] = updates[key];
            });

            await dynamodb.send(new UpdateCommand({
                TableName: ATTENDANCE_TABLE,
                Key: { id },
                UpdateExpression: `SET ${updateExpression}, migrated_to_s3 = :migrated, migration_date = :migDate`,
                ExpressionAttributeValues: {
                    ...expressionAttributeValues,
                    ':migrated': true,
                    ':migDate': new Date().toISOString()
                }
            }));

            console.log(`  ✓ Record ${id} - migrated ${photosUploaded.length} photos: ${photosUploaded.join(', ')}`);
            return { migrated: true, photosCount: photosUploaded.length };
        }

        return { migrated: false, skipped: true };
    } catch (error) {
        console.error(`  ✗ Record ${id} - FAILED:`, error.message);
        return { migrated: false, error: error.message };
    }
}

// Main migration function
async function migrateAllPhotos() {
    console.log('\n========================================');
    console.log('Attendance Photos Migration to S3');
    console.log('========================================\n');

    console.log('Scanning attendance records...\n');

    let records = [];
    let lastEvaluatedKey = undefined;

    // Scan all records (handle pagination)
    do {
        const scanParams = {
            TableName: ATTENDANCE_TABLE
        };

        if (lastEvaluatedKey) {
            scanParams.ExclusiveStartKey = lastEvaluatedKey;
        }

        const result = await dynamodb.send(new ScanCommand(scanParams));
        records = records.concat(result.Items || []);
        lastEvaluatedKey = result.LastEvaluatedKey;

        console.log(`  Scanned ${records.length} records so far...`);
    } while (lastEvaluatedKey);

    console.log(`\n✓ Total records found: ${records.length}\n`);

    // Filter records that need migration
    const recordsToMigrate = records.filter(r => 
        isBase64Photo(r.selfie_photo) || 
        isBase64Photo(r.shoes_photo) || 
        isBase64Photo(r.mesa_photo) || 
        isBase64Photo(r.standing_area_photo)
    );

    console.log(`→ Records needing migration: ${recordsToMigrate.length}\n`);

    if (recordsToMigrate.length === 0) {
        console.log('✓ No records need migration. All photos are already in S3!\n');
        return;
    }

    console.log('Starting migration...\n');

    const results = {
        total: recordsToMigrate.length,
        migrated: 0,
        skipped: 0,
        failed: 0,
        totalPhotos: 0
    };

    // Migrate records one by one to avoid overwhelming S3
    for (let i = 0; i < recordsToMigrate.length; i++) {
        const record = recordsToMigrate[i];
        console.log(`[${i + 1}/${recordsToMigrate.length}]`);
        
        const result = await migrateRecord(record);
        
        if (result.migrated) {
            results.migrated++;
            results.totalPhotos += result.photosCount || 0;
        } else if (result.skipped) {
            results.skipped++;
        } else if (result.error) {
            results.failed++;
        }

        // Small delay to avoid rate limiting
        if (i < recordsToMigrate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log('\n========================================');
    console.log('Migration Complete!');
    console.log('========================================\n');
    console.log(`Total records processed: ${results.total}`);
    console.log(`✓ Successfully migrated: ${results.migrated} records (${results.totalPhotos} photos)`);
    console.log(`- Skipped: ${results.skipped}`);
    console.log(`✗ Failed: ${results.failed}`);
    console.log('');

    if (results.failed > 0) {
        console.log('⚠ Some records failed to migrate. Please check the error messages above.');
    } else {
        console.log('✓ All records migrated successfully!');
    }
    console.log('');
}

// Run migration
migrateAllPhotos()
    .then(() => {
        console.log('Migration script finished.');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n✗ Migration script failed:', error);
        process.exit(1);
    });
