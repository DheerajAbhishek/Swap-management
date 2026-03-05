# Staff Performance Scoring System

## Overview
This is a serverless staff performance scoring system that tracks monthly staff performance scores using AWS services.

## Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   S3 Static  │────▶│ API Gateway │────▶│  Lambda      │────▶│  DynamoDB    │
│   Website    │     │  Endpoints  │     │  (Node.js)   │     │staff_scores  │
└──────────────┘     └─────────────┘     └──────────────┘     └──────────────┘
```

## DynamoDB Table Design

### Table: `staff_scores`

**Primary Key Structure:**
- **Partition Key:** `staff_id` (String) - Unique identifier for each staff member
- **Sort Key:** `month_year` (String) - Format: "YYYY-MM" (e.g., "2026-03")

**Attributes:**
```json
{
  "staff_id": "string",           // Partition key
  "month_year": "string",         // Sort key (format: "YYYY-MM")
  "staff_name": "string",         // Staff member name (optional)
  "attendance_score": "number",   // 0-10 points
  "hygiene_score": "number",      // 0-10 points  
  "discipline_score": "number",   // 0-10 points
  "total_score": "number",        // Sum of all scores (0-30), can be normalized to 0-10
  "created_at": "string",         // ISO timestamp of record creation
  "updated_at": "string",         // ISO timestamp of last update
  "notes": "string"               // Optional notes or comments
}
```

**Sample Record:**
```json
{
  "staff_id": "STAFF001",
  "month_year": "2026-03",
  "staff_name": "John Doe",
  "attendance_score": 8.5,
  "hygiene_score": 9.0,
  "discipline_score": 7.5,
  "total_score": 25.0,
  "created_at": "2026-03-01T00:00:00.000Z",
  "updated_at": "2026-03-04T10:30:00.000Z",
  "notes": "Consistent performance"
}
```

### GSI (Global Secondary Index) - Optional

For querying all staff scores for a specific month:

**Index Name:** `month_year-index`
- **Partition Key:** `month_year` (String)
- **Sort Key:** `total_score` (Number) - Allows sorting by score

### Table Creation Command

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

## Score Calculation Logic

### Individual Score Components (0-10 each)

1. **Attendance Score (0-10)**
   - 10 points: Perfect attendance (100%)
   - 8-9 points: 1-2 absences per month
   - 6-7 points: 3-4 absences per month
   - 4-5 points: 5-6 absences per month
   - 0-3 points: More than 6 absences

2. **Hygiene Score (0-10)**
   - 10 points: All hygiene checks passed
   - 8-9 points: 1-2 minor violations
   - 6-7 points: 3-4 minor violations
   - 4-5 points: 5+ violations or 1 major violation
   - 0-3 points: Multiple major violations

3. **Discipline Score (0-10)**
   - 10 points: No discipline issues
   - 8-9 points: 1-2 minor warnings
   - 6-7 points: 3-4 warnings
   - 4-5 points: 1 major incident
   - 0-3 points: Multiple major incidents

### Total Score
- **Sum:** 0-30 points (sum of all three components)
- **Normalized:** 0-10 points (divide by 3 for average)

## API Endpoints

### 1. Update Staff Score
**POST** `/staff/score`

Updates or creates a staff member's score for the current month.

**Request Body:**
```json
{
  "staff_id": "STAFF001",
  "staff_name": "John Doe",
  "attendance_score": 8.5,
  "hygiene_score": 9.0,
  "discipline_score": 7.5,
  "notes": "Good performance this month"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Score updated successfully",
  "data": {
    "staff_id": "STAFF001",
    "month_year": "2026-03",
    "attendance_score": 8.5,
    "hygiene_score": 9.0,
    "discipline_score": 7.5,
    "total_score": 25.0,
    "updated_at": "2026-03-04T10:30:00.000Z"
  }
}
```

### 2. Get Current Month Score
**GET** `/staff/{staff_id}/score/current`

Retrieves the staff member's score for the current month.

**Response:**
```json
{
  "success": true,
  "data": {
    "staff_id": "STAFF001",
    "month_year": "2026-03",
    "staff_name": "John Doe",
    "attendance_score": 8.5,
    "hygiene_score": 9.0,
    "discipline_score": 7.5,
    "total_score": 25.0,
    "normalized_score": 8.33,
    "updated_at": "2026-03-04T10:30:00.000Z"
  }
}
```

### 3. Get Staff Score History
**GET** `/staff/{staff_id}/score/history`

Retrieves all historical scores for a staff member.

**Query Parameters:**
- `limit` (optional): Number of months to retrieve (default: 12)

**Response:**
```json
{
  "success": true,
  "staff_id": "STAFF001",
  "data": [
    {
      "month_year": "2026-03",
      "attendance_score": 8.5,
      "hygiene_score": 9.0,
      "discipline_score": 7.5,
      "total_score": 25.0,
      "normalized_score": 8.33
    },
    {
      "month_year": "2026-02",
      "attendance_score": 7.0,
      "hygiene_score": 8.5,
      "discipline_score": 8.0,
      "total_score": 23.5,
      "normalized_score": 7.83
    }
  ]
}
```

### 4. Get Month Leaderboard
**GET** `/staff/scores/leaderboard`

Retrieves top-performing staff for a specific month.

**Query Parameters:**
- `month_year` (optional): Format "YYYY-MM" (default: current month)
- `limit` (optional): Number of results (default: 10)

**Response:**
```json
{
  "success": true,
  "month_year": "2026-03",
  "data": [
    {
      "staff_id": "STAFF002",
      "staff_name": "Jane Smith",
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
    }
  ]
}
```

## Best Practices

1. **Automatic Month Detection:** Lambda automatically detects the current month/year
2. **Idempotent Updates:** Updating the same month's score multiple times is safe
3. **Historical Tracking:** Never delete old records - maintain complete history
4. **Score Validation:** All scores must be between 0 and 10
5. **Atomic Updates:** Use DynamoDB transactions for critical operations
6. **Error Handling:** Comprehensive error handling for all edge cases

## Monitoring and Maintenance

- Monitor Lambda execution times and errors via CloudWatch
- Set up alarms for failed score updates
- Regular backups of DynamoDB table
- Review and adjust scoring criteria based on business needs

## Security

- API Gateway with IAM authentication or API keys
- Lambda execution role with minimal DynamoDB permissions
- Input validation for all API requests
- Encryption at rest for DynamoDB table

## Cost Estimation

**For 100 staff members:**
- DynamoDB: ~$1-2/month (on-demand pricing)
- Lambda: ~$0.50/month (assuming 3000 invocations)
- API Gateway: ~$3.50/month (1 million requests)
- **Total: ~$5-6/month**
