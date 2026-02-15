# Testing Guide - Skycap Loans

This guide provides comprehensive testing instructions for the Skycap Loans Management System.

## Pre-Deployment Testing

### 1. Lambda Function Testing (Local)

Install AWS SAM CLI:
```bash
pip install aws-sam-cli
```

Test auth handler:
```bash
sam local invoke authHandler -e test-events/login-event.json
```

### 2. API Testing with Postman

Import the provided Postman collection and test all endpoints.

## Post-Deployment Testing

### 1. Authentication Tests

#### Test Login
```bash
curl -X POST https://YOUR_API_ENDPOINT/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'
```

Expected response:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "userId": "...",
    "username": "admin",
    "full_name": "System Administrator",
    "role": "admin",
    "email": "admin@skycap.com"
  }
}
```

#### Test Token Verification
```bash
TOKEN="your-token-here"
curl -X GET https://YOUR_API_ENDPOINT/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Loan Application Tests

#### Submit Loan Application (Public)
```bash
curl -X POST https://YOUR_API_ENDPOINT/api/loans/apply \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "idNumber": "123456789",
    "contactNumber": "+267 12345678",
    "physicalAddress": "123 Main St",
    "postalAddress": "P.O. Box 123",
    "kinName": "Jane Doe",
    "kinRelationship": "Spouse",
    "kinAddress": "123 Main St",
    "marriedInCommunity": "No",
    "loanAmount": "5000",
    "interestRate": "10",
    "totalAmount": "5500",
    "loanPeriodMonths": "12",
    "loanDate": "2024-01-15",
    "bankName": "ABC Bank",
    "accountNumber": "1234567890",
    "branch": "Main Branch",
    "repaymentMethod": "Salary Deduction",
    "termsAccepted": "[]"
  }'
```

Expected response:
```json
{
  "success": true,
  "reference": "uuid-here",
  "message": "Loan application submitted successfully"
}
```

#### Get All Loans (Authenticated)
```bash
TOKEN="your-token-here"
curl -X GET https://YOUR_API_ENDPOINT/api/loans \
  -H "Authorization: Bearer $TOKEN"
```

#### Get Loan by ID
```bash
TOKEN="your-token-here"
LOAN_ID="loan-uuid"
curl -X GET https://YOUR_API_ENDPOINT/api/loans/$LOAN_ID \
  -H "Authorization: Bearer $TOKEN"
```

#### Review Loan (Checker)
```bash
TOKEN="checker-token"
LOAN_ID="loan-uuid"
curl -X POST https://YOUR_API_ENDPOINT/api/loans/$LOAN_ID/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "comments": "All documents verified. Approved."
  }'
```

#### Disburse Loan (Accountant)
```bash
TOKEN="accountant-token"
LOAN_ID="loan-uuid"
curl -X POST https://YOUR_API_ENDPOINT/api/loans/$LOAN_ID/disburse \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceNumber": "TXN123456"
  }'
```

### 3. Repayment Tests

#### Record Payment (Accountant)
```bash
TOKEN="accountant-token"
curl -X POST https://YOUR_API_ENDPOINT/api/repayments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loanId": "loan-uuid",
    "paymentDate": "2024-02-15",
    "amountPaid": 500,
    "paymentMethod": "Bank Transfer",
    "referenceNumber": "REF123456",
    "notes": "First installment"
  }'
```

#### Get All Repayments
```bash
TOKEN="your-token"
curl -X GET https://YOUR_API_ENDPOINT/api/repayments \
  -H "Authorization: Bearer $TOKEN"
```

#### Get Loan Repayment History
```bash
TOKEN="your-token"
LOAN_ID="loan-uuid"
curl -X GET https://YOUR_API_ENDPOINT/api/repayments/loan/$LOAN_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Statistics Tests

#### Loan Statistics
```bash
TOKEN="your-token"
curl -X GET https://YOUR_API_ENDPOINT/api/loans/stats/summary \
  -H "Authorization: Bearer $TOKEN"
