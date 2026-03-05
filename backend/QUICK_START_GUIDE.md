# Staff Scoring System - Quick Start Guide

This guide will help you deploy and use the staff performance scoring system in under 30 minutes.

## 📋 Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js installed (v18 or higher)
- PowerShell (Windows) or Bash (Linux/Mac)

## 🚀 Quick Deployment (5 Steps)

### Step 1: Install Dependencies

```bash
cd backend/lambdas/staff-scoring
npm install
```

### Step 2: Run Deployment Script

```powershell
cd backend
.\deploy-staff-scoring.ps1
```

This script will automatically:
- ✅ Create DynamoDB table (`staff_scores`)
- ✅ Create IAM role for Lambda
- ✅ Package and deploy Lambda function
- ✅ Create API Gateway

### Step 3: Configure API Gateway (Manual - 10 minutes)

After deployment, you need to manually configure API Gateway routes. See detailed instructions in [API_GATEWAY_CONFIG.md](API_GATEWAY_CONFIG.md).

**Quick setup via AWS Console:**

1. Go to API Gateway → Select `staff-scoring-api`
2. Create resources and methods as shown below:
   ```
   /staff
     POST /score
     /{staff_id}
       GET /score/current
       GET /score/history
       GET /score/{month_year}
   /staff/scores
     GET /leaderboard
   ```
3. For each method, set integration to Lambda Proxy with `staff-scoring-lambda`
4. Deploy to `prod` stage
5. Note your API endpoint URL

### Step 4: Test Your API

Update the test script with your API URL:

```javascript
// In test-staff-scoring.cjs
const API_URL = 'YOUR_API_ID.execute-api.ap-south-1.amazonaws.com';
```

Run tests:

```powershell
node backend/test-staff-scoring.cjs
```

### Step 5: Integrate with Frontend

Use the example code from [EXAMPLE_QUERIES.md](EXAMPLE_QUERIES.md) to integrate with your React application.

## 📊 System Overview

### Architecture Diagram

```
┌─────────────────┐
│  Frontend (S3)  │
│  React/HTML/JS  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  API Gateway    │
│  REST API       │
└────────┬────────┘
         │ Invoke
         ▼
┌─────────────────┐      ┌─────────────────┐
│  Lambda         │─────▶│  DynamoDB       │
│  Node.js 18.x   │      │  staff_scores   │
└─────────────────┘      └─────────────────┘
```

### DynamoDB Table Structure

**Table Name:** `staff_scores`

| Field | Type | Description |
|-------|------|-------------|
| `staff_id` (PK) | String | Staff member ID |
| `month_year` (SK) | String | Format: "YYYY-MM" |
| `attendance_score` | Number | 0-10 points |
| `hygiene_score` | Number | 0-10 points |
| `discipline_score` | Number | 0-10 points |
| `total_score` | Number | Sum (0-30) |
| `normalized_score` | Number | Average (0-10) |
| `created_at` | String | ISO timestamp |
| `updated_at` | String | ISO timestamp |

**GSI:** `month_year-index` (for leaderboard queries)

## 🔍 How It Works

### 1. Automatic Month Detection

The Lambda function automatically detects the current month/year:

```javascript
function getCurrentMonthYear() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
```

**Example:** March 2026 → `"2026-03"`

### 2. Create or Update Score

When you submit a score:
- Lambda checks if a record exists for `staff_id` + `current_month_year`
- If exists → Update the record
- If not exists → Create new record
- Automatically calculates `total_score` and `normalized_score`

### 3. Score Calculation

```
total_score = attendance_score + hygiene_score + discipline_score
normalized_score = total_score / 3
```

**Example:**
- Attendance: 8.5
- Hygiene: 9.0
- Discipline: 7.5
- **Total:** 25.0
- **Normalized:** 8.33

### 4. Historical Tracking

Each month gets its own record:
```
STAFF001 + 2026-01 → Record 1
STAFF001 + 2026-02 → Record 2
STAFF001 + 2026-03 → Record 3
```

