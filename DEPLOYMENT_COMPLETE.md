# Rista Sales API - Deployment Complete ✅

## Deployment Summary

**Lambda Function:**
- Name: `rista-sales-sync`
- Runtime: Node.js 20.x
- Region: ap-south-1
- Status: ✅ Active
- Memory: 512 MB
- Timeout: 60 seconds

**API Gateway:**
- API Name: supply-system-api (existing)
- API ID: vvyu6tokh6
- Type: HTTP API (v2)
- Route: GET /rista-sales
- Status: ✅ Deployed

## API Endpoint URL

```
https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com/rista-sales
```

## Usage Example

### Get Today's Sales for Branch MK:

```
GET https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com/rista-sales?branchId=MK&startDate=2026-02-23&endDate=2026-02-23&channel=all&groupBy=total
```

### Test with cURL:

```bash
curl "https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com/rista-sales?branchId=MK&startDate=2026-02-23&endDate=2026-02-23&channel=all&groupBy=total"
```

## Environment Variables (.env)

Add this to your `.env` file:

```env
VITE_RISTA_SALES_API_URL=https://vvyu6tokh6.execute-api.ap-south-1.amazonaws.com/rista-sales
```

## Query Parameters

| Parameter | Type | Required | Example | Description |
|-----------|------|----------|---------|-------------|
| branchId | string | Yes | `MK` | Branch/Restaurant ID |
| startDate | string | Yes | `2026-02-23` | Start date (YYYY-MM-DD) |
| endDate | string | Yes | `2026-02-23` | End date (YYYY-MM-DD) |
| channel | string | No | `all` | Channel filter: `all`, `swiggy`, `zomato`, `takeaway` |
| groupBy | string | No | `total` | Grouping: `total`, `week`, `month` |

## Test Results

✅ **Tested with Branch MK on 2026-02-23:**
- Total Orders: 79
- Gross Sale: ₹21,206.46
- Packaging: ₹1,323.32
- Discounts: ₹1,952.62
- Net Sale: ₹19,253.84

## CORS Configuration

✅ CORS is enabled for:
- Origin: `*` (all origins)
- Methods: `GET`, `OPTIONS`
- Headers: `Content-Type`, `X-Amz-Date`, `Authorization`, `X-Api-Key`

## Next Steps

1. ✅ Update your `.env` file with the API URL above
2. ✅ Import `SyncSalesButton` component in your DailyEntry page
3. ✅ Test the sync button in your frontend
4. ✅ Review the data and verify accuracy

## Support

- **Lambda Logs**: Check CloudWatch Logs for debugging
- **API Gateway Logs**: Enable in API Gateway settings if needed
- **Test Endpoint**: Use the URL above in Postman or browser

## Security Notes

- API credentials are stored securely in Lambda environment variables
- Never expose Rista API keys in frontend code
- Consider adding API Gateway authentication for production

---

**Deployment Date:** February 23, 2026  
**Account ID:** 908928711298  
**Region:** ap-south-1 (Mumbai)
