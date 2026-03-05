# AI Insights Implementation Guide

## Overview
Single Lambda function that provides AI-powered insights using **Grok AI API (free tier)** for multiple use cases.

## Architecture

```
Frontend Component → API Gateway → Lambda (ai-insights) → {
  1. Query DynamoDB
  2. Call Grok AI API  
  3. Return insights (cached for 1 hour)
}
```

## Setup Instructions

### 1. Get Grok API Key (FREE)
1. Go to https://x.ai/api
2. Sign up for free Grok API access
3. Copy your API key

### 2. Deploy Lambda Function

```powershell
cd backend
.\deploy-ai-insights.ps1
```

When prompted, enter your Grok API key. The script will:
- Create Lambda function
- Set up API Gateway route
- Configure permissions

### 3. Update Frontend Environment

Add to `.env` or update API URL:
```
VITE_API_URL=https://your-api-gateway.execute-api.ap-south-1.amazonaws.com
```

## API Usage

### Endpoint
```
GET /ai-insights?type={TYPE}&franchise_id={ID}
```

### Parameters
- `type` (required): `finance` | `attendance` | `discrepancies` | `daily-reports` | `vendors`
- `franchise_id` (optional): Filter by franchise (admin only)

### Example Request
```javascript
GET https://api.example.com/ai-insights?type=finance&franchise_id=F001
Authorization: Bearer {token}
```

### Example Response
```json
{
  "type": "finance",
  "franchise_id": "F001",
  "summary": {
    "total_payments": 45,
    "total_amount": 125000,
    "pending_payments": 5,
    "avg_payment": 2777.78
  },
  "insights": "1. Payment patterns show consistent weekly cycles...\n2. 5 pending payments require attention...\n3. Cash flow is stable with...",
  "generated_at": "2026-02-24T10:30:00Z"
}
```

## Frontend Integration

### Option 1: Use AIInsightsPanel Component

Add to any page:
```jsx
import AIInsightsPanel from '../components/AIInsightsPanel';

function FinancePage() {
  return (
    <div>
      <h1>Finance Dashboard</h1>
      
      {/* AI Insights Panel */}
      <AIInsightsPanel 
        type="finance" 
        franchiseId={selectedFranchise}
        autoLoad={false}  // User clicks to generate (saves API calls)
      />
      
      {/* Rest of your page */}
    </div>
  );
}
```

### Option 2: Use Service Directly

```jsx
import aiInsightsService from '../services/aiInsights';

function MyComponent() {
  const [insights, setInsights] = useState(null);
  
  const fetchInsights = async () => {
    const data = await aiInsightsService.getFinanceInsights('F001');
    setInsights(data);
  };
  
  return (
    <button onClick={fetchInsights}>Get AI Insights</button>
  );
}
```

## Insight Types

### 1. Finance Insights
```jsx
<AIInsightsPanel type="finance" />
```
Provides:
- Payment pattern analysis
- Cash flow predictions
- Vendor concentration risks
- Cost optimization opportunities

**Best for:** Finance pages, Payment History, Vendor Ledger

### 2. Attendance Insights
```jsx
<AIInsightsPanel type="attendance" />
```
Provides:
- Attendance trend analysis
- Absenteeism predictions
- Staffing optimization
- Pattern detection

**Best for:** Attendance View, Staff Management

### 3. Discrepancy Insights
```jsx
<AIInsightsPanel type="discrepancies" />
```
Provides:
- Root cause analysis
- Common discrepancy patterns
- Prevention strategies
- Process improvements

**Best for:** Discrepancies pages (Admin & Franchise)

### 4. Daily Reports Insights
```jsx
<AIInsightsPanel type="daily-reports" />
```
Provides:
- Sales trend analysis
- Wastage patterns
- Revenue forecasting
- Operational recommendations

**Best for:** DailyReports, DailyEntry, Dashboard

### 5. Vendor Insights
```jsx
<AIInsightsPanel type="vendors" />
```
Provides:
- Vendor performance scoring
- Delivery reliability analysis
- Supplier optimization
- Risk assessment

**Best for:** Vendor Management, Vendor Items

## Cost Optimization

### Caching Strategy
- Insights cached for **1 hour** (in Lambda memory)
- Reduces API calls dramatically
- Cache per `type` + `franchise_id` combination

### Request Minimization
- Set `autoLoad={false}` - user clicks to generate
- Use concise prompts (300-500 tokens max)
- Aggregate data before sending to AI

### Free Tier Limits (Grok AI)
- Check current limits at https://x.ai/api
- Monitor your usage in Grok dashboard
- Implement rate limiting if needed

## Example: Add to Admin Finance Page

```jsx
// src/pages/admin/Finance.jsx
import React, { useState, useEffect } from 'react';
import AIInsightsPanel from '../../components/AIInsightsPanel';

function Finance() {
  const [selectedFranchise, setSelectedFranchise] = useState(null);

  return (
    <div className="finance-page">
      <h1>Finance Management</h1>
      
      {/* Franchise selector */}
      <select onChange={(e) => setSelectedFranchise(e.target.value)}>
        <option value="">All Franchises</option>
        <option value="F001">Franchise 1</option>
        <option value="F002">Franchise 2</option>
      </select>
      
      {/* AI Insights */}
      <AIInsightsPanel 
        type="finance"
        franchiseId={selectedFranchise}
        autoLoad={false}
      />
      
      {/* Existing finance content */}
      <div className="payment-tables">
        {/* Your existing tables */}
      </div>
    </div>
  );
}

export default Finance;
```

## Permissions

All insights respect user roles:
- **ADMIN**: Can see all franchises or filter by `franchise_id`
- **FRANCHISE/FRANCHISE_STAFF**: Only their franchise data
- **KITCHEN/KITCHEN_STAFF**: Only kitchen data
- **AUDITOR**: Limited access (configure as needed)

## Troubleshooting

### "Grok API key not configured"
- Re-run deployment script and enter your API key
- Or update manually:
  ```powershell
  aws lambda update-function-configuration `
    --function-name ai-insights `
    --environment "Variables={GROK_API_KEY=your-key-here}"
  ```

### "Failed to generate insights"
- Check Grok API key is valid
- Verify Lambda has DynamoDB permissions
- Check CloudWatch logs: 
  ```powershell
  aws logs tail /aws/lambda/ai-insights --follow
  ```

### Slow response times
- Insights are cached for 1 hour
- First request may take 5-10 seconds
- Subsequent requests are instant (if cached)

## Next Steps

1. Deploy the Lambda function
2. Add AIInsightsPanel to 2-3 high-priority pages
3. Monitor usage and refine prompts
4. Collect user feedback
5. Expand to more pages as needed

## Recommended Pages (Priority Order)

1. ✅ **Admin Finance** - Payment insights
2. ✅ **Admin Dashboard** - Overall trends
3. ✅ **Admin DailyReports** - Sales forecasting
4. ✅ **Admin Discrepancies** - Root cause analysis
5. ✅ **Franchise Dashboard** - Performance insights

## Support

For issues or questions:
- Check Lambda logs in CloudWatch
- Verify API Gateway routes
- Test endpoint with curl/Postman
- Review Grok API documentation: https://docs.x.ai
