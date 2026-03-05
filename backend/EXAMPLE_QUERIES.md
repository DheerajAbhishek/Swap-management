# Staff Scoring System - Example Queries and Usage Guide

This guide provides comprehensive examples for interacting with the staff scoring system using various methods.

## Table of Contents
1. [DynamoDB Direct Queries](#dynamodb-direct-queries)
2. [API Endpoint Examples](#api-endpoint-examples)
3. [JavaScript/Node.js Examples](#javascriptnodejs-examples)
4. [Frontend Integration Examples](#frontend-integration-examples)
5. [Common Use Cases](#common-use-cases)

---

## DynamoDB Direct Queries

### AWS CLI Examples

#### Get Current Month Score for a Staff Member

```bash
# Get score for March 2026
aws dynamodb get-item \
  --table-name staff_scores \
  --key '{
    "staff_id": {"S": "STAFF001"},
    "month_year": {"S": "2026-03"}
  }' \
  --region ap-south-1
```

#### Get All Scores for a Staff Member (History)

```bash
# Query all scores for STAFF001
aws dynamodb query \
  --table-name staff_scores \
  --key-condition-expression "staff_id = :staff_id" \
  --expression-attribute-values '{
    ":staff_id": {"S": "STAFF001"}
  }' \
  --scan-index-forward false \
  --region ap-south-1
```

#### Get Leaderboard for a Specific Month

```bash
# Get top performers for March 2026
aws dynamodb query \
  --table-name staff_scores \
  --index-name month_year-index \
  --key-condition-expression "month_year = :month" \
  --expression-attribute-values '{
    ":month": {"S": "2026-03"}
  }' \
  --scan-index-forward false \
  --limit 10 \
  --region ap-south-1
```

#### Update Staff Score (Put Item)

```bash
aws dynamodb put-item \
  --table-name staff_scores \
  --item '{
    "staff_id": {"S": "STAFF001"},
    "month_year": {"S": "2026-03"},
    "staff_name": {"S": "John Doe"},
    "attendance_score": {"N": "8.5"},
    "hygiene_score": {"N": "9.0"},
    "discipline_score": {"N": "7.5"},
    "total_score": {"N": "25.0"},
    "normalized_score": {"N": "8.33"},
    "created_at": {"S": "2026-03-01T00:00:00.000Z"},
    "updated_at": {"S": "2026-03-04T10:30:00.000Z"},
    "notes": {"S": "Good performance"}
  }' \
  --region ap-south-1
```

---

## API Endpoint Examples

Replace `YOUR_API_ID` with your actual API Gateway ID.

```bash
API_URL="https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod"
```

### 1. Create/Update Staff Score

```bash
curl -X POST "$API_URL/staff/score" \
  -H "Content-Type: application/json" \
  -d '{
    "staff_id": "STAFF001",
    "staff_name": "John Doe",
    "attendance_score": 8.5,
    "hygiene_score": 9.0,
    "discipline_score": 7.5,
    "notes": "Excellent work this month"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Score created successfully",
  "data": {
    "staff_id": "STAFF001",
    "month_year": "2026-03",
    "staff_name": "John Doe",
    "attendance_score": 8.5,
    "hygiene_score": 9,
    "discipline_score": 7.5,
    "total_score": 25,
    "normalized_score": 8.33,
    "updated_at": "2026-03-04T10:30:00.000Z",
    "created_at": "2026-03-04T10:30:00.000Z",
    "notes": "Excellent work this month"
  }
}
```

### 2. Get Current Month Score

```bash
curl "$API_URL/staff/STAFF001/score/current"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "staff_id": "STAFF001",
    "month_year": "2026-03",
    "staff_name": "John Doe",
    "attendance_score": 8.5,
    "hygiene_score": 9,
    "discipline_score": 7.5,
    "total_score": 25,
    "normalized_score": 8.33,
    "updated_at": "2026-03-04T10:30:00.000Z"
  }
}
```

### 3. Get Score History

```bash
# Get last 6 months
curl "$API_URL/staff/STAFF001/score/history?limit=6"
```

**Response:**
```json
{
  "success": true,
  "staff_id": "STAFF001",
  "count": 3,
  "data": [
    {
      "staff_id": "STAFF001",
      "month_year": "2026-03",
      "attendance_score": 8.5,
      "total_score": 25.0,
      "normalized_score": 8.33
    },
    {
      "staff_id": "STAFF001",
      "month_year": "2026-02",
      "attendance_score": 7.0,
      "total_score": 23.5,
      "normalized_score": 7.83
    },
    {
      "staff_id": "STAFF001",
      "month_year": "2026-01",
      "attendance_score": 9.0,
      "total_score": 27.0,
      "normalized_score": 9.0
    }
  ]
}
```

### 4. Get Specific Month Score

```bash
curl "$API_URL/staff/STAFF001/score/2026-02"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "staff_id": "STAFF001",
    "month_year": "2026-02",
    "staff_name": "John Doe",
    "attendance_score": 7.0,
    "hygiene_score": 8.5,
    "discipline_score": 8.0,
    "total_score": 23.5,
    "normalized_score": 7.83
  }
}
```

### 5. Get Monthly Leaderboard

```bash
# Get top 10 for March 2026
curl "$API_URL/staff/scores/leaderboard?month_year=2026-03&limit=10"
```

**Response:**
```json
{
  "success": true,
  "month_year": "2026-03",
  "count": 3,
  "data": [
    {
      "staff_id": "STAFF003",
      "staff_name": "Alice Johnson",
      "total_score": 28.5,
      "normalized_score": 9.5,
      "rank": 1
    },
    {
      "staff_id": "STAFF001",
      "staff_name": "John Doe",
      "total_score": 25.0,
      "normalized_score": 8.33,
      "rank": 2
    },
    {
      "staff_id": "STAFF002",
      "staff_name": "Bob Smith",
      "total_score": 22.0,
      "normalized_score": 7.33,
      "rank": 3
    }
  ]
}
```

---

## JavaScript/Node.js Examples

### Using AWS SDK (Direct DynamoDB Access)

```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-south-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

// Get current month_year
function getCurrentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Example 1: Get current month score
async function getCurrentScore(staffId) {
  const result = await dynamodb.send(new GetCommand({
    TableName: 'staff_scores',
    Key: {
      staff_id: staffId,
      month_year: getCurrentMonthYear()
    }
  }));
  
  return result.Item;
}

// Example 2: Get score history
async function getScoreHistory(staffId, limit = 12) {
  const result = await dynamodb.send(new QueryCommand({
    TableName: 'staff_scores',
    KeyConditionExpression: 'staff_id = :staff_id',
    ExpressionAttributeValues: {
      ':staff_id': staffId
    },
    ScanIndexForward: false,
    Limit: limit
  }));
  
  return result.Items;
}

// Example 3: Update staff score
async function updateScore(staffId, staffName, scores) {
  const monthYear = getCurrentMonthYear();
  const totalScore = scores.attendance + scores.hygiene + scores.discipline;
  const normalizedScore = parseFloat((totalScore / 3).toFixed(2));
  
  await dynamodb.send(new PutCommand({
    TableName: 'staff_scores',
    Item: {
      staff_id: staffId,
      month_year: monthYear,
      staff_name: staffName,
      attendance_score: scores.attendance,
      hygiene_score: scores.hygiene,
      discipline_score: scores.discipline,
      total_score: totalScore,
      normalized_score: normalizedScore,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: scores.notes || ''
    }
  }));
  
  return { success: true, monthYear };
}

// Usage
(async () => {
  // Update score
  await updateScore('STAFF001', 'John Doe', {
    attendance: 8.5,
    hygiene: 9.0,
    discipline: 7.5,
    notes: 'Great performance'
  });
  
  // Get current score
  const currentScore = await getCurrentScore('STAFF001');
  console.log('Current Score:', currentScore);
  
  // Get history
  const history = await getScoreHistory('STAFF001', 6);
  console.log('Score History:', history);
})();
```

### Using Fetch API (Frontend)

```javascript
const API_URL = 'https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod';

// Example 1: Update staff score
async function updateStaffScore(staffData) {
  const response = await fetch(`${API_URL}/staff/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(staffData)
  });
  
  return await response.json();
}

// Example 2: Get current month score
async function getCurrentMonthScore(staffId) {
  const response = await fetch(`${API_URL}/staff/${staffId}/score/current`);
  return await response.json();
}

// Example 3: Get score history
async function getScoreHistory(staffId, limit = 12) {
  const response = await fetch(`${API_URL}/staff/${staffId}/score/history?limit=${limit}`);
  return await response.json();
}

// Example 4: Get leaderboard
async function getLeaderboard(monthYear, limit = 10) {
  const url = `${API_URL}/staff/scores/leaderboard?month_year=${monthYear}&limit=${limit}`;
  const response = await fetch(url);
  return await response.json();
}

// Usage
(async () => {
  // Update score
  const result = await updateStaffScore({
    staff_id: 'STAFF001',
    staff_name: 'John Doe',
    attendance_score: 8.5,
    hygiene_score: 9.0,
    discipline_score: 7.5,
    notes: 'Great work!'
  });
  console.log('Update result:', result);
  
  // Get current score
  const score = await getCurrentMonthScore('STAFF001');
  console.log('Current score:', score.data);
  
  // Get leaderboard
  const leaderboard = await getLeaderboard('2026-03', 10);
  console.log('Leaderboard:', leaderboard.data);
})();
```

---

## Frontend Integration Examples

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const API_URL = 'https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod';

// Staff Score Card Component
const StaffScoreCard = ({ staffId }) => {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchCurrentScore();
  }, [staffId]);
  
  const fetchCurrentScore = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/staff/${staffId}/score/current`);
      const data = await response.json();
      setScore(data.data);
    } catch (error) {
      console.error('Error fetching score:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (!score) return <div>No score available for this month</div>;
  
  return (
    <div className="score-card">
      <h3>{score.staff_name}</h3>
      <div className="scores">
        <div>
          <label>Attendance:</label>
          <span>{score.attendance_score}/10</span>
        </div>
        <div>
          <label>Hygiene:</label>
          <span>{score.hygiene_score}/10</span>
        </div>
        <div>
          <label>Discipline:</label>
          <span>{score.discipline_score}/10</span>
        </div>
        <div className="total">
          <label>Overall Score:</label>
          <span>{score.normalized_score}/10</span>
        </div>
      </div>
    </div>
  );
};

// Score Update Form Component
const ScoreUpdateForm = ({ staffId, staffName, onSuccess }) => {
  const [scores, setScores] = useState({
    attendance_score: 0,
    hygiene_score: 0,
    discipline_score: 0,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/staff/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffId,
          staff_name: staffName,
          ...scores
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Score updated successfully!');
        onSuccess && onSuccess(result.data);
      }
    } catch (error) {
      console.error('Error updating score:', error);
      alert('Failed to update score');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Attendance Score (0-10):</label>
        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={scores.attendance_score}
          onChange={(e) => setScores({...scores, attendance_score: parseFloat(e.target.value)})}
        />
      </div>
      <div>
        <label>Hygiene Score (0-10):</label>
        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={scores.hygiene_score}
          onChange={(e) => setScores({...scores, hygiene_score: parseFloat(e.target.value)})}
        />
      </div>
      <div>
        <label>Discipline Score (0-10):</label>
        <input
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={scores.discipline_score}
          onChange={(e) => setScores({...scores, discipline_score: parseFloat(e.target.value)})}
        />
      </div>
      <div>
        <label>Notes:</label>
        <textarea
          value={scores.notes}
          onChange={(e) => setScores({...scores, notes: e.target.value})}
        />
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Updating...' : 'Update Score'}
      </button>
    </form>
  );
};

// Leaderboard Component
const Leaderboard = ({ monthYear, limit = 10 }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLeaderboard();
  }, [monthYear]);
  
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/staff/scores/leaderboard?month_year=${monthYear}&limit=${limit}`
      );
      const data = await response.json();
      setLeaderboard(data.data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading leaderboard...</div>;
  
  return (
    <div className="leaderboard">
      <h2>Top Performers - {monthYear}</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((staff) => (
            <tr key={staff.staff_id}>
              <td>{staff.rank}</td>
              <td>{staff.staff_name}</td>
              <td>{staff.normalized_score}/10</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export { StaffScoreCard, ScoreUpdateForm, Leaderboard };
```

