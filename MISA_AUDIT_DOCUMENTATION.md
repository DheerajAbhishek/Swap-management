# Misa Audit Feature - Complete Documentation

## Overview
The Misa Audit is a daily morning audit system where auditors must upload photos for each item in the inventory as proof of verification. This feature integrates with the existing audit management system.

## Features

### 1. Daily Photo Audit
- Auditors conduct Misa Audit every morning
- Items are dynamically fetched from the database (not hardcoded)
- Each item requires a photo upload
- Photos are stored in S3 with proper metadata

### 2. Time Window Validation
- **Ideal submission**: 8:30 AM - 9:00 AM
- **Before 8:30 AM**: Submission blocked with warning
- **8:30 AM - 9:00 AM**: Marked as "On Time" ✓
- **After 9:00 AM**: Marked as "Late" but allowed

### 3. Attendance Integration
- Auditor must mark attendance before submitting audit
- Attendance is checked automatically during submission
- Prevents audit submission without attendance

### 4. Single Submission Per Day
- Only one Misa audit allowed per auditor per day
- If already submitted, shows completion status
- Cannot resubmit for the same date

### 5. Audit Record
Each audit stores:
- Auditor ID and name
- Audit date
- Submission timestamp
- Status (ON_TIME/LATE)
- List of items with:
  - Item ID and name
  - Category
  - Photo URL (S3)
  - Optional notes
- Overall notes
- Total item count

---

## Architecture

### Backend

#### Lambda Function
**Location**: `backend/lambdas/supply-misa-audits/index.js`

**Endpoints**:
- `GET /misa-audits` - Get all audits for current auditor
- `GET /misa-audits/check?date=YYYY-MM-DD` - Check if audit exists for date
- `GET /misa-audits/{id}` - Get single audit details
- `POST /misa-audits` - Submit new Misa audit

**Dependencies**:
- `@aws-sdk/client-dynamodb` - DynamoDB operations
- `@aws-sdk/lib-dynamodb` - DynamoDB Document Client
- `@aws-sdk/client-s3` - S3 photo uploads

#### DynamoDB Table
**Table Name**: `supply_misa_audits`

**Schema**:
```javascript
{
  id: String (PK),          // MISA-{timestamp}-{random}
  auditor_id: String,       // Auditor's ID
  auditor_name: String,     // Auditor's name
  audit_date: String,       // YYYY-MM-DD
  submission_time: String,  // ISO timestamp
  status: String,           // ON_TIME | LATE
  items: Array [            // List of audited items
    {
      item_id: String,
      item_name: String,
      category: String,
      photo_url: String,    // S3 URL
      notes: String
    }
  ],
  total_items: Number,      // Count of items
  attendance_id: String,    // Linked attendance record
  notes: String,            // Overall notes
  created_at: String,       // ISO timestamp
  updated_at: String        // ISO timestamp
}
```

**Global Secondary Index**:
- `auditor_id-audit_date-index`
  - PK: `auditor_id`
  - SK: `audit_date`
  - Used for querying auditor's audits

#### S3 Storage
**Bucket**: `swap-management-photos`

**Photo Path Structure**:
```
misa-audit/{auditor_id}/{timestamp}/{item_id}-{random}.jpg
```

**Photo Metadata**:
- `item-id`: Item ID
- `auditor-id`: Auditor ID  
- `timestamp`: Upload timestamp

---

### Frontend

#### Pages
1. **MisaAudit.jsx** (`/auditor/misa-audit`)
   - Main audit submission page
   - Fetches items from database
   - Photo capture for each item
   - Time validation
   - Attendance check
   - Submission handling

2. **MisaAuditHistory.jsx** (`/auditor/misa-history`)
   - View past audit submissions
   - Filter and search audits
   - View audit details with photos
   - Responsive design (desktop + mobile)

#### Service
**Location**: `src/services/misaAuditService.js`

**Methods**:
- `getMisaAudits()` - Fetch all audits
- `getMisaAudit(id)` - Fetch single audit
- `checkAuditExists(date)` - Check if audit submitted for date
- `submitMisaAudit(data)` - Submit new audit

#### Components Used
- **PhotoCapture** - Reusable photo capture component
- Supports camera and file upload
- Image compression and validation
- Mobile-friendly

---

## User Flow

### Morning Workflow (Auditor)

1. **Mark Attendance**
   - Auditor marks attendance for the day
   - Required before Misa audit submission

2. **Navigate to Misa Audit**
   - Click "Misa Audit" from navigation
   - System checks if already submitted today

3. **Review Time Status**
   - Green: 8:30-9:00 AM (On Time window)
   - Yellow: Before 8:30 AM (Too early)
   - Red: After 9:00 AM (Late)

4. **Upload Photos**
   - For each item in the list:
     - Take/upload photo
     - Add optional notes
   - All items must have photos

5. **Add Overall Notes** (Optional)
   - General observations
   - Any issues or highlights

6. **Submit Audit**
   - Validates attendance
   - Validates all photos present
   - Validates time (blocks if before 8:30)
   - Uploads photos to S3
   - Creates audit record
   - Shows confirmation with status

