# Adding Staff Scoring to Existing supply-staff Lambda

This guide shows how to add staff scoring functionality to your existing `supply-staff` Lambda instead of creating a new Lambda function.

## Overview

Your existing Lambda: `backend/lambdas/supply-staff/index.js`  
Currently handles: Staff CRUD, attendance stats, managers  
**We'll add:** Staff scoring endpoints

## Step-by-Step Integration

### Step 1: Add Staff Scores Table Constant

At the top of `index.js`, add the staff scores table:

```javascript
const STAFF_TABLE = 'supply_staff';
const USERS_TABLE = 'supply_users';
const ATTENDANCE_TABLE = 'supply_staff_attendance';
const HYGIENE_MONITORS_TABLE = 'supply_hygiene_monitors';
const STAFF_SCORES_TABLE = 'staff_scores'; // ⬅️ ADD THIS LINE
```

### Step 2: Add Helper Functions

Add these functions after the existing helper functions (after `generateEmployeeId`):

```javascript
// ==================== STAFF SCORING FUNCTIONS ====================

/**
 * Get current month_year in YYYY-MM format
 */
function getCurrentMonthYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Validate score value (must be between 0 and 10)
 */
function validateScore(score, scoreName) {
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        throw new Error(`${scoreName} must be a number between 0 and 10`);
    }
    return numScore;
}

/**
 * Calculate total score from individual components
 */
function calculateTotalScore(attendanceScore, hygieneScore, disciplineScore) {
    return attendanceScore + hygieneScore + disciplineScore;
}

/**
 * Calculate normalized score (0-10 scale)
 */
function calculateNormalizedScore(totalScore) {
    return parseFloat((totalScore / 3).toFixed(2));
}

/**
 * Update or create staff score for current month
 */
async function updateStaffScore(body) {
    const {
        staff_id,
        staff_name,
        attendance_score,
        hygiene_score,
        discipline_score,
        notes
    } = body;

    // Validate required fields
    if (!staff_id) {
        throw new Error('staff_id is required');
    }

    // Validate scores
    const validatedAttendance = validateScore(attendance_score ?? 0, 'attendance_score');
    const validatedHygiene = validateScore(hygiene_score ?? 0, 'hygiene_score');
    const validatedDiscipline = validateScore(discipline_score ?? 0, 'discipline_score');

    // Calculate scores
    const totalScore = calculateTotalScore(validatedAttendance, validatedHygiene, validatedDiscipline);
    const normalizedScore = calculateNormalizedScore(totalScore);

    const month_year = getCurrentMonthYear();
    const now = new Date().toISOString();

    // Check if record already exists
    const existingRecord = await dynamodb.send(new GetCommand({
        TableName: STAFF_SCORES_TABLE,
        Key: { staff_id, month_year }
    }));

    const item = {
        staff_id,
        month_year,
        staff_name: staff_name || existingRecord.Item?.staff_name || 'Unknown',
        attendance_score: validatedAttendance,
        hygiene_score: validatedHygiene,
        discipline_score: validatedDiscipline,
        total_score: totalScore,
        normalized_score: normalizedScore,
        updated_at: now,
        created_at: existingRecord.Item?.created_at || now,
        notes: notes || ''
    };

    // Save to DynamoDB
    await dynamodb.send(new PutCommand({
        TableName: STAFF_SCORES_TABLE,
        Item: item
    }));

    return {
        success: true,
        message: existingRecord.Item ? 'Score updated successfully' : 'Score created successfully',
        data: item
    };
}

/**
 * Get staff score for current month
 */
async function getCurrentMonthScore(staff_id) {
    if (!staff_id) {
        throw new Error('staff_id is required');
    }

    const month_year = getCurrentMonthYear();

    const result = await dynamodb.send(new GetCommand({
        TableName: STAFF_SCORES_TABLE,
        Key: { staff_id, month_year }
    }));

    if (!result.Item) {
        return {
            success: true,
            message: 'No score found for current month',
            data: null
        };
    }

    return {
        success: true,
        data: result.Item
    };
}

/**
 * Get staff score for a specific month
 */
async function getMonthScore(staff_id, month_year) {
    if (!staff_id) {
        throw new Error('staff_id is required');
    }
    if (!month_year) {
        throw new Error('month_year is required');
    }

    // Validate month_year format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month_year)) {
        throw new Error('month_year must be in YYYY-MM format');
    }

    const result = await dynamodb.send(new GetCommand({
        TableName: STAFF_SCORES_TABLE,
        Key: { staff_id, month_year }
    }));

    if (!result.Item) {
        return {
            success: true,
            message: `No score found for ${month_year}`,
            data: null
        };
    }

    return {
        success: true,
        data: result.Item
    };
}

/**
 * Get staff score history (all months)
 */
async function getStaffScoreHistory(staff_id, limit = 12) {
    if (!staff_id) {
        throw new Error('staff_id is required');
    }

    const result = await dynamodb.send(new QueryCommand({
        TableName: STAFF_SCORES_TABLE,
        KeyConditionExpression: 'staff_id = :staff_id',
        ExpressionAttributeValues: {
            ':staff_id': staff_id
        },
        ScanIndexForward: false, // Sort by month_year descending (newest first)
        Limit: parseInt(limit) || 12
    }));

    return {
        success: true,
        staff_id,
        count: result.Items?.length || 0,
        data: result.Items || []
    };
}

/**
 * Get leaderboard for a specific month
 */
async function getMonthLeaderboard(month_year, limit = 10) {
    const targetMonth = month_year || getCurrentMonthYear();

    // Validate month_year format
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
        throw new Error('month_year must be in YYYY-MM format');
    }

    const result = await dynamodb.send(new QueryCommand({
        TableName: STAFF_SCORES_TABLE,
        IndexName: 'month_year-index',
        KeyConditionExpression: 'month_year = :month_year',
        ExpressionAttributeValues: {
            ':month_year': targetMonth
        },
        ScanIndexForward: false, // Sort by total_score descending (highest first)
        Limit: parseInt(limit) || 10
    }));

    // Add rank to each item
    const dataWithRank = (result.Items || []).map((item, index) => ({
        ...item,
        rank: index + 1
    }));

    return {
        success: true,
        month_year: targetMonth,
        count: dataWithRank.length,
        data: dataWithRank
    };
}
```