No data is ever deleted - complete history is maintained.

## 📝 Example Usage

### Example 1: Update Staff Score

```javascript
// Frontend JavaScript
const response = await fetch('https://YOUR_API.execute-api.ap-south-1.amazonaws.com/prod/staff/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        staff_id: 'STAFF001',
        staff_name: 'John Doe',
        attendance_score: 8.5,
        hygiene_score: 9.0,
        discipline_score: 7.5,
        notes: 'Great work this month'
    })
});

const result = await response.json();
console.log(result);
// {
//   success: true,
//   message: "Score created successfully",
//   data: { staff_id: "STAFF001", month_year: "2026-03", total_score: 25, ... }
// }
```

### Example 2: Get Current Month Score

```javascript
const response = await fetch('https://YOUR_API.execute-api.ap-south-1.amazonaws.com/prod/staff/STAFF001/score/current');
const result = await response.json();

console.log(`Current Score: ${result.data.normalized_score}/10`);
```

### Example 3: Get Leaderboard

```javascript
const response = await fetch('https://YOUR_API.execute-api.ap-south-1.amazonaws.com/prod/staff/scores/leaderboard?month_year=2026-03&limit=10');
const result = await response.json();

result.data.forEach(staff => {
    console.log(`${staff.rank}. ${staff.staff_name} - ${staff.normalized_score}/10`);
});
```

## 🔧 Configuration

### Environment Variables

The Lambda function uses these environment variables (automatically set by deployment script):

```bash
STAFF_SCORES_TABLE=staff_scores
AWS_REGION=ap-south-1
```

### Customization

#### Change Score Range

To use 0-100 instead of 0-10, modify the validation in `index.js`:

```javascript
function validateScore(score, scoreName) {
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {  // Changed from 10 to 100
        throw new Error(`${scoreName} must be between 0 and 100`);
    }
    return numScore;
}
```

#### Add More Score Components

Add new fields to the scoring system:

```javascript
// Add punctuality_score
const {
    attendance_score,
    hygiene_score,
    discipline_score,
    punctuality_score  // New field
} = body;

const totalScore = attendance + hygiene + discipline + punctuality;
const normalizedScore = totalScore / 4;  // Divide by 4 instead of 3
```

#### Change Month Format

To use "March 2026" instead of "2026-03":

```javascript
function getCurrentMonthYear() {
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}
```

## 🛡️ Security Best Practices

### 1. Enable Authentication

Add API Gateway authorization:

```yaml
# Using API Keys (Simple)
- Create API key in API Gateway
- Require API key on all methods
- Distribute securely to clients

# Using IAM (More Secure)
- Use AWS Signature v4
- Grant IAM permissions to users

# Using Cognito (Enterprise)
- Set up Cognito User Pool
- Use JWT token validation
```

### 2. Input Validation

Already implemented in Lambda:
- ✅ staff_id required
- ✅ Scores must be 0-10
- ✅ month_year format validation

### 3. Rate Limiting

Configure in API Gateway:
- Throttling: 1000 requests/second
- Burst: 2000 requests
- Usage plans for different user tiers

## 📈 Monitoring and Maintenance

### CloudWatch Logs

View Lambda logs:
```bash
aws logs tail /aws/lambda/staff-scoring-lambda --follow
```

### CloudWatch Metrics

Monitor:
- Lambda invocations
- Error count
- Duration
- DynamoDB read/write units

### Set Up Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name staff-scoring-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

## 💰 Cost Estimation

### For 100 Staff Members

**Assumptions:**
- 100 staff members
- 4 score updates per month per staff
- 50 leaderboard views per day
- 200 individual score checks per day

**Monthly Costs:**

| Service | Usage | Cost |
|---------|-------|------|
| DynamoDB | 400 writes, 7500 reads | ~$1-2 |
| Lambda | 8000 invocations | ~$0.50 |
| API Gateway | 240,000 requests | ~$0.24 |
| Data Transfer | Minimal | ~$0.10 |
| **Total** | | **~$2-3/month** |

### Cost Optimization Tips

