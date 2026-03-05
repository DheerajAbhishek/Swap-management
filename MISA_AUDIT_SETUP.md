# Misa Audit Feature - Quick Setup Guide

## What Was Added

### Backend
1. **New Lambda Function**: `supply-misa-audits`
   - Location: `backend/lambdas/supply-misa-audits/`
   - Handles Misa audit CRUD operations
   - Photo upload to S3
   - Attendance validation
   - Time-based status determination

2. **DynamoDB Table**: `supply_misa_audits`
   - Stores daily Misa audit records
   - GSI: `auditor_id-audit_date-index`

3. **S3 Storage**: Photos stored in `swap-management-photos` bucket
   - Path: `misa-audit/{auditor_id}/{timestamp}/{item_id}-{random}.jpg`

### Frontend
1. **New Pages**:
   - `/auditor/misa-audit` - Conduct Misa Audit
   - `/auditor/misa-history` - View audit history

2. **New Service**: `src/services/misaAuditService.js`

3. **Updated Navigation**: Added Misa Audit links to auditor menu

### Files Created/Modified

#### Created:
- `backend/lambdas/supply-misa-audits/index.js` - Lambda function
- `backend/lambdas/supply-misa-audits/package.json` - Dependencies
- `backend/deploy-misa-audit.ps1` - Deployment script
- `src/pages/auditor/MisaAudit.jsx` - Audit submission page
- `src/pages/auditor/MisaAuditHistory.jsx` - Audit history page
- `src/services/misaAuditService.js` - API service
- `MISA_AUDIT_DOCUMENTATION.md` - Complete documentation

#### Modified:
- `src/App.jsx` - Added new routes
- `src/utils/roleGuard.js` - Updated navigation items

---

## Deployment Steps

### 1. Deploy Backend (Lambda + DynamoDB)

```powershell
cd backend
.\deploy-misa-audit.ps1
```

This will:
- Install dependencies
- Create Lambda function
- Create DynamoDB table with GSI

### 2. Configure API Gateway

You need to manually add API Gateway routes. The deployment script will show you the commands.

**Routes to add**:
- `GET /misa-audits` → supply-misa-audits Lambda
- `GET /misa-audits/check` → supply-misa-audits Lambda
- `GET /misa-audits/{id}` → supply-misa-audits Lambda
- `POST /misa-audits` → supply-misa-audits Lambda

**Quick method** (if you have existing API setup):
1. Get your API Gateway ID
2. Create integration to `supply-misa-audits` Lambda
3. Create routes pointing to that integration
4. Grant Lambda invoke permission to API Gateway

### 3. Deploy Frontend

```powershell
# In project root
npm run build
# Deploy to your hosting (Vercel, Netlify, S3, etc.)
```

---

## Testing the Feature

### As an Auditor:

1. **Login** to the system
2. **Navigate** to Dashboard
3. **Mark Attendance** (required before Misa Audit)
4. **Click "Misa Audit"** from navigation
5. **Upload photos** for each item
6. **Submit audit** (check time status!)
7. **View history** in "Misa Audit History"

### Expected Behavior:

- ✓ Before 8:30 AM → Blocked with warning
- ✓ 8:30-9:00 AM → Allowed, marked "On Time"
- ✓ After 9:00 AM → Allowed, marked "Late"
- ✓ Without attendance → Error message
- ✓ Already submitted → Shows completion screen
- ✓ Missing photos → Validation error

---

## Key Features Implemented

✅ **Dynamic Item Loading** - Items fetched from database, not hardcoded  
✅ **Photo Verification** - Mandatory photo for each item  
✅ **Time Window Enforcement** - 8:30-9:00 AM window with status tracking  
✅ **Attendance Integration** - Validates attendance before submission  
✅ **Single Daily Submission** - Prevents duplicate audits per day  
✅ **S3 Photo Storage** - Compressed images stored with metadata  
✅ **Audit History** - View past submissions with photos  
✅ **Mobile Responsive** - Works on mobile and desktop  
✅ **Non-Invasive** - Kitchen Audit unaffected, shared components reused

---

## Configuration Notes

### Lambda Environment Variables
The Lambda uses these AWS resources:
- Region: `ap-south-1`
- DynamoDB Tables:
  - `supply_misa_audits` (main table)
  - `supply_staff_attendance` (for attendance check)
  - `supply_items` (for item list)
- S3 Bucket: `swap-management-photos`

### IAM Permissions Required
Lambda role needs:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-south-1:*:table/supply_misa_audits",
        "arn:aws:dynamodb:ap-south-1:*:table/supply_misa_audits/index/*",
        "arn:aws:dynamodb:ap-south-1:*:table/supply_staff_attendance",
        "arn:aws:dynamodb:ap-south-1:*:table/supply_staff_attendance/index/*",
        "arn:aws:dynamodb:ap-south-1:*:table/supply_items"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::swap-management-photos/misa-audit/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

---

## Troubleshooting

### "Attendance not marked" error
- Make sure auditor has marked attendance for today
- Check `supply_staff_attendance` table

### "Already submitted" error
- Audit already exists for today
- Check `supply_misa_audits` table
- Can view in Misa Audit History

### Photos not uploading
- Check S3 bucket permissions
- Check Lambda CloudWatch logs
- Verify photo size < 5MB

### API errors
- Verify API Gateway routes configured
- Check Lambda permissions
- Review CloudWatch logs

### Time validation not working
- Check browser time settings
- Frontend uses local time
- Backend determines final status

---

## Next Steps After Deployment

1. **Test thoroughly** with different scenarios
2. **Monitor CloudWatch logs** for errors
3. **Track DynamoDB capacity** usage
4. **Set up monitoring alerts** if needed
5. **Train auditors** on how to use the feature
6. **Document any customizations** you make

---

## API Endpoints Summary

```
GET    /misa-audits              - Get all audits for auditor
GET    /misa-audits/check        - Check if submitted today
GET    /misa-audits/{id}         - Get single audit details
POST   /misa-audits              - Submit new audit
```

All endpoints require `Authorization: Bearer <token>` header.

---

## Support

For detailed documentation, see: `MISA_AUDIT_DOCUMENTATION.md`

For issues:
1. Check CloudWatch logs: `/aws/lambda/supply-misa-audits`
2. Review DynamoDB table: `supply_misa_audits`
3. Check S3 bucket: `swap-management-photos/misa-audit/`
4. Refer to Kitchen Audit for similar patterns

---

**Feature Status**: ✅ Complete and ready for deployment  
**Last Updated**: February 26, 2026
