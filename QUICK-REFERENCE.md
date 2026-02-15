# Quick Reference Guide

## Essential Commands

### Initial Deployment
```bash
# 1. Run automated deployment
./deploy.sh

# 2. Update frontend configuration with API endpoint
./update-config.sh

# 3. Publish to Amplify hosting
amplify publish
```

### Manual Deployment
```bash
# Initialize Amplify
amplify init

# Deploy backend
amplify push

# Publish frontend
amplify publish
```

## File Structure Overview

```
skycap-amplify/
│
├── amplify/                          # AWS Amplify backend
│   └── backend/
│       ├── api/                      # API Gateway config
│       │   └── skycaploansapi/
│       │       └── *.json
│       ├── function/                 # Lambda functions
│       │   ├── authHandler/
│       │   ├── loansHandler/
│       │   └── repaymentsHandler/
│       └── storage/                  # DynamoDB & S3
│           └── skycapdb/
│               ├── *.json
│               └── seed-users.js
│
├── public/                           # Frontend files
│   ├── css/                          # Stylesheets
│   ├── js/                           # JavaScript
│   ├── images/                       # Assets
│   └── *.html                        # HTML pages
│
├── deploy.sh                         # Automated deployment
├── update-config.sh                  # Config updater
├── amplify.yml                       # Amplify build config
├── package.json                      # Dependencies
│
├── README.md                         # Main documentation
├── DEPLOYMENT-GUIDE.md               # Detailed deployment
├── TESTING-GUIDE.md                  # Testing procedures
└── MAINTENANCE.md                    # Maintenance guide
```

## AWS Resources Created

### Compute
- **Lambda Functions**: 3 (auth, loans, repayments)
- **API Gateway**: 1 REST API

### Storage
- **DynamoDB Tables**: 3 (Users, Loans, Repayments)
- **S3 Bucket**: 1 (for documents)

### Hosting
- **Amplify App**: Frontend hosting with CDN

### Security
- **IAM Roles**: Lambda execution roles
- **Permissions**: DynamoDB, S3, CloudWatch Logs

## Environment Variables

Required for Lambda functions:

| Variable | Description | Example |
|----------|-------------|---------|
| USERS_TABLE | Users table name | SkycapUsers |
| LOANS_TABLE | Loans table name | SkycapLoans |
| REPAYMENTS_TABLE | Repayments table name | SkycapRepayments |
| JWT_SECRET | JWT signing key | your-secret-key-here |
| DOCUMENTS_BUCKET | S3 bucket name | skycap-documents |

## API Endpoints Quick Reference

### Base URL
```
https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod/api
```

### Authentication
```bash
# Login
POST /auth/login
Body: {"username": "admin", "password": "password123"}

# Verify token
GET /auth/verify
Header: Authorization: Bearer TOKEN
```

### Loans
```bash
# Apply (public)
POST /loans/apply

# List all (authenticated)
GET /loans
GET /loans?status=pending
GET /loans?search=john

# Get by ID
GET /loans/:id

# Review (checker)
POST /loans/:id/review

# Disburse (accountant)
POST /loans/:id/disburse

# Statistics
GET /loans/stats/summary
```

### Repayments
```bash
# Record payment (accountant)
POST /repayments

# List all
GET /repayments

# Get loan history
GET /repayments/loan/:id

# Statistics
GET /repayments/stats/summary
```

## Default Users

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| admin | password123 | Admin | All access |
| maker1 | password123 | Maker | View only |
| checker1 | password123 | Checker | Review loans |
| accountant1 | password123 | Accountant | Disburse, payments |

## Common Tasks

### View Logs
```bash
# Lambda logs
aws logs tail /aws/lambda/skycap-loansHandler-prod --follow

# API Gateway logs
aws logs tail API-Gateway-Execution-Logs_YOUR_API_ID/prod --follow
```

### Check Tables
```bash
# List tables
aws dynamodb list-tables

# Scan table
aws dynamodb scan --table-name SkycapLoans --max-items 10

# Get item count
aws dynamodb describe-table --table-name SkycapLoans \
  --query 'Table.ItemCount'
```

### Update Lambda
```bash
# Update code
cd amplify/backend/function/loansHandler/src
npm install
zip -r ../function.zip .
aws lambda update-function-code \
  --function-name skycap-loansHandler-prod \
  --zip-file fileb://../function.zip
```

### Backup Database
```bash
# Create backup
aws dynamodb create-backup \
  --table-name SkycapLoans \
  --backup-name Backup-$(date +%Y%m%d)
```

### Deploy Frontend Changes
```bash
# Update files in public/
amplify publish
```

## Troubleshooting Quick Fixes

### Login not working
```bash
# Re-seed users
cd amplify/backend/storage/skycapdb
node seed-users.js
```

### CORS errors
```bash
# Check Lambda response headers include:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Headers: Content-Type,Authorization
```

### API timeout
```bash
# Increase Lambda timeout
aws lambda update-function-configuration \
  --function-name skycap-loansHandler-prod \
  --timeout 60
```

### High costs
```bash
# Enable API caching
aws apigateway update-stage \
  --rest-api-id YOUR_API_ID \
  --stage-name prod \
  --cache-cluster-enabled
```

## Monitoring

### CloudWatch Dashboard
Access: AWS Console → CloudWatch → Dashboards

Monitor:
- Lambda invocations & errors
- API Gateway requests & latency
- DynamoDB read/write capacity
- S3 storage & requests

### Set Up Alerts
```bash
# Lambda errors alert
aws cloudwatch put-metric-alarm \
  --alarm-name skycap-errors \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

## Cost Optimization

1. **Use DynamoDB on-demand** (already configured)
2. **Enable API Gateway caching** for frequent requests
3. **Optimize Lambda memory** (start with 256MB)
4. **Set CloudWatch log retention** to 7-30 days
5. **Use S3 lifecycle policies** for old documents

## Security Checklist

- [ ] Changed default passwords
- [ ] JWT secret in Secrets Manager
- [ ] Enable CloudTrail logging
- [ ] Configure WAF rules
- [ ] Review IAM permissions
- [ ] Enable DynamoDB encryption (default)
- [ ] Use HTTPS only
- [ ] Implement rate limiting

## Performance Targets

- API response time: < 200ms (warm)
- Lambda cold start: < 3s
- Page load time: < 2s
- Concurrent users: 100+
- Database queries: < 100ms

## Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Amplify Docs**: https://docs.amplify.aws/
- **DynamoDB Guide**: https://docs.aws.amazon.com/dynamodb/
- **Lambda Guide**: https://docs.aws.amazon.com/lambda/

## Emergency Contacts

- **AWS Support**: https://console.aws.amazon.com/support/
- **Amplify Issues**: https://github.com/aws-amplify/amplify-cli/issues

## Useful Links

- **AWS Console**: https://console.aws.amazon.com/
- **Amplify Console**: https://console.aws.amazon.com/amplify/
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch/
- **DynamoDB**: https://console.aws.amazon.com/dynamodb/
- **Lambda**: https://console.aws.amazon.com/lambda/

## Next Steps After Deployment

1. ✅ Test all functionality
2. ✅ Change default passwords
3. ✅ Set up monitoring alerts
4. ✅ Configure custom domain (optional)
5. ✅ Enable backup strategy
6. ✅ Document operational procedures
7. ✅ Train staff on system usage
8. ✅ Plan regular maintenance schedule

---

For detailed information, refer to:
- **README.md** - Project overview
- **DEPLOYMENT-GUIDE.md** - Step-by-step deployment
- **TESTING-GUIDE.md** - Testing procedures
- **MAINTENANCE.md** - Maintenance & troubleshooting