1. **Use DynamoDB On-Demand:** No need to provision capacity
2. **Cache Leaderboard:** Reduce reads by caching for 5 minutes
3. **Batch Operations:** Update multiple scores in one request
4. **Compress Responses:** Enable API Gateway compression

## 🔍 Troubleshooting

### Issue 1: Lambda Permission Error

**Error:** "User is not authorized to perform: lambda:InvokeFunction"

**Solution:**
```bash
aws lambda add-permission \
  --function-name staff-scoring-lambda \
  --statement-id apigateway-prod \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:REGION:ACCOUNT:API_ID/*"
```

### Issue 2: CORS Error in Browser

**Error:** "No 'Access-Control-Allow-Origin' header"

**Solution:**
1. Enable CORS in API Gateway for all methods
2. Add OPTIONS method for preflight requests
3. Redeploy API to prod stage

### Issue 3: Score Not Found

**Error:** "No score found for current month"

**Solution:**
- This is expected if no score has been created yet
- Call POST /staff/score to create initial record
- Check that staff_id matches exactly (case-sensitive)

### Issue 4: Invalid Score Value

**Error:** "attendance_score must be between 0 and 10"

**Solution:**
- Ensure all scores are numbers, not strings
- Valid range: 0.0 to 10.0
- Decimals are allowed (e.g., 8.5)

## 📚 Complete Documentation

- **[STAFF_SCORING_SYSTEM.md](STAFF_SCORING_SYSTEM.md)** - Complete system documentation
- **[API_GATEWAY_CONFIG.md](API_GATEWAY_CONFIG.md)** - API Gateway detailed setup
- **[EXAMPLE_QUERIES.md](EXAMPLE_QUERIES.md)** - Comprehensive examples and use cases
- **[test-staff-scoring.cjs](test-staff-scoring.cjs)** - Automated test suite

## 🎯 Next Steps

1. ✅ Deploy infrastructure using deployment script
2. ✅ Configure API Gateway routes
3. ✅ Run test suite to validate
4. ✅ Integrate with your frontend
5. □ Set up monitoring and alarms
6. □ Configure authentication
7. □ Train your team on usage
8. □ Set up monthly review process

## 💡 Common Scenarios

### Scenario 1: End of Month Review

```javascript
// Get all staff who need scoring
const staffList = await getAllStaff();

for (const staff of staffList) {
    await updateStaffScore({
        staff_id: staff.id,
        staff_name: staff.name,
        attendance_score: calculateAttendance(staff),
        hygiene_score: calculateHygiene(staff),
        discipline_score: calculateDiscipline(staff)
    });
}

// Generate leaderboard
const leaderboard = await getLeaderboard();
console.log('Top Performers:', leaderboard);
```

### Scenario 2: Performance Dashboard

```javascript
// Get staff performance trend
const history = await getScoreHistory('STAFF001', 12);

const chartData = history.map(record => ({
    month: record.month_year,
    score: record.normalized_score
}));

// Display in chart component
<LineChart data={chartData} />
```

### Scenario 3: Automated Alerts

```javascript
// Check if score dropped significantly
const currentScore = await getCurrentMonthScore('STAFF001');
const history = await getScoreHistory('STAFF001', 2);

if (history.length >= 2) {
    const previousScore = history[1].normalized_score;
    const drop = previousScore - currentScore.data.normalized_score;
    
    if (drop > 2.0) {
        // Send alert to manager
        await sendAlert(`Performance drop detected for ${currentScore.data.staff_name}`);
    }
}
```

## 🆘 Support

If you encounter issues:

1. Check CloudWatch Logs for detailed error messages
2. Verify all AWS services are in the same region (ap-south-1)
3. Ensure IAM roles have correct permissions
4. Review the troubleshooting section above
5. Run the test suite to identify specific failures

## 🎉 You're Ready!

Your staff scoring system is now set up and ready to use. Start by:
1. Creating scores for your staff members
2. Viewing the leaderboard
3. Tracking performance trends over time

Good luck! 🚀