7. **View History**
   - Access past submissions
   - View photos and details
   - Check submission status

---

## Validation Rules

### Submission Validation

1. **Attendance Check**
   - Query: `staff_id = auditor_id AND date = today`
   - Error if not found: "Please mark attendance first"

2. **Duplicate Check**
   - Query: `auditor_id = current_auditor AND audit_date = today`
   - Error if found: "Already submitted for today"

3. **Time Validation (Frontend)**
   - Current time < 8:30 AM → Block submission
   - Current time >= 8:30 AM → Allow submission
   - Status determined at submission time

4. **Photo Validation**
   - All items must have photos
   - Error if any missing: "Please upload photos for all items"
   - Photos must be valid base64 images

### Data Validation

1. **Photo Upload**
   - Max size: 5MB (compressed)
   - Format: JPEG (converted)
   - Max dimensions: 1200x1200
   - Compression quality: 80%

2. **Input Sanitization**
   - Notes: Max 1000 characters
   - Item names: From database only

---

## Deployment Guide

### Prerequisites
- AWS CLI configured
- Lambda execution role with permissions:
  - DynamoDB: Read/Write on tables
  - S3: PutObject on photos bucket
  - CloudWatch Logs: Create/Write logs

### Step 1: Deploy Lambda

```powershell
cd backend
.\deploy-misa-audit.ps1
```

This script will:
1. Install npm dependencies
2. Create deployment package
3. Create/update Lambda function
4. Create DynamoDB table with GSI
5. Display next steps

### Step 2: Configure API Gateway

1. Get your API Gateway ID:
```bash
aws apigatewayv2 get-apis --region ap-south-1
```

2. Create Lambda integration:
```bash
aws apigatewayv2 create-integration \
  --api-id <YOUR_API_ID> \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:ap-south-1:730335484403:function:supply-misa-audits \
  --payload-format-version 2.0 \
  --region ap-south-1
```

3. Create routes (replace `<INTEGRATION_ID>` from step 2):
```bash
# GET /misa-audits
aws apigatewayv2 create-route \
  --api-id <YOUR_API_ID> \
  --route-key "GET /misa-audits" \
  --target "integrations/<INTEGRATION_ID>" \
  --authorization-type JWT \
  --authorizer-id <YOUR_AUTHORIZER_ID> \
  --region ap-south-1

# GET /misa-audits/check
aws apigatewayv2 create-route \
  --api-id <YOUR_API_ID> \
  --route-key "GET /misa-audits/check" \
  --target "integrations/<INTEGRATION_ID>" \
  --authorization-type JWT \
  --authorizer-id <YOUR_AUTHORIZER_ID> \
  --region ap-south-1

# GET /misa-audits/{id}
aws apigatewayv2 create-route \
  --api-id <YOUR_API_ID> \
  --route-key "GET /misa-audits/{id}" \
  --target "integrations/<INTEGRATION_ID>" \
  --authorization-type JWT \
  --authorizer-id <YOUR_AUTHORIZER_ID> \
  --region ap-south-1

# POST /misa-audits
aws apigatewayv2 create-route \
  --api-id <YOUR_API_ID> \
  --route-key "POST /misa-audits" \
  --target "integrations/<INTEGRATION_ID>" \
  --authorization-type JWT \
  --authorizer-id <YOUR_AUTHORIZER_ID> \
  --region ap-south-1
```

4. Grant API Gateway permission to invoke Lambda:
```bash
aws lambda add-permission \
  --function-name supply-misa-audits \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:ap-south-1:730335484403:<YOUR_API_ID>/*/*/misa-audits*" \
  --region ap-south-1
```

### Step 3: Deploy Frontend

```powershell
# Build and deploy frontend
npm run build
# Deploy to your hosting service
```

### Step 4: Test the Feature

1. **Login as Auditor**
2. **Mark Attendance** (if not already done)
3. **Navigate to Misa Audit**
4. **Upload photos for all items**
5. **Submit audit**
6. **Verify in Misa Audit History**

---

## Testing Checklist

### Functional Tests

- [ ] Auditor can view Misa Audit page
- [ ] Items load dynamically from database
- [ ] Photo upload works for each item
- [ ] Time status updates correctly
- [ ] Submission blocked before 8:30 AM
- [ ] Submission allowed after 8:30 AM
- [ ] Status marked as "ON_TIME" (8:30-9:00 AM)
- [ ] Status marked as "LATE" (after 9:00 AM)
- [ ] Attendance validation works
- [ ] Duplicate submission prevented
- [ ] Photos uploaded to S3
- [ ] Audit record created in DynamoDB
- [ ] History page shows submitted audits
- [ ] Can view audit details with photos
- [ ] Navigation updated correctly

### Error Handling Tests

- [ ] Error if attendance not marked
- [ ] Error if already submitted today
- [ ] Error if missing photos
- [ ] Error if invalid photo format
- [ ] Network error handling
- [ ] API timeout handling

### Edge Cases

