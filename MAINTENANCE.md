# Maintenance & Troubleshooting Guide

## Regular Maintenance Tasks

### Daily Tasks

#### 1. Monitor System Health
```bash
# Check Lambda errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=skycap-authHandler-prod \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# Check API Gateway errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name 5XXError \
  --dimensions Name=ApiName,Value=SkycapLoansAPI \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

#### 2. Check Recent Logs
```bash
# View last 100 log entries
aws logs tail /aws/lambda/skycap-loansHandler-prod --since 1h
```

### Weekly Tasks

#### 1. Backup DynamoDB Tables
```bash
# Create on-demand backup
aws dynamodb create-backup \
  --table-name SkycapLoans \
  --backup-name SkycapLoans-$(date +%Y%m%d)

aws dynamodb create-backup \
  --table-name SkycapUsers \
  --backup-name SkycapUsers-$(date +%Y%m%d)

aws dynamodb create-backup \
  --table-name SkycapRepayments \
  --backup-name SkycapRepayments-$(date +%Y%m%d)
```

#### 2. Review Error Logs
```bash
# Get error logs from the past week
aws logs filter-log-events \
  --log-group-name /aws/lambda/skycap-loansHandler-prod \
  --filter-pattern "ERROR" \
  --start-time $(date -d '7 days ago' +%s)000
```

#### 3. Check Storage Usage
```bash
# Check DynamoDB table size
aws dynamodb describe-table \
  --table-name SkycapLoans \
  --query 'Table.TableSizeBytes'

# Check S3 bucket size
aws s3 ls s3://your-documents-bucket --recursive --summarize
```

### Monthly Tasks

#### 1. Cost Analysis
```bash
# Get cost and usage report
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '1 month ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

#### 2. Security Audit
- Review IAM roles and policies
- Check for unused resources
- Update dependencies
- Review CloudTrail logs

#### 3. Performance Review
- Analyze Lambda execution times
- Check DynamoDB throughput
- Review API Gateway latency
- Optimize slow queries

## Common Issues and Solutions

### Issue 1: Login Not Working

**Symptoms:**
- Users cannot log in
- "Invalid credentials" error
- 401 Unauthorized responses

**Diagnosis:**
```bash
# Check users table
aws dynamodb scan --table-name SkycapUsers

# Check Lambda logs
aws logs tail /aws/lambda/skycap-authHandler-prod --follow
```

**Solutions:**

1. **Users not seeded:**
```bash
cd amplify/backend/storage/skycapdb
node seed-users.js
```

2. **Wrong JWT secret:**
```bash
# Update Lambda environment variable
aws lambda update-function-configuration \
  --function-name skycap-authHandler-prod \
  --environment Variables="{JWT_SECRET=your-correct-secret}"
```

3. **Password mismatch:**
```bash
# Reset user password in DynamoDB
# (Hash the password first using SHA256)
```

### Issue 2: CORS Errors

**Symptoms:**
- "Access-Control-Allow-Origin" error in browser console
- Options requests failing
- Frontend cannot connect to API

**Diagnosis:**
```bash
# Test CORS
curl -X OPTIONS https://YOUR_API_ENDPOINT/api/auth/login \
  -H "Origin: https://your-frontend-domain.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Solutions:**

1. **Check Lambda response headers:**
   - Verify corsHeaders are included in all responses
   - Ensure OPTIONS method handler returns 200

2. **Update API Gateway:**
```bash
# Enable CORS in API Gateway
aws apigateway update-integration-response \
  --rest-api-id YOUR_API_ID \
  --resource-id YOUR_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --patch-operations ...
```

### Issue 3: Loan Application Not Submitting

**Symptoms:**
- Form submission fails
- No error message shown
- Network request times out

**Diagnosis:**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/skycap-loansHandler-prod --follow

# Test endpoint directly
curl -X POST https://YOUR_API_ENDPOINT/api/loans/apply \
  -H "Content-Type: application/json" \
  -d @test-loan.json
```

**Solutions:**

1. **Lambda timeout:**
```bash
# Increase timeout
aws lambda update-function-configuration \
  --function-name skycap-loansHandler-prod \
  --timeout 60
```

2. **DynamoDB permissions:**
```bash
# Check IAM role has DynamoDB access
aws iam get-role-policy \
  --role-name skycap-lambda-role-prod \
  --policy-name DynamoDBAccess
```

3. **Table not exists:**
```bash
# Verify table exists
aws dynamodb describe-table --table-name SkycapLoans
```

### Issue 4: File Upload Failing

**Symptoms:**
- Documents not uploading
- S3 errors in logs
- Large files timing out

**Diagnosis:**
```bash
# Check S3 bucket
aws s3 ls s3://your-documents-bucket/

# Check Lambda memory/timeout
aws lambda get-function-configuration \
  --function-name skycap-loansHandler-prod
```

**Solutions:**

1. **Increase Lambda memory:**
```bash
aws lambda update-function-configuration \
  --function-name skycap-loansHandler-prod \
  --memory-size 1024
```

2. **Use presigned URLs:**
   - Generate S3 presigned URL in Lambda
   - Upload directly from browser to S3
   - Store reference in DynamoDB

### Issue 5: High API Costs

**Symptoms:**
- Unexpected high AWS bill
- Many API Gateway requests
- High Lambda invocations

**Diagnosis:**
```bash
# Check API request count
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=SkycapLoansAPI \
  --start-time $(date -d '1 month ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum
```

**Solutions:**

