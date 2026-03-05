# Rista API Integration Guide

This guide explains how to set up and use the Rista sales data sync feature.

## Overview

The Rista integration automatically fetches sales data from the Rista API, eliminating manual data entry and reducing human error.

## Features

- ✅ Auto-fetch sales data from Rista API
- ✅ Support for multiple channels (Swiggy, Zomato, Takeaway, Corporate)
- ✅ Filter by date range
- ✅ Group by day, week, or month
- ✅ Only includes closed (completed) orders
- ✅ Automatic gross sale calculation: `grossSale = grossAmount + packings`

## Architecture

```
Frontend (React)
    ↓ API Call
API Gateway
    ↓ Trigger
Lambda Function (rista-sales-sync)
    ↓ HTTP Request
Rista API
```

## Deployment Steps

### 1. Deploy Lambda Function

Run the deployment script:

```powershell
.\backend\deploy-rista-lambda.ps1 -Region ap-south-1
```

**Before running, update:**
- `$LambdaRole` in the script with your IAM role ARN
- Your AWS account is configured

### 2. Create API Gateway

1. Go to AWS Console → API Gateway
2. Create a new REST API
3. Create a resource: `/rista-sales`
4. Create a GET method
5. Link it to the Lambda function: `rista-sales-sync`
6. Enable CORS:
   - Access-Control-Allow-Origin: `*`
   - Access-Control-Allow-Headers: `Content-Type,X-Amz-Date,Authorization,X-Api-Key`
   - Access-Control-Allow-Methods: `GET,OPTIONS`
7. Deploy to a stage (e.g., `prod`)
8. Copy the Invoke URL

### 3. Update Frontend Configuration

Add to your `.env` file:

```env
VITE_RISTA_SALES_API_URL=https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod/rista-sales
```

## Usage in Frontend

### Import the Service

```javascript
import { syncTodaySales, formatSalesSummary } from '../services/ristaSalesService';
```

### Add Sync Button to Dashboard

```jsx
import React, { useState } from 'react';
import { syncTodaySales, formatSalesSummary } from '../services/ristaSalesService';

function DailySalesEntry({ branchId }) {
    const [salesData, setSalesData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSyncSales = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Fetch today's sales for all channels
            const data = await syncTodaySales(branchId, 'all');
            const summary = formatSalesSummary(data);
            
            // Auto-populate the form fields
            setSalesData(summary);
            
            // Update your form state here
            // e.g., setFormData({ grossSale: summary.grossSale, ... })
            
            alert('Sales data synced successfully!');
        } catch (err) {
            setError('Failed to sync sales data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Daily Sales Entry</h2>
            
            <button 
                onClick={handleSyncSales} 
                disabled={loading}
                className="sync-button"
            >
                {loading ? '🔄 Syncing...' : '🔄 Sync from Rista'}
            </button>
            
            {error && <div className="error">{error}</div>}
            
            {salesData && (
                <div className="sales-summary">
                    <p>Total Orders: {salesData.totalOrders}</p>
                    <p>Gross Sale: {salesData.formatted.grossSale}</p>
                    <p>Packings: {salesData.formatted.packings}</p>
                    <p>Discounts: {salesData.formatted.discounts}</p>
                    <p>Net Sale: {salesData.formatted.netSale}</p>
                </div>
            )}
            
            {/* Your existing form fields */}
        </div>
    );
}
```

### Sync Specific Channel

```javascript
// Sync only Swiggy orders
const data = await syncTodaySales('MK', 'swiggy');

// Sync only Zomato orders
const data = await syncTodaySales('MK', 'zomato');

// Sync all channels
const data = await syncTodaySales('MK', 'all');
```

## API Parameters

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| branchId | string | Yes | Branch/Restaurant ID | `MK` |
| startDate | string | Yes | Start date | `2026-02-23` |
| endDate | string | Yes | End date | `2026-02-23` |
| channel | string | No | Channel filter | `all`, `swiggy`, `zomato`, `takeaway` |
| groupBy | string | No | Grouping method | `total`, `week`, `month` |

### Response Format

```json
{
  "restaurantId": "Main Kitchen",
  "startDate": "2026-02-23",
  "endDate": "2026-02-23",
  "body": {
    "consolidatedInsights": {
      "noOfOrders": 57,
      "grossSale": 15566.50,
      "packings": 956.36,
      "discounts": 1311.87,
      "gstOnOrder": 0,
      "netSale": 14254.63,
      "payout": 14254.63
    },
    "dailyInsights": { ... }
  }
}
```

## Gross Sale Calculation

The Lambda automatically calculates:

```javascript
grossSale = grossAmount + packings (if packings exists)
netSale = grossSale - gstOnOrder - discounts
```

## Branch ID Mapping

Common branch IDs:
- `MK` - Main Kitchen
- (Add your other branch codes here)

## Error Handling

The service includes error handling for:
- Network failures
- Invalid date formats
- Missing branch IDs
- API rate limits

## Testing

Test the Lambda locally:

```bash
cd backend/lambdas/rista-sales
node test-local.js
```

## Troubleshooting

1. **No data returned**: Check if the branch ID is correct
2. **CORS errors**: Ensure API Gateway CORS is properly configured
3. **Timeout errors**: Increase Lambda timeout (currently 60s)
4. **Wrong amounts**: Verify channel filter matches your data source

## Security

- API credentials are stored in Lambda environment variables
- Never expose Rista API keys in frontend code
- Use API Gateway throttling to prevent abuse

## Future Enhancements

- [ ] Add caching layer (Redis/DynamoDB)
- [ ] Support for multiple branch sync
- [ ] Webhook for real-time updates
- [ ] Historical data comparison
- [ ] Email notifications for discrepancies