---

## Common Use Cases

### Use Case 1: Monthly Score Review Process

```javascript
// 1. Get all staff who need scoring for this month
async function getStaffNeedingScores() {
  // Assume you have a staff table
  const allStaff = await getAllStaff();
  const currentMonth = getCurrentMonthYear();
  
  const needsScoring = [];
  
  for (const staff of allStaff) {
    const score = await dynamodb.send(new GetCommand({
      TableName: 'staff_scores',
      Key: {
        staff_id: staff.id,
        month_year: currentMonth
      }
    }));
    
    if (!score.Item) {
      needsScoring.push(staff);
    }
  }
  
  return needsScoring;
}

// 2. Batch score updates
async function bulkUpdateScores(scoresData) {
  const results = [];
  
  for (const data of scoresData) {
    try {
      await updateScore(data.staff_id, data.staff_name, data.scores);
      results.push({ staff_id: data.staff_id, success: true });
    } catch (error) {
      results.push({ staff_id: data.staff_id, success: false, error: error.message });
    }
  }
  
  return results;
}
```

### Use Case 2: Performance Trend Analysis

```javascript
// Get staff performance trend over last 6 months
async function getPerformanceTrend(staffId) {
  const history = await getScoreHistory(staffId, 6);
  
  const trend = history.map(record => ({
    month: record.month_year,
    score: record.normalized_score,
    attendance: record.attendance_score,
    hygiene: record.hygiene_score,
    discipline: record.discipline_score
  }));
  
  // Calculate average and trend
  const avgScore = trend.reduce((sum, r) => sum + r.score, 0) / trend.length;
  const isImproving = trend.length >= 2 && 
    trend[0].score > trend[trend.length - 1].score;
  
  return {
    trend,
    average: avgScore.toFixed(2),
    isImproving
  };
}
```