1. **Enable API caching:**
```bash
aws apigateway create-stage \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --cache-cluster-enabled \
  --cache-cluster-size '0.5'
```

2. **Optimize queries:**
   - Use DynamoDB queries instead of scans
   - Add pagination
   - Cache frequent requests

3. **Rate limiting:**
```bash
# Add throttling
aws apigateway update-stage \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --patch-operations \
    op=replace,path=/throttle/rateLimit,value=100 \
    op=replace,path=/throttle/burstLimit,value=200
```

### Issue 6: Dashboard Not Loading

**Symptoms:**
- Statistics showing 0
- Tables empty
- Loading forever

**Diagnosis:**
```bash
# Check browser console for errors
# Test API endpoint directly
curl -X GET https://YOUR_API_ENDPOINT/api/loans/stats/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Solutions:**

1. **Check token expiration:**
   - JWT tokens expire after 24 hours
   - Clear localStorage and re-login

2. **API endpoint mismatch:**
   - Verify API URL in JavaScript files
   - Check for http vs https

3. **DynamoDB data issue:**
```bash
# Check if data exists
aws dynamodb scan --table-name SkycapLoans --max-items 1
```

### Issue 7: Repayments Not Recording

**Symptoms:**
- Payment button not working
- Form submission fails
- No confirmation message

**Diagnosis:**
```bash
# Check repayments handler logs
aws logs tail /aws/lambda/skycap-repaymentsHandler-prod --follow

# Test endpoint
curl -X POST https://YOUR_API_ENDPOINT/api/repayments \
  -H "Authorization: Bearer ACCOUNTANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-payment.json
```

**Solutions:**

1. **Role permission:**
   - Verify user has accountant role
   - Check token contains correct role

2. **Loan not disbursed:**
   - Repayments only for disbursed loans
   - Check loan status first

3. **Database constraint:**
```bash
# Verify repayments table
aws dynamodb describe-table --table-name SkycapRepayments
```

## Performance Optimization

### 1. Lambda Optimization

```bash
# Increase memory (also increases CPU)
aws lambda update-function-configuration \
  --function-name skycap-loansHandler-prod \
  --memory-size 512

# Enable provisioned concurrency (keeps functions warm)
aws lambda put-provisioned-concurrency-config \
  --function-name skycap-loansHandler-prod \
  --provisioned-concurrent-executions 5 \
  --qualifier prod
```

### 2. DynamoDB Optimization

```bash
# Enable DAX (caching layer)
aws dax create-cluster \
  --cluster-name skycap-dax \
  --node-type dax.t3.small \
  --replication-factor 1 \
  --iam-role-arn arn:aws:iam::ACCOUNT:role/DAXRole
```

### 3. API Gateway Caching

```bash
# Enable caching
aws apigateway update-stage \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --patch-operations op=replace,path=/cacheClusterEnabled,value=true
```

## Disaster Recovery

### Backup Strategy

#### 1. Automated Backups
```bash
# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
  --table-name SkycapLoans \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

#### 2. Export Data
```bash
# Export to S3
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:REGION:ACCOUNT:table/SkycapLoans \
  --s3-bucket skycap-backups \
  --export-format DYNAMODB_JSON
```

### Recovery Procedures

#### 1. Restore Table
```bash
# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name SkycapLoans-Restored \
  --backup-arn arn:aws:dynamodb:REGION:ACCOUNT:table/SkycapLoans/backup/BACKUP_NAME
```

#### 2. Point-in-Time Recovery
```bash
# Restore to specific time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name SkycapLoans \
  --target-table-name SkycapLoans-Recovered \
  --restore-date-time 2024-01-15T10:00:00Z
```

## Monitoring Dashboard

### Create CloudWatch Dashboard

```bash
aws cloudwatch put-dashboard \
  --dashboard-name SkycapLoans \
  --dashboard-body file://dashboard.json
```

dashboard.json:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum", "label": "Lambda Invocations"}]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Lambda Activity"
      }
    }
  ]
}
```

### Set Up Alarms

```bash
# Lambda errors alarm
aws cloudwatch put-metric-alarm \
  --alarm-name skycap-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT:alerts

# API Gateway 5XX errors
aws cloudwatch put-metric-alarm \
  --alarm-name skycap-api-5xx-errors \
  --alarm-description "Alert on API 5XX errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:REGION:ACCOUNT:alerts
```

## System Updates

### Update Lambda Functions

```bash
# Update function code
cd amplify/backend/function/loansHandler/src
npm update
zip -r ../function.zip .

aws lambda update-function-code \
  --function-name skycap-loansHandler-prod \
  --zip-file fileb://../function.zip
```

### Update Frontend

```bash
# Update frontend files
aws s3 sync public/ s3://amplify-skycap-prod/

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Security Hardening

### 1. Enable WAF
```bash
aws wafv2 create-web-acl \
  --name skycap-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json
```

### 2. Enable GuardDuty
```bash
aws guardduty create-detector --enable
```

### 3. Rotate Secrets
```bash
# Store JWT secret in Secrets Manager
aws secretsmanager create-secret \
  --name skycap/jwt-secret \
  --secret-string "your-new-secret"

# Update Lambda to use Secrets Manager
```

## Support Contacts

- **AWS Support**: https://console.aws.amazon.com/support/
- **Amplify Documentation**: https://docs.amplify.aws/
- **DynamoDB Support**: https://docs.aws.amazon.com/dynamodb/

## Additional Resources

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
