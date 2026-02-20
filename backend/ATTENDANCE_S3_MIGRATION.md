# Attendance Photo Storage Fix - S3 Migration

## Problem Fixed

**Issue:** Staff check-in was failing with "Internal Server Error" due to DynamoDB's 400KB item size limit. Check-in requires 4 photos (selfie, shoes, mesa, standing area), and when stored as base64 in DynamoDB, the total size exceeded 400KB.

**Error Message:** `ValidationException: Item size has exceeded the maximum allowed size`

## Solution

Migrated photo storage from DynamoDB to S3:
- Photos are now uploaded to S3 bucket: `swap-management-photos`
- Only S3 URLs are stored in DynamoDB (reduces item size to ~2KB)
- Parallel photo uploads for better performance
- Existing photos migrated from DynamoDB to S3

## What Changed

### 1. Updated Lambda Function: `supply-attendance`

**New Features:**
- Added S3Client for photo uploads
- New helper function: `uploadPhotoToS3()` - uploads photos in parallel
- Photos stored in S3 path: `attendance/{staff_id}/{timestamp}-{photo_type}.jpg`
- Graceful error handling for photo upload failures

**Changes to Check-in Flow:**
```javascript
// OLD: Store base64 directly in DynamoDB (400KB+ per record)
selfie_photo: "data:image/jpeg;base64,/9j/4AAQ..." // ❌ Too large

// NEW: Upload to S3, store URL (few bytes)
selfie_photo: "https://swap-management-photos.s3.ap-south-1.amazonaws.com/attendance/..." // ✓ Small & efficient
```

### 2. New Files Created

- **`migrate-attendance-photos.js`** - One-time migration script
  - Scans all attendance records
  - Uploads base64 photos to S3
  - Updates DynamoDB with S3 URLs
  - Safe, idempotent, handles errors gracefully

- **`deploy-attendance-with-s3.ps1`** - Deployment script
  - Verifies S3 bucket exists
  - Updates IAM permissions
  - Deploys updated Lambda
  - Optionally runs migration

- **`lambdas/supply-attendance/package.json`** - Dependencies
  - Added `@aws-sdk/client-s3` for S3 operations

### 3. IAM Permissions (Already in Place)

The `lambda-policy.json` already includes necessary S3 permissions:
```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:PutObjectAcl"],
  "Resource": "arn:aws:s3:::swap-management-photos/*"
}
```

## Deployment Instructions

### Prerequisites
1. Node.js installed (for migration script)
2. AWS CLI configured with proper credentials
3. S3 bucket `swap-management-photos` exists (created by `deploy-photos.ps1`)

### Steps

1. **Deploy the updated Lambda:**
   ```powershell
   cd backend
   .\deploy-attendance-with-s3.ps1
   ```

2. **The script will:**
   - ✓ Verify S3 bucket exists
   - ✓ Update IAM permissions
   - ✓ Install npm dependencies
   - ✓ Deploy updated Lambda function
   - ✓ Ask if you want to run migration

3. **Migration (prompted during deployment):**
   - Safe to run multiple times (idempotent)
   - Processes ~10 records per second
   - Shows progress for each record
   - Can also run manually: `node migrate-attendance-photos.js`

### Manual Migration (Optional)

If you skipped migration during deployment:

```powershell
cd backend
node migrate-attendance-photos.js
```

**Migration Output:**
```
========================================
Attendance Photos Migration to S3
========================================

Scanning attendance records...
  Scanned 156 records so far...

✓ Total records found: 156

→ Records needing migration: 12

[1/12]
  → Migrating record att-xyz123 for staff staff-abc...
  ✓ Record att-xyz123 - migrated 4 photos: selfie, shoes, mesa, standing-area

[2/12]
  → Migrating record att-xyz456...
  ✓ Record att-xyz456 - migrated 4 photos: selfie, shoes, mesa, standing-area

...

========================================
Migration Complete!
========================================

Total records processed: 12
✓ Successfully migrated: 12 records (48 photos)
- Skipped: 0
✗ Failed: 0

✓ All records migrated successfully!
```

## Testing

### Test Check-in

1. **Open the app** and navigate to staff check-in
2. **Take 4 photos** (selfie, shoes, mesa, standing area)
3. **Submit check-in**
4. **Expected result:** Success! (No more 500 errors)

