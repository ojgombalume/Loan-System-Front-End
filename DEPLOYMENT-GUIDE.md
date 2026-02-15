# Skycap Loans - AWS Amplify Deployment Guide

This guide will help you deploy the Skycap Loans Management System to AWS Amplify.

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Install AWS CLI and configure with your credentials
3. **Node.js**: Version 14.x or later
4. **Amplify CLI**: Install globally with `npm install -g @aws-amplify/cli`
5. **Git**: Version control (optional but recommended)

## Initial Setup

### 1. Configure AWS CLI

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1 (or your preferred region)
# Default output format: json
```

### 2. Initialize Amplify CLI

```bash
amplify configure
```

Follow the prompts to:
- Sign in to AWS Console
- Create an IAM user with AdministratorAccess
- Save the access key and secret key

## Deployment Steps

### Step 1: Initialize Amplify Project

```bash
cd skycap-amplify
amplify init
```

Answer the prompts:
- **Project name**: skycaploans
- **Environment name**: prod
- **Default editor**: Your preferred editor
- **App type**: javascript
- **JavaScript framework**: none
- **Source directory path**: public
- **Distribution directory path**: public
- **Build command**: npm run build
- **Start command**: npm start
- **AWS profile**: default (or your profile name)

### Step 2: Add API (API Gateway + Lambda)

```bash
amplify add api
```

Choose:
- **Service**: REST
- **API name**: SkycapAPI
- **Path**: /api
- **Lambda source**: Create a new Lambda function
- **Function name**: authHandler
- **Runtime**: NodeJS
- **Template**: Hello World

Repeat for `loansHandler` and `repaymentsHandler`.

### Step 3: Add Storage (DynamoDB)

The DynamoDB tables are already defined in the CloudFormation template. Deploy them:

```bash
amplify add storage
```

Choose:
- **Service**: NoSQL Database
- **Resource name**: skycapdb
- **Table name**: Choose the tables from the template

For S3 document storage:

```bash
amplify add storage
```

Choose:
- **Service**: Content (S3)
- **Resource name**: skycapdocuments
- **Bucket name**: Let Amplify generate
- **Access**: Auth users only

### Step 4: Configure Environment Variables

Create a `.env` file in the root:

```bash
cat > .env << EOF
USERS_TABLE=SkycapUsers
LOANS_TABLE=SkycapLoans
REPAYMENTS_TABLE=SkycapRepayments
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DOCUMENTS_BUCKET=your-bucket-name
EOF
```

### Step 5: Deploy Backend

```bash
amplify push
```

This will:
- Create all AWS resources
- Deploy Lambda functions
- Set up API Gateway
- Create DynamoDB tables
- Configure S3 bucket

**Important**: Save the API endpoint URL that's displayed after deployment!

### Step 6: Seed Default Users

After deployment, seed the database with default users:

```bash
cd amplify/backend/storage/skycapdb
node seed-users.js
```

Or use AWS Lambda to run the seed script once.

### Step 7: Update Frontend Configuration

1. Copy the API Gateway endpoint from the deployment output
2. Update `public/js/staff-common.js`, `public/js/staff-login.js`, and `public/js/loan-form.js`:

Replace:
```javascript
const API_URL = 'https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod/api';
```

With your actual API endpoint.

### Step 8: Deploy Frontend to Amplify Hosting

```bash
amplify add hosting
```

Choose:
- **Hosting service**: Amplify Console
- **Continuous deployment**: Manual deployment (or CI/CD if using Git)

Then publish:

```bash
amplify publish
```

## Alternative: Deploy via Amplify Console (Recommended)

### 1. Push Code to Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Connect to Amplify Console

1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/
2. Click **New app** → **Host web app**
3. Connect your repository (GitHub, GitLab, Bitbucket, etc.)
4. Select your repository and branch
5. Review build settings
6. Click **Save and deploy**

### 3. Configure Build Settings

The `amplify.yml` file is already configured. Amplify will:
- Build the backend resources
- Deploy Lambda functions
- Create API Gateway
- Deploy the frontend

### 4. Add Environment Variables

In Amplify Console:
1. Go to **App settings** → **Environment variables**
2. Add the following variables:
   - `USERS_TABLE`: SkycapUsers
   - `LOANS_TABLE`: SkycapLoans
   - `REPAYMENTS_TABLE`: SkycapRepayments
   - `JWT_SECRET`: your-secret-key
   - `DOCUMENTS_BUCKET`: your-bucket-name

## Post-Deployment Configuration

### 1. Update CORS Settings

If you encounter CORS issues, update Lambda functions to include proper headers (already configured).

### 2. Configure Custom Domain (Optional)

```bash
amplify add domain
```

Follow prompts to add your custom domain.

### 3. Set Up SSL Certificate

Amplify automatically provisions SSL certificates for your domain.

### 4. Configure Authentication

The system uses JWT tokens. The default users are:

| Username | Password | Role |
|----------|----------|------|
| admin | password123 | Admin |
| maker1 | password123 | Maker |
| checker1 | password123 | Checker |
| accountant1 | password123 | Accountant |

**Important**: Change these passwords in production!

## Database Schema

### Users Table (SkycapUsers)
- **Primary Key**: userId (String)
- **GSI**: username (String)
- **Attributes**: password, fullName, role, email, active, createdAt

### Loans Table (SkycapLoans)
- **Primary Key**: loanId (String)
- **GSI1**: status + createdAt
- **GSI2**: idNumber
- **Attributes**: All loan application fields, status, workflow tracking

### Repayments Table (SkycapRepayments)
- **Primary Key**: repaymentId (String)
- **GSI**: loanId + paymentDate
- **Attributes**: payment details, recordedBy, createdAt

## API Endpoints

Base URL: `https://<api-id>.execute-api.<region>.amazonaws.com/prod/api`

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verify token

