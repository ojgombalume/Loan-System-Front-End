# Deployment Checklist

Use this checklist to ensure successful deployment of Skycap Loans on AWS Amplify.

## Pre-Deployment

### Prerequisites
- [ ] AWS Account created and active
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS CLI configured (`aws configure`)
- [ ] Node.js installed (`node --version` >= 14.x)
- [ ] Amplify CLI installed (`amplify --version`)
- [ ] Git installed (optional, for CI/CD)

### Preparation
- [ ] Downloaded/cloned skycap-amplify package
- [ ] Reviewed README.md
- [ ] Read DEPLOYMENT-GUIDE.md
- [ ] Identified AWS region to use
- [ ] Estimated monthly costs reviewed

## Deployment Steps

### Option A: Automated Deployment (Recommended)

- [ ] Navigate to project directory: `cd skycap-amplify`
- [ ] Run deployment script: `./deploy.sh`
- [ ] Enter AWS region when prompted
- [ ] Enter environment name when prompted
- [ ] Wait for deployment to complete (~10 minutes)
- [ ] Note the API endpoint URL provided
- [ ] Run configuration update: `./update-config.sh`
- [ ] Enter the API endpoint URL
- [ ] Deploy frontend: `amplify publish`
- [ ] Save the Amplify app URL

### Option B: Manual Deployment

- [ ] Initialize Amplify: `amplify init`
- [ ] Deploy DynamoDB tables
- [ ] Create IAM roles for Lambda
- [ ] Package Lambda functions
- [ ] Deploy Lambda functions
- [ ] Deploy API Gateway
- [ ] Note API endpoint
- [ ] Seed database users
- [ ] Update frontend configuration
- [ ] Deploy to Amplify hosting

## Post-Deployment

### Verification
- [ ] Access Amplify app URL
- [ ] Test public home page loads
- [ ] Test loan application form
- [ ] Test staff login with admin credentials
- [ ] Verify dashboard displays correctly
- [ ] Test loan creation (as maker)
- [ ] Test loan review (as checker)
- [ ] Test loan disbursement (as accountant)
- [ ] Test repayment recording
- [ ] Verify all statistics display

### Testing
- [ ] Run through TESTING-GUIDE.md scenarios
- [ ] Test all API endpoints with curl/Postman
- [ ] Test with different user roles
- [ ] Verify CORS is working
- [ ] Check CloudWatch logs
- [ ] Test error handling

### Security
- [ ] Change default admin password
- [ ] Change default maker password
- [ ] Change default checker password
- [ ] Change default accountant password
- [ ] Update JWT_SECRET environment variable
- [ ] Consider storing JWT secret in Secrets Manager
- [ ] Review IAM role permissions
- [ ] Enable CloudTrail logging
- [ ] Configure WAF (optional)

### Monitoring
- [ ] Set up CloudWatch dashboard
- [ ] Create CloudWatch alarms for:
  - [ ] Lambda errors
  - [ ] API Gateway 5XX errors
  - [ ] API Gateway 4XX errors
  - [ ] DynamoDB throttling
  - [ ] High costs
- [ ] Configure SNS topic for alerts
- [ ] Subscribe email to SNS topic

### Backup
- [ ] Enable point-in-time recovery on DynamoDB tables:
  - [ ] SkycapUsers
  - [ ] SkycapLoans
  - [ ] SkycapRepayments
- [ ] Create initial manual backups
- [ ] Document backup schedule
- [ ] Test restoration procedure

### Documentation
- [ ] Document actual API endpoint URL
- [ ] Document Amplify app URL
- [ ] Save AWS resource ARNs
- [ ] Document IAM role names
- [ ] Save DynamoDB table names
- [ ] Document S3 bucket name
- [ ] Update internal documentation

## Production Preparation

### Performance
- [ ] Test with expected load
- [ ] Optimize Lambda memory settings
- [ ] Enable API Gateway caching (if needed)
- [ ] Configure CloudFront for Amplify app
- [ ] Review DynamoDB capacity settings

### Optimization
- [ ] Review Lambda cold starts
- [ ] Consider provisioned concurrency
- [ ] Optimize database queries
- [ ] Compress frontend assets
- [ ] Enable CloudFront compression

### Additional Configuration
- [ ] Configure custom domain (optional)
- [ ] Set up SSL certificate (automatic with Amplify)
- [ ] Configure DNS records (if custom domain)
- [ ] Set up email notifications (optional)
- [ ] Configure SMS notifications (optional)

## Go-Live Checklist

### Final Verification
- [ ] All tests passing
- [ ] No errors in CloudWatch logs
- [ ] All features working as expected
- [ ] Performance metrics acceptable
- [ ] Security review completed
- [ ] Backup strategy in place

### Communication
- [ ] Notify staff of new system
- [ ] Provide training on staff portal
- [ ] Share login credentials securely
- [ ] Document any system changes
- [ ] Prepare user guides

### Monitoring Plan
- [ ] Daily log review scheduled
- [ ] Weekly performance review scheduled
- [ ] Monthly cost review scheduled
- [ ] Quarterly security audit scheduled
- [ ] Backup verification scheduled

## Post-Launch

### First Week
- [ ] Monitor system closely
- [ ] Review all CloudWatch alarms
- [ ] Check user feedback
- [ ] Address any issues immediately
- [ ] Verify backups are running

### First Month
- [ ] Review performance metrics
- [ ] Analyze cost reports
- [ ] Collect user feedback
- [ ] Plan any needed improvements
- [ ] Update documentation

### Ongoing
- [ ] Weekly monitoring checks
- [ ] Monthly security reviews
- [ ] Quarterly dependency updates
- [ ] Annual system review
- [ ] Regular backup testing

## Emergency Contacts

- [ ] AWS Support ticket system
- [ ] Technical team contacts documented
- [ ] Escalation procedures defined
- [ ] Backup contacts identified

## Rollback Plan

- [ ] Previous system still available (if migrating)
- [ ] Database export before migration
- [ ] Rollback procedure documented
- [ ] Restoration time estimated
- [ ] Communication plan for rollback

## Sign-Off

### Deployment Team
- [ ] Technical lead approval
- [ ] Security review approval
- [ ] Operations team approval
- [ ] Management approval

### Date & Signatures
- Deployment Date: ________________
- Technical Lead: ________________
- Operations: ________________
- Management: ________________

---

## Quick Commands Reference

### Check Deployment Status
```bash
# List Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `skycap`)].FunctionName'

# List DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?starts_with(@, `Skycap`)]'

# Check Amplify apps
amplify status
```

### View Logs
```bash
# Lambda logs
aws logs tail /aws/lambda/skycap-loansHandler-prod --follow

# API Gateway logs
aws logs tail API-Gateway-Execution-Logs_*/prod --follow
```

### Verify Resources
```bash
# Check table item counts
aws dynamodb describe-table --table-name SkycapUsers --query 'Table.ItemCount'
aws dynamodb describe-table --table-name SkycapLoans --query 'Table.ItemCount'

# Check Lambda function status
aws lambda get-function --function-name skycap-loansHandler-prod --query 'Configuration.State'
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-16