### Verify Photos in S3

```powershell
# List photos in S3
aws s3 ls s3://swap-management-photos/attendance/ --recursive --region ap-south-1

# Example output:
# 2026-02-20 10:30:15    45678 attendance/staff-abc123/1771564875-selfie-x7k9m2.jpg
# 2026-02-20 10:30:15    52341 attendance/staff-abc123/1771564875-shoes-p4n8q1.jpg
# 2026-02-20 10:30:15    48923 attendance/staff-abc123/1771564875-mesa-z2v5w7.jpg
# 2026-02-20 10:30:15    51234 attendance/staff-abc123/1771564875-standing-area-m9k3j6.jpg
```

### Check CloudWatch Logs

```powershell
# View recent logs
aws logs tail /aws/lambda/supply-attendance --follow --region ap-south-1

# Look for successful check-in messages
# No more "Item size exceeded" errors!
```

### Verify DynamoDB Records

Check that attendance records now have S3 URLs instead of base64:

```json
{
  "id": "att-xyz123",
  "staff_id": "staff-abc456",
  "date": "2026-02-20",
  "selfie_photo": "https://swap-management-photos.s3.ap-south-1.amazonaws.com/attendance/staff-abc456/1771564875-selfie-x7k9m2.jpg",
  "shoes_photo": "https://swap-management-photos.s3.ap-south-1.amazonaws.com/attendance/staff-abc456/1771564875-shoes-p4n8q1.jpg",
  "mesa_photo": "https://swap-management-photos.s3.ap-south-1.amazonaws.com/attendance/staff-abc456/1771564875-mesa-z2v5w7.jpg",
  "standing_area_photo": "https://swap-management-photos.s3.ap-south-1.amazonaws.com/attendance/staff-abc456/1771564875-standing-area-m9k3j6.jpg"
}
```

## Benefits

✅ **No More Size Limit Errors** - S3 has no practical size limit for images  
✅ **Better Performance** - Parallel photo uploads (4 photos at once)  
✅ **Cost Efficient** - S3 storage is cheaper than DynamoDB for large objects  
✅ **Scalable** - Can handle thousands of check-ins daily  
✅ **Photo URLs** - Easy to display photos in web/mobile apps  
✅ **Public Access** - S3 bucket configured for public read (photos viewable via URL)  

## Photo Storage Details

- **Bucket:** `swap-management-photos`
- **Region:** `ap-south-1`
- **Path Structure:** `attendance/{staff_id}/{timestamp}-{photo_type}-{random}.jpg`
- **Access:** Public read (URLs work directly in browsers)
- **Metadata:** Each photo includes staff_id, photo_type, timestamp

## Rollback (If Needed)

If you need to rollback:

1. **Re-deploy old Lambda:**
   ```powershell
   # Restore from git or manual backup
   git checkout HEAD~1 -- lambdas/supply-attendance/index.js
   .\deploy-lambdas.ps1
   ```

2. **Note:** Old check-ins with S3 URLs will still work (URLs are valid strings)

## Monitoring

### CloudWatch Metrics to Watch

- `supply-attendance` Lambda duration (should be ~200-500ms)
- Error count (should be 0 for check-ins)
- S3 PutObject requests

### Common Issues

**Issue:** "Failed to upload photos"  
**Cause:** IAM permissions or S3 bucket not found  
**Fix:** Run `.\deploy-attendance-with-s3.ps1` again

**Issue:** Photos not visible in app  
**Cause:** S3 bucket not public or CORS not configured  
**Fix:** Run `.\deploy-photos.ps1` to configure bucket

## Support

For issues or questions:
1. Check CloudWatch logs: `/aws/lambda/supply-attendance`
2. Verify S3 bucket exists and is public
3. Confirm IAM permissions are correct
4. Review migration script output for errors

## Architecture

```
Staff Check-in Flow (NEW):

Mobile App
    ↓ (send 4 base64 photos)
supply-attendance Lambda
    ↓ (upload to S3 in parallel)
S3 Bucket: swap-management-photos
    ↓ (get URLs)
supply-attendance Lambda
    ↓ (store URLs in DynamoDB)
DynamoDB: supply_staff_attendance
    ✓ Item size: ~2KB (instead of 400KB+)
```

---

**Last Updated:** 2026-02-20  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
