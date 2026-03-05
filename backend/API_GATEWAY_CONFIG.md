# API Gateway Configuration for Staff Scoring System

## API Gateway Setup

### Create REST API

1. **API Name:** `staff-scoring-api`
2. **Description:** Staff performance scoring system API
3. **Endpoint Type:** Regional

### Resources and Methods

```
/staff
  /score (POST)
  /{staff_id}
    /score
      /current (GET)
      /history (GET)
      /{month_year} (GET)
  /scores
    /leaderboard (GET)
```

### Detailed Endpoint Configuration

#### 1. POST /staff/score

**Method:** POST  
**Integration Type:** Lambda Function  
**Lambda Function:** staff-scoring-lambda  
**Use Lambda Proxy Integration:** Yes

**Request Body Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "object",
  "properties": {
    "staff_id": { "type": "string" },
    "staff_name": { "type": "string" },
    "attendance_score": { "type": "number", "minimum": 0, "maximum": 10 },
    "hygiene_score": { "type": "number", "minimum": 0, "maximum": 10 },
    "discipline_score": { "type": "number", "minimum": 0, "maximum": 10 },
    "notes": { "type": "string" }
  },
  "required": ["staff_id"]
}
```

#### 2. GET /staff/{staff_id}/score/current

**Method:** GET  
**Integration Type:** Lambda Function  
**Lambda Function:** staff-scoring-lambda  
**Use Lambda Proxy Integration:** Yes  
**Path Parameters:** `staff_id` (required)

#### 3. GET /staff/{staff_id}/score/history

**Method:** GET  
**Integration Type:** Lambda Function  
**Lambda Function:** staff-scoring-lambda  
**Use Lambda Proxy Integration:** Yes  
**Path Parameters:** `staff_id` (required)  
**Query Parameters:** `limit` (optional, default: 12)

#### 4. GET /staff/{staff_id}/score/{month_year}

**Method:** GET  
**Integration Type:** Lambda Function  
**Lambda Function:** staff-scoring-lambda  
**Use Lambda Proxy Integration:** Yes  
**Path Parameters:** 
- `staff_id` (required)
- `month_year` (required, format: YYYY-MM)

#### 5. GET /staff/scores/leaderboard

**Method:** GET  
**Integration Type:** Lambda Function  
**Lambda Function:** staff-scoring-lambda  
**Use Lambda Proxy Integration:** Yes  
**Query Parameters:**
- `month_year` (optional, format: YYYY-MM, default: current month)
- `limit` (optional, default: 10)

### CORS Configuration

Enable CORS for all endpoints:

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
}
```

### Authorization

**Recommended Options:**

1. **API Key (Simple):**
   - Create API key in API Gateway
   - Require API key for all methods
   - Distribute key to authorized clients

2. **IAM Authorization (More Secure):**
   - Use AWS Signature Version 4
   - Grant IAM users/roles permission to invoke API

3. **Lambda Authorizer (Custom):**
   - Implement custom JWT token validation
   - Integrate with existing auth system

4. **Cognito User Pools (Enterprise):**
   - Use AWS Cognito for user authentication
   - Validate tokens at API Gateway level

### Deployment

1. **Stage:** `prod`
2. **Stage Variables:**
   - `lambdaAlias`: `prod`

3. **Throttling:**
   - Rate: 1000 requests per second
   - Burst: 2000 requests

4. **Usage Plans:**
   - Basic: 1000 requests/day
   - Premium: 10000 requests/day

### CloudFormation Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'API Gateway for Staff Scoring System'

Resources:
  StaffScoringAPI:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: staff-scoring-api
      Description: Staff performance scoring system API
      EndpointConfiguration:
        Types:
          - REGIONAL

  StaffResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref StaffScoringAPI
      ParentId: !GetAtt StaffScoringAPI.RootResourceId
      PathPart: staff

  ScoreResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref StaffScoringAPI
      ParentId: !Ref StaffResource
      PathPart: score

  ScorePostMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref StaffScoringAPI
      ResourceId: !Ref ScoreResource
      HttpMethod: POST
      AuthorizationType: NONE
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${StaffScoringLambda.Arn}/invocations'

  StaffIdResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref StaffScoringAPI
      ParentId: !Ref StaffResource
      PathPart: '{staff_id}'

  # Add more resources and methods as needed...

  APIDeployment:
    Type: AWS::ApiGateway::Deployment
    DependsOn:
      - ScorePostMethod
    Properties:
      RestApiId: !Ref StaffScoringAPI
      StageName: prod

Outputs:
  ApiUrl:
    Description: API Gateway endpoint URL
    Value: !Sub 'https://${StaffScoringAPI}.execute-api.${AWS::Region}.amazonaws.com/prod'
```

### Testing with curl

```bash
# Update staff score
curl -X POST https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/staff/score \
  -H "Content-Type: application/json" \
  -d '{
    "staff_id": "STAFF001",
    "staff_name": "John Doe",
    "attendance_score": 8.5,
    "hygiene_score": 9.0,
    "discipline_score": 7.5,
    "notes": "Great performance"
  }'

# Get current month score
curl https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/staff/STAFF001/score/current

# Get score history
curl https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/staff/STAFF001/score/history?limit=6

# Get specific month score
curl https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/staff/STAFF001/score/2026-03

# Get leaderboard
curl https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/staff/scores/leaderboard?month_year=2026-03&limit=10
```

### Monitoring

- Enable CloudWatch Logs for API Gateway
- Set up CloudWatch Alarms for:
  - 4XX errors (client errors)
  - 5XX errors (server errors)
  - High latency (> 1000ms)
  - Throttled requests

### Cost Optimization

- Use caching for frequently accessed endpoints (e.g., leaderboard)
- Set appropriate cache TTL (e.g., 5 minutes for leaderboard)
- Implement pagination for large result sets