```

Expected response:
```json
{
  "total": 10,
  "pending": 3,
  "approved": 2,
  "rejected": 1,
  "disbursed": 4,
  "totalAmount": 50000
}
```

#### Repayment Statistics
```bash
TOKEN="your-token"
curl -X GET https://YOUR_API_ENDPOINT/api/repayments/stats/summary \
  -H "Authorization: Bearer $TOKEN"
```

## Frontend Testing

### 1. Public Pages
- [ ] Home page loads correctly
- [ ] Logo displays
- [ ] Navigation works
- [ ] Requirements page shows all criteria
- [ ] Contact page displays correctly
- [ ] Loan application form works
  - [ ] Step 1: Personal Information
  - [ ] Step 2: Loan Details
  - [ ] Step 3: Bank Information
  - [ ] Step 4: Terms & Conditions
  - [ ] Step 5: Review & Submit

### 2. Staff Portal

#### Login Page
- [ ] Login form displays
- [ ] Invalid credentials show error
- [ ] Valid credentials redirect to dashboard
- [ ] Token stored in localStorage

#### Dashboard
- [ ] Statistics cards display correctly
- [ ] Recent loans table loads
- [ ] User info shows in sidebar
- [ ] Role-specific actions display

#### Loans Page
- [ ] All loans display in table
- [ ] Search filters work
- [ ] Status filter works
- [ ] View loan details modal
- [ ] Checker can review loans
- [ ] Accountant can disburse loans

#### Repayments Page
- [ ] Statistics display correctly
- [ ] Recent repayments table loads
- [ ] Record payment button works
- [ ] Payment form validates
- [ ] Loan info loads when selected

## Role-Based Access Testing

### Admin Role
- [ ] Can access all pages
- [ ] Can view all loans
- [ ] Can view all repayments
- [ ] Can view statistics

### Maker Role
- [ ] Can access dashboard
- [ ] Can view loans (limited)
- [ ] Cannot review loans
- [ ] Cannot disburse loans

### Checker Role
- [ ] Can access dashboard
- [ ] Can view all loans
- [ ] Can review pending loans
- [ ] Cannot disburse loans
- [ ] Cannot record repayments

### Accountant Role
- [ ] Can access dashboard
- [ ] Can view disbursed loans
- [ ] Can disburse approved loans
- [ ] Can record repayments
- [ ] Can view repayment stats

## Security Testing

### 1. Authentication
- [ ] Unauthenticated requests return 401
- [ ] Invalid tokens return 401
- [ ] Expired tokens return 401
- [ ] Token refresh works (if implemented)

### 2. Authorization
- [ ] Makers cannot review loans
- [ ] Checkers cannot disburse loans
- [ ] Only accountants can record payments
- [ ] Cross-role access denied

### 3. Input Validation
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection (if applicable)
- [ ] File upload validation
- [ ] Required field validation

## Performance Testing

### 1. Load Testing

Use Apache Bench:
```bash
# Test login endpoint
ab -n 1000 -c 10 -p login.json -T application/json \
  https://YOUR_API_ENDPOINT/api/auth/login

# Test get loans endpoint
ab -n 1000 -c 10 -H "Authorization: Bearer TOKEN" \
  https://YOUR_API_ENDPOINT/api/loans
```

### 2. Response Time
- [ ] API responses < 200ms (warm)
- [ ] Page load < 2s
- [ ] Database queries < 100ms

### 3. Concurrent Users
- [ ] System handles 100 concurrent users
- [ ] No errors under normal load
- [ ] Graceful degradation under high load

## Integration Testing

### 1. End-to-End Workflow

Test complete loan lifecycle:

1. **Application**
   ```bash
   # Submit application
   RESPONSE=$(curl -s -X POST ...)
   LOAN_ID=$(echo $RESPONSE | jq -r '.reference')
   ```

2. **Review**
   ```bash
   # Login as checker
   TOKEN=$(curl -s -X POST ... | jq -r '.token')
   
   # Review loan
   curl -X POST .../loans/$LOAN_ID/review ...
   ```

3. **Disbursement**
   ```bash
   # Login as accountant
   TOKEN=$(curl -s -X POST ... | jq -r '.token')
   
   # Disburse loan
   curl -X POST .../loans/$LOAN_ID/disburse ...
   ```

4. **Repayment**
   ```bash
   # Record payment
   curl -X POST .../repayments ...
   ```

5. **Verification**
   ```bash
   # Check loan status
   curl -X GET .../loans/$LOAN_ID ...
   
   # Check repayments
   curl -X GET .../repayments/loan/$LOAN_ID ...
   ```

## Database Testing

### 1. Data Integrity
```bash
# Check users table
aws dynamodb scan --table-name SkycapUsers