### Step 3: Add Routes to Handler

In the `exports.handler` function, add these new routes. **Add them BEFORE the generic GET /staff route** (around line 250):

```javascript
// ==================== STAFF SCORING ROUTES ====================

// POST /staff/score - Update/create staff score
if (httpMethod === 'POST' && path.includes('/staff/score')) {
    try {
        const body = JSON.parse(event.body || '{}');
        const result = await updateStaffScore(body);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Error updating staff score:', error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

// GET /staff/:id/score/current - Get current month score
if (httpMethod === 'GET' && path.match(/\/staff\/[^\/]+\/score\/current$/)) {
    try {
        const staff_id = path.split('/')[2];
        const result = await getCurrentMonthScore(staff_id);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Error getting current score:', error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

// GET /staff/:id/score/history - Get score history
if (httpMethod === 'GET' && path.match(/\/staff\/[^\/]+\/score\/history$/)) {
    try {
        const staff_id = path.split('/')[2];
        const limit = event.queryStringParameters?.limit || 12;
        const result = await getStaffScoreHistory(staff_id, limit);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Error getting score history:', error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

// GET /staff/:id/score/:month_year - Get specific month score
if (httpMethod === 'GET' && path.match(/\/staff\/[^\/]+\/score\/\d{4}-\d{2}$/)) {
    try {
        const parts = path.split('/');
        const staff_id = parts[2];
        const month_year = parts[4];
        const result = await getMonthScore(staff_id, month_year);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Error getting month score:', error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

// GET /staff/scores/leaderboard - Get monthly leaderboard
if (httpMethod === 'GET' && path.includes('/staff/scores/leaderboard')) {
    try {
        const month_year = event.queryStringParameters?.month_year;
        const limit = event.queryStringParameters?.limit || 10;
        const result = await getMonthLeaderboard(month_year, limit);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}

// ==================== END STAFF SCORING ROUTES ====================
```