### Use Case 3: Automated Score Calculation

```javascript
// Calculate scores based on attendance data
async function calculateAndUpdateScores(staffId) {
  // Get attendance data for current month
  const attendanceData = await getMonthlyAttendance(staffId);
  
  // Calculate attendance score
  const workDays = 26; // Average work days in month
  const attendanceRate = (attendanceData.daysPresent / workDays) * 100;
  const attendanceScore = Math.min(10, (attendanceRate / 10));
  
  // Get hygiene inspection data
  const hygieneData = await getHygieneInspections(staffId);
  const hygieneScore = 10 - (hygieneData.violations * 0.5);
  
  // Get discipline records
  const disciplineData = await getDisciplineRecords(staffId);
  const disciplineScore = 10 - (disciplineData.incidents * 2);
  
  // Update score
  await updateScore(staffId, attendanceData.staffName, {
    attendance: Math.max(0, attendanceScore),
    hygiene: Math.max(0, hygieneScore),
    discipline: Math.max(0, disciplineScore),
    notes: `Auto-calculated from system data`
  });
}
```

---

## Testing Your Implementation

### Test Script (Node.js)

```javascript
const assert = require('assert');

async function runTests() {
  console.log('Running staff scoring system tests...\n');
  
  // Test 1: Create new score
  console.log('Test 1: Create new score');
  const createResult = await updateStaffScore({
    staff_id: 'TEST001',
    staff_name: 'Test User',
    attendance_score: 8.0,
    hygiene_score: 9.0,
    discipline_score: 7.5
  });
  assert(createResult.success === true, 'Failed to create score');
  console.log('✓ Passed\n');
  
  // Test 2: Get current month score
  console.log('Test 2: Get current month score');
  const currentScore = await getCurrentMonthScore('TEST001');
  assert(currentScore.data !== null, 'Failed to retrieve score');
  assert(currentScore.data.total_score === 24.5, 'Incorrect total score');
  console.log('✓ Passed\n');
  
  // Test 3: Update existing score
  console.log('Test 3: Update existing score');
  const updateResult = await updateStaffScore({
    staff_id: 'TEST001',
    staff_name: 'Test User',
    attendance_score: 9.0,
    hygiene_score: 9.5,
    discipline_score: 8.0
  });
  assert(updateResult.success === true, 'Failed to update score');
  console.log('✓ Passed\n');
  
  // Test 4: Get score history
  console.log('Test 4: Get score history');
  const history = await getScoreHistory('TEST001');
  assert(history.length > 0, 'Failed to retrieve history');
  console.log('✓ Passed\n');
  
  console.log('All tests passed! ✓');
}

runTests().catch(console.error);
```

---

## Troubleshooting

### Common Issues

1. **Score not found for current month:**
   - Ensure you're checking the correct month_year format
   - Verify the staff_id exists
   - Check if a record needs to be created first

2. **Permission errors:**
   - Verify Lambda IAM role has DynamoDB permissions
   - Check API Gateway has permission to invoke Lambda

3. **Validation errors:**
   - All scores must be between 0 and 10
   - staff_id is required for all operations
   - month_year must be in YYYY-MM format

4. **CORS errors (frontend):**
   - Ensure CORS is properly configured in API Gateway
   - Check that OPTIONS method is enabled

---

## Support and Documentation

- **Main Documentation:** [STAFF_SCORING_SYSTEM.md](STAFF_SCORING_SYSTEM.md)
- **API Gateway Setup:** [API_GATEWAY_CONFIG.md](API_GATEWAY_CONFIG.md)
- **Deployment Guide:** Run `deploy-staff-scoring.ps1`

Need help? Check the CloudWatch logs for your Lambda function for detailed error messages.