### Loans
- `POST /api/loans/apply` - Submit loan application (public)
- `GET /api/loans` - Get all loans (authenticated)
- `GET /api/loans/:id` - Get loan details
- `POST /api/loans/:id/review` - Review loan (checker)
- `POST /api/loans/:id/disburse` - Disburse loan (accountant)
- `GET /api/loans/stats/summary` - Get statistics

### Repayments
- `POST /api/repayments` - Record payment (accountant)
- `GET /api/repayments` - Get all repayments
- `GET /api/repayments/loan/:id` - Get loan repayment history
- `GET /api/repayments/stats/summary` - Get statistics

## Monitoring and Logs

### CloudWatch Logs
- Lambda function logs: `/aws/lambda/<function-name>`
- API Gateway logs: Can be enabled in API Gateway console

### Amplify Console
- Build logs
- Deployment history
- Performance metrics

## Troubleshooting

### Issue: API Gateway 403 Forbidden
**Solution**: Check Lambda permissions and ensure API Gateway has permission to invoke Lambda functions.

### Issue: CORS Errors
**Solution**: Verify CORS headers are set in Lambda responses. Already configured in the code.

### Issue: Database Connection Errors
**Solution**: Check Lambda execution role has DynamoDB permissions.

### Issue: Users Not Seeding
**Solution**: Run the seed script manually or create users through AWS Console.

## Backup and Recovery

### DynamoDB Backups
Enable point-in-time recovery:
```bash
aws dynamodb update-continuous-backups \
  --table-name SkycapUsers \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### Export Data
```bash
aws dynamodb scan --table-name SkycapLoans > loans-backup.json
```

## Security Best Practices

1. **Change Default Passwords**: Update all default user passwords
2. **Use Secrets Manager**: Store JWT secret in AWS Secrets Manager
3. **Enable WAF**: Add AWS WAF to API Gateway for protection
4. **Enable CloudTrail**: Monitor API calls and user activity
5. **Use IAM Roles**: Follow principle of least privilege
6. **Enable Encryption**: DynamoDB encryption at rest (default)
7. **Regular Updates**: Keep dependencies updated

## Cost Optimization

1. **Use DynamoDB On-Demand**: Pay per request (already configured)
2. **Lambda Memory**: Start with 128MB, increase if needed
3. **S3 Lifecycle**: Archive old documents to Glacier
4. **API Gateway Caching**: Enable for frequently accessed endpoints
5. **CloudWatch Log Retention**: Set retention period to 30 days

## Scaling

The architecture automatically scales:
- **Lambda**: Concurrent executions scale automatically
- **DynamoDB**: On-demand capacity scales with traffic
- **API Gateway**: Handles up to 10,000 requests/second
- **Amplify Hosting**: CDN for global content delivery

## Support and Maintenance

### Regular Tasks
- Monitor CloudWatch metrics
- Review Lambda execution logs
- Check API Gateway error rates
- Backup database regularly
- Update dependencies quarterly

### Contact
For issues or questions about this deployment, refer to AWS documentation or contact your AWS support team.

## Additional Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/)
- [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