- [ ] Submit at exactly 8:30 AM
- [ ] Submit at exactly 9:00 AM  
- [ ] Submit with no items in database
- [ ] Submit with 100+ items
- [ ] Large photo upload (near 5MB limit)
- [ ] Multiple auditors submitting simultaneously

---

## Monitoring and Maintenance

### CloudWatch Logs
Monitor Lambda logs:
```bash
aws logs tail /aws/lambda/supply-misa-audits --follow --region ap-south-1
```

### Key Metrics to Track
1. Daily submission rate
2. On-time vs late submissions
3. Average photo size
4. Lambda execution time
5. Error rates

### DynamoDB Capacity
- Monitor read/write capacity
- Adjust provisioned throughput if needed
- Consider switching to on-demand pricing

### S3 Storage
- Monitor bucket size
- Implement lifecycle policies if needed
- Consider archiving old photos

---

## Troubleshooting

### Issue: "Attendance not marked" error
**Solution**: Ensure attendance is marked before submission
- Check attendance table for today's record
- Verify staff_id matches auditor_id

### Issue: Photos not uploading
**Solution**: 
- Check S3 bucket permissions
- Verify Lambda has PutObject permission
- Check photo size and format
- Review CloudWatch logs

### Issue: "Already submitted" error
**Solution**:
- Verify no duplicate submission
- Check DynamoDB for existing record
- If needed, delete record to allow resubmission

### Issue: Time validation not working
**Solution**:
- Check browser time settings
- Verify timezone calculations
- Frontend uses local time, backend uses IST

---

## Future Enhancements

### Potential Features
1. **Offline Mode**: Cache data and submit when online
2. **Photo Annotations**: Add markers/notes on photos
3. **Voice Notes**: Record audio observations
4. **Item Filtering**: Filter by category
5. **Batch Photo Upload**: Upload multiple at once
6. **Admin Dashboard**: View all Misa audits across auditors
7. **Analytics**: Trends and patterns in audits
8. **Notifications**: Remind auditors to submit
9. **Photo Comparison**: Compare with previous day's photos
10. **Export Reports**: Download audit reports

---

## Integration with Existing System

### Shared Components
- **PhotoCapture**: Reused from existing system
- **Layout/Navigation**: Integrated with existing nav
- **Auth Context**: Uses existing authentication
- **API Service**: Uses existing API configuration

### Non-Interference
- Kitchen Audit functionality unaffected
- Separate DynamoDB table
- Separate Lambda function
- Independent routes
- Isolated data flow

### Shared Resources
- S3 bucket (different folder structure)
- Attendance table (referenced, not modified)
- Items table (read-only access)
- Authentication/authorization

---

## API Reference

### GET /misa-audits
Get all Misa audits for authenticated auditor

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
[
  {
    "id": "MISA-1234567890-ABCD",
    "auditor_id": "AUD-123",
    "auditor_name": "John Doe",
    "audit_date": "2026-02-26",
    "submission_time": "2026-02-26T03:45:00.000Z",
    "status": "ON_TIME",
    "items": [...],
    "total_items": 25,
    "notes": "All items verified"
  }
]
```

### GET /misa-audits/check
Check if audit submitted for a date

**Query Parameters**:
- `date` (optional): YYYY-MM-DD format (defaults to today)

**Response**:
```json
{
  "exists": true,
  "audit": { ... }
}
```

### GET /misa-audits/{id}
Get single Misa audit details

**Response**:
```json
{
  "id": "MISA-1234567890-ABCD",
  "auditor_id": "AUD-123",
  "items": [
    {
      "item_id": "item-123",
      "item_name": "Tomatoes",
      "category": "Vegetables",
      "photo_url": "https://s3.amazonaws.com/...",
      "notes": "Fresh stock"
    }
  ],
  ...
}
```

### POST /misa-audits
Submit new Misa audit

**Request Body**:
```json
{
  "audit_date": "2026-02-26",
  "items": [
    {
      "item_id": "item-123",
      "item_name": "Tomatoes",
      "category": "Vegetables",
      "photo": "data:image/jpeg;base64,...",
      "notes": "Optional notes"
    }
  ],
  "notes": "Overall observations"
}
```

**Response**:
```json
{
  "id": "MISA-1234567890-ABCD",
  "status": "ON_TIME",
  "submission_time": "2026-02-26T03:45:00.000Z",
  ...
}
```

---

## Security Considerations

### Authentication
- JWT token required for all endpoints
- Token contains auditor_id
- Only AUDITOR role can access

### Authorization
- Auditors can only see their own audits
- Cannot access other auditors' data
- Admin access not implemented (future)

### Data Validation
- All inputs sanitized
- SQL injection prevention (DynamoDB)
- XSS prevention (React escaping)
- File upload validation

### S3 Security
- Photos stored with private ACL
- Public URL access (consider pre-signed URLs)
- Bucket versioning enabled
- Server-side encryption

---

## Support and Contact

For issues or questions:
1. Check CloudWatch logs
2. Review this documentation
3. Contact system administrator
4. Check existing Kitchen Audit for reference

---

**Document Version**: 1.0  
**Last Updated**: February 26, 2026  
**Author**: System Developer