## Deployment

### Option 1: Use Your Existing Deployment Script

If you have a deployment script for `supply-staff`, just run it:

```powershell
# Example
.\backend\deploy-staff-features.ps1
# or
.\backend\deploy-lambdas.ps1
```

### Option 2: Manual Deployment

```powershell
cd backend/lambdas/supply-staff

# Install dependencies (if not already)
npm install

# Create deployment package
Compress-Archive -Path index.js,package.json,node_modules -DestinationPath lambda.zip -Force

# Update Lambda
aws lambda update-function-code `
  --function-name supply-staff-lambda `
  --zip-file fileb://lambda.zip `
  --region ap-south-1
```

## API Endpoints (Using Existing API Gateway)

Your endpoints will be under the existing `/staff` prefix:

```
POST   /staff/score
GET    /staff/{id}/score/current
GET    /staff/{id}/score/history
GET    /staff/{id}/score/{month_year}
GET    /staff/scores/leaderboard
```

**Example:** If your current API is:
```
https://abc123.execute-api.ap-south-1.amazonaws.com/prod/staff
```

Your new scoring endpoints will be:
```
https://abc123.execute-api.ap-south-1.amazonaws.com/prod/staff/score
https://abc123.execute-api.ap-south-1.amazonaws.com/prod/staff/STAFF001/score/current
```

## Testing

```bash
API_URL="https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod"
TOKEN="your-auth-token"

# Create/update score
curl -X POST "$API_URL/staff/score" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "staff_id": "STAFF001",
    "staff_name": "John Doe",
    "attendance_score": 8.5,
    "hygiene_score": 9.0,
    "discipline_score": 7.5
  }'

# Get current score
curl "$API_URL/staff/STAFF001/score/current" \
  -H "Authorization: Bearer $TOKEN"

# Get history
curl "$API_URL/staff/STAFF001/score/history?limit=6" \
  -H "Authorization: Bearer $TOKEN"

# Get leaderboard
curl "$API_URL/staff/scores/leaderboard?month_year=2026-03&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

## DynamoDB Table Creation

You still need to create the `staff_scores` table (one-time setup):

```bash
aws dynamodb create-table \
  --table-name staff_scores \
  --attribute-definitions \
    AttributeName=staff_id,AttributeType=S \
    AttributeName=month_year,AttributeType=S \
    AttributeName=total_score,AttributeType=N \
  --key-schema \
    AttributeName=staff_id,KeyType=HASH \
    AttributeName=month_year,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[{
      \"IndexName\": \"month_year-index\",
      \"KeySchema\": [
        {\"AttributeName\": \"month_year\", \"KeyType\": \"HASH\"},
        {\"AttributeName\": \"total_score\", \"KeyType\": \"RANGE\"}
      ],
      \"Projection\": {\"ProjectionType\": \"ALL\"}
    }]" \
  --region ap-south-1
```

## Update Lambda IAM Permissions

Ensure your `supply-staff` Lambda role has permissions for the new table:

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:PutItem",
    "dynamodb:GetItem",
    "dynamodb:Query"
  ],
  "Resource": [
    "arn:aws:dynamodb:ap-south-1:*:table/staff_scores",
    "arn:aws:dynamodb:ap-south-1:*:table/staff_scores/index/*"
  ]
}
```

## Advantages of This Approach

✅ **Single Lambda** - All staff operations in one place  
✅ **Existing Auth** - Uses your current authentication system  
✅ **Same API Gateway** - No new API to configure  
✅ **Lower Cost** - Reuse existing infrastructure  
✅ **Easier Maintenance** - One codebase for all staff features  
✅ **Consistent Patterns** - Same error handling and CORS setup  

## Next Steps

1. Create the DynamoDB table (run command above)
2. Update IAM role permissions
3. Add the code to `supply-staff/index.js`
4. Deploy using your existing deployment script
5. Test the new endpoints
6. Integrate with your frontend

That's it! You've added full staff scoring functionality without creating a new Lambda. 🎉
