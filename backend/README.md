# Internal Supply System - AWS Backend

## Overview
This backend uses AWS serverless architecture:
- **DynamoDB** - NoSQL database for data storage
- **Lambda** - Serverless functions for API logic
- **API Gateway** - HTTP API for frontend communication

## Prerequisites
1. AWS CLI installed and configured
2. Node.js 18.x or higher
3. PowerShell (Windows)

## AWS Resources Created

### DynamoDB Tables
| Table Name | Primary Key | GSI |
|------------|-------------|-----|
| supply_users | id | email-index |
| supply_items | id | - |
| supply_orders | id | franchise-index, status-index |
| supply_order_items | id | order-index |
| supply_discrepancies | id | order-index |

### Lambda Functions
| Function | Description |
|----------|-------------|
| supply-auth | Login authentication |
| supply-items | Items CRUD operations |
| supply-orders | Order lifecycle management |
| supply-discrepancies | Discrepancy reporting & resolution |

## Deployment Steps

### Option 1: Run All at Once
```powershell
cd backend
.\deploy-all.ps1
```

### Option 2: Run Step by Step
```powershell
cd backend

# 1. Create DynamoDB tables and IAM role
.\setup-aws.ps1

# 2. Deploy Lambda functions
.\deploy-lambdas.ps1

# 3. Set up API Gateway
.\setup-api-gateway.ps1

# 4. Seed initial data
.\seed-data.ps1
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email/password
- `GET /auth/me` - Get current user

### Items
- `GET /items` - List all items
- `POST /items` - Create item (Admin)
- `PUT /items/{id}` - Update item (Admin)
- `DELETE /items/{id}` - Delete item (Admin)

### Orders
- `GET /orders` - List orders (filtered by role)
- `POST /orders` - Create order (Franchise)
- `PUT /orders/{id}/accept` - Accept order (Kitchen)
- `PUT /orders/{id}/dispatch` - Dispatch order (Kitchen)
- `PUT /orders/{id}/receive` - Confirm receipt (Franchise)
- `GET /orders/received-items` - Get received items report

### Discrepancies
- `GET /discrepancies` - List discrepancies
- `POST /discrepancies` - Report discrepancy (Franchise)
- `PUT /discrepancies/{id}/resolve` - Resolve discrepancy (Admin)

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@swap.com | admin123 |
| Kitchen | kitchen@swap.com | kitchen123 |
| Franchise 1 | franchise1@swap.com | franchise123 |
| Franchise 2 | franchise2@swap.com | franchise123 |

## Frontend Configuration
After deployment, the API URL is automatically saved to `../.env`:
```
VITE_API_URL=https://xxxxxx.execute-api.ap-south-1.amazonaws.com
```

## Cleanup
To delete all AWS resources:
```powershell
# Delete API Gateway
aws apigatewayv2 delete-api --api-id YOUR_API_ID --region ap-south-1

# Delete Lambda functions
aws lambda delete-function --function-name supply-auth --region ap-south-1
aws lambda delete-function --function-name supply-items --region ap-south-1
aws lambda delete-function --function-name supply-orders --region ap-south-1
aws lambda delete-function --function-name supply-discrepancies --region ap-south-1

# Delete DynamoDB tables
aws dynamodb delete-table --table-name supply_users --region ap-south-1
aws dynamodb delete-table --table-name supply_items --region ap-south-1
aws dynamodb delete-table --table-name supply_orders --region ap-south-1
aws dynamodb delete-table --table-name supply_order_items --region ap-south-1
aws dynamodb delete-table --table-name supply_discrepancies --region ap-south-1

# Delete IAM role
aws iam delete-role-policy --role-name supply-system-lambda-role --policy-name LambdaPolicy
aws iam delete-role --role-name supply-system-lambda-role
```