# Check loans table
aws dynamodb scan --table-name SkycapLoans

# Check repayments table
aws dynamodb scan --table-name SkycapRepayments
```

### 2. Query Performance
```bash
# Test GSI queries
aws dynamodb query --table-name SkycapLoans \
  --index-name StatusIndex \
  --key-condition-expression "status = :status" \
  --expression-attribute-values '{":status":{"S":"pending"}}'
```

## Automated Testing

### Create Test Script
```bash
#!/bin/bash
# test-suite.sh

API_URL="https://YOUR_API_ENDPOINT/api"

echo "Running test suite..."

# Test 1: Login
echo "Test 1: Authentication"
RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}')

if echo $RESPONSE | jq -e '.token' > /dev/null; then
  echo "✓ Authentication test passed"
  TOKEN=$(echo $RESPONSE | jq -r '.token')
else
  echo "✗ Authentication test failed"
  exit 1
fi

# Test 2: Get loans
echo "Test 2: Get loans"
RESPONSE=$(curl -s -X GET $API_URL/loans \
  -H "Authorization: Bearer $TOKEN")

if echo $RESPONSE | jq -e 'type == "array"' > /dev/null; then
  echo "✓ Get loans test passed"
else
  echo "✗ Get loans test failed"
  exit 1
fi

# Add more tests...

echo "All tests passed!"
```

## Monitoring and Logging

### 1. CloudWatch Logs
```bash
# View Lambda logs
aws logs tail /aws/lambda/skycap-authHandler-prod --follow

# View API Gateway logs
aws logs tail API-Gateway-Execution-Logs_YOUR_API_ID/prod --follow
```

### 2. X-Ray Tracing
Enable X-Ray for Lambda functions to trace requests.

## Troubleshooting Tests

### Common Issues

1. **CORS Errors**
   - Check Lambda response headers
   - Verify API Gateway CORS configuration

2. **401 Unauthorized**
   - Check token validity
   - Verify Authorization header format

3. **500 Internal Error**
   - Check CloudWatch logs
   - Verify environment variables
   - Check IAM permissions

4. **Timeout Errors**
   - Increase Lambda timeout
   - Check database connection
   - Optimize queries

## Test Checklist

Before production:
- [ ] All API endpoints tested
- [ ] All user roles tested
- [ ] Security vulnerabilities checked
- [ ] Performance benchmarks met
- [ ] Error handling verified
- [ ] Logging working correctly
- [ ] Backup and recovery tested
- [ ] Documentation updated
- [ ] User acceptance testing completed

## Continuous Testing

Set up automated tests in CI/CD pipeline:
1. Unit tests for Lambda functions
2. Integration tests for API endpoints
3. End-to-end tests for workflows
4. Performance tests for load handling

## Test Data Cleanup

After testing:
```bash
# Delete test loans
aws dynamodb scan --table-name SkycapLoans \
  --filter-expression "contains(firstName, :test)" \
  --expression-attribute-values '{":test":{"S":"Test"}}' \
  | jq -r '.Items[].loanId.S' \
  | xargs -I {} aws dynamodb delete-item \
    --table-name SkycapLoans \
    --key '{"loanId":{"S":"{}"}}'
```

---

For issues during testing, check:
1. CloudWatch logs
2. API Gateway execution logs
3. DynamoDB table metrics
4. Lambda function errors
