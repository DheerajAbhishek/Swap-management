# Photo Upload Fix - Quick Deployment Guide

## Problem
Photo uploads for payments, dispatch, and accept (to S3) were not working because:
1. The `supply-photos` Lambda function was not deployed
2. API Gateway routes for `/photos/upload` and `/photos` were missing
3. S3 bucket `swap-management-photos` was not created
4. Lambda IAM role did not have S3 permissions

## Solution
Run the photo deployment script to fix all issues:

```powershell
cd backend
.\deploy-photos.ps1
```

## What the Script Does

1. **Creates S3 Bucket** (`swap-management-photos`)
   - Configures public read access for viewing photos
   - Sets up appropriate bucket policies

2. **Updates Lambda IAM Role**
   - Adds S3 permissions (PutObject, GetObject, DeleteObject)
   - Updates `supply-system-lambda-role` policy

3. **Deploys supply-photos Lambda**
   - Installs AWS SDK dependencies (@aws-sdk/client-s3)
   - Creates/updates the Lambda function
   - Sets proper timeout and memory settings

4. **Configures API Gateway**
   - Adds POST /photos/upload route
   - Adds DELETE /photos route
   - Links routes to supply-photos Lambda
   - Grants API Gateway permission to invoke Lambda

## Manual Steps (if needed)

If you already have AWS infrastructure deployed and just need to add photos:

```powershell
# Option 1: Run the dedicated photo deployment script
cd backend
.\deploy-photos.ps1

# Option 2: Redeploy everything (includes photos)
cd backend
.\deploy-all.ps1
```

## Verify Deployment

After running the script:

1. Check S3 bucket exists:
   ```powershell
   aws s3 ls | findstr swap-management-photos
   ```

2. Check Lambda function:
   ```powershell
   aws lambda get-function --function-name supply-photos --region ap-south-1
   ```

3. Check API routes:
   ```powershell
   aws apigatewayv2 get-routes --api-id <YOUR_API_ID> --region ap-south-1
   ```
   Look for routes with `/photos` in them.

## Testing Photo Upload

Once deployed, test photo upload features:

1. **Payment Screenshot Upload** (Admin → Vendor Ledger)
   - Go to Admin → Vendor Ledger
   - Select orders to pay
   - Upload payment screenshot
   - Should upload to S3 successfully

2. **Order Dispatch Photos** (Kitchen → Orders)
   - Accept an order
   - Add dispatch photos when dispatching
   - Photos should upload to `orders/{orderId}/dispatch/` folder in S3

3. **Order Receive Photos** (Franchise → Confirm Receipt)
   - Receive an order
   - Add receive photos
   - Photos should upload to `orders/{orderId}/receive/` folder in S3

## Files Modified

- `backend/deploy-lambdas.ps1` - Added supply-photos deployment
- `backend/setup-api-gateway.ps1` - Added photo routes
- `backend/deploy-new-features.ps1` - Added photos to feature deployment
- `backend/lambda-policy.json` - Added S3 permissions
- `backend/lambdas/supply-photos/package.json` - Created with AWS SDK dependency
- `backend/deploy-photos.ps1` - **New standalone deployment script**

## Troubleshooting

### Error: "Bucket already exists"
This is fine - the script will skip bucket creation and use the existing one.

### Error: "Route already exists"
This is fine - the script will skip route creation.

### Photos still not uploading
1. Check browser console for errors
2. Verify API endpoint in `.env` file
3. Check CloudWatch logs for supply-photos Lambda:
   ```powershell
   aws logs tail /aws/lambda/supply-photos --follow --region ap-south-1
   ```

### 403 Forbidden errors
- Lambda may not have S3 permissions
- Run the deployment script again to update IAM policies

### CORS errors
- API Gateway CORS should be configured in setup-api-gateway.ps1
- Check that CORS headers are in the Lambda response

## Architecture

```
Frontend (photoService.js)
    ↓
    POST /photos/upload
    ↓
API Gateway (supply-system-api)
    ↓
Lambda (supply-photos)
    ↓
S3 Bucket (swap-management-photos)
```

Photos are stored with this structure:
```
swap-management-photos/
├── payment-screenshots/
│   └── {timestamp}-{random}.jpg
├── orders/
│   ├── {orderId}/
│   │   ├── dispatch/
│   │   │   └── {timestamp}-{random}.jpg
│   │   └── receive/
│   │       └── {timestamp}-{random}.jpg
├── complaints/
│   └── {timestamp}-{random}.jpg
└── general/
    └── {timestamp}-{random}.jpg
```
