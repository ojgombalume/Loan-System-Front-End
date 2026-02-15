# Skycap Loans Management System

A comprehensive loan management system built for AWS Amplify with serverless architecture.

## 🚀 Quick Start

### Prerequisites
- AWS Account
- AWS CLI installed and configured
- Node.js 14.x or later
- Amplify CLI: `npm install -g @aws-amplify/cli`

### Option 1: Automated Deployment (Recommended)

```bash
# Clone or download the project
cd skycap-amplify

# Run the deployment script
./deploy.sh
```

The script will:
- ✅ Create DynamoDB tables
- ✅ Deploy Lambda functions
- ✅ Set up API Gateway
- ✅ Seed default users
- ✅ Configure frontend
- ✅ Deploy to Amplify Hosting (optional)

### Option 2: Manual Deployment

See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for detailed step-by-step instructions.

### Option 3: Deploy via Amplify Console

1. Push code to GitHub/GitLab/Bitbucket
2. Connect repository to AWS Amplify Console
3. Amplify will automatically build and deploy

## 📋 Features

### Public Features
- ✅ Loan application form (multi-step)
- ✅ Document upload support
- ✅ Terms and conditions acceptance
- ✅ Application tracking

### Staff Portal Features
- ✅ Role-based access control (Admin, Maker, Checker, Accountant)
- ✅ Loan application review workflow
- ✅ Loan approval/rejection
- ✅ Disbursement management
- ✅ Repayment tracking
- ✅ Dashboard with statistics
- ✅ Search and filter capabilities

## 🔐 Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | password123 | Administrator |
| maker1 | password123 | Loan Officer |
| checker1 | password123 | Verifier |
| accountant1 | password123 | Accountant |

⚠️ **Change these passwords immediately in production!**

## 🏗️ Architecture

```
┌─────────────────┐
│  CloudFront     │
│  (CDN)          │
└────────┬────────┘
         │
┌────────▼────────┐
│  Amplify        │
│  Hosting        │
└────────┬────────┘
         │
┌────────▼────────┐
│  API Gateway    │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼──┐  ┌──▼──┐   ┌──▼──┐    ┌──▼───┐
│Auth  │  │Loans│   │Repay│    │ S3   │
│Lambda│  │Lambda│  │Lambda│   │Bucket│
└───┬──┘  └──┬──┘   └──┬──┘    └──────┘
    │        │         │
    └────┬───┴────┬────┘
         │        │
    ┌────▼────────▼────┐
    │   DynamoDB        │
    │   - Users         │
    │   - Loans         │
    │   - Repayments    │
    └───────────────────┘
```

## 📊 Database Schema

### Users Table
- Primary Key: `userId` (String)
- GSI: `username`
- Attributes: password, fullName, role, email, active

### Loans Table
- Primary Key: `loanId` (String)
- GSI1: `status` + `createdAt`
- GSI2: `idNumber`
- Attributes: All loan details, workflow tracking

### Repayments Table
- Primary Key: `repaymentId` (String)
- GSI: `loanId` + `paymentDate`
- Attributes: Payment details, references

## 🔗 API Endpoints

Base URL: `https://<api-id>.execute-api.<region>.amazonaws.com/prod/api`

### Authentication
- `POST /auth/login` - User login
- `GET /auth/verify` - Verify JWT token

### Loans
- `POST /loans/apply` - Submit application (public)
- `GET /loans` - List all loans
- `GET /loans/:id` - Get loan details
- `POST /loans/:id/review` - Review loan
- `POST /loans/:id/disburse` - Disburse loan
- `GET /loans/stats/summary` - Statistics

### Repayments
- `POST /repayments` - Record payment
- `GET /repayments` - List all repayments
- `GET /repayments/loan/:id` - Loan history
- `GET /repayments/stats/summary` - Statistics

## 🔧 Configuration

### Environment Variables

Lambda functions use these environment variables:
- `USERS_TABLE` - DynamoDB users table name
- `LOANS_TABLE` - DynamoDB loans table name
- `REPAYMENTS_TABLE` - DynamoDB repayments table name
- `JWT_SECRET` - Secret key for JWT tokens
- `DOCUMENTS_BUCKET` - S3 bucket for documents

### Frontend Configuration

Update API endpoint in:
- `public/js/staff-common.js`
- `public/js/staff-login.js`
- `public/js/loan-form.js`

Replace:
```javascript
const API_URL = 'https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod/api';
```

## 📁 Project Structure

```
skycap-amplify/
├── amplify/
│   └── backend/
│       ├── api/              # API Gateway configuration
│       ├── function/         # Lambda functions
│       │   ├── authHandler/
│       │   ├── loansHandler/
│       │   └── repaymentsHandler/
│       └── storage/          # DynamoDB & S3 config
├── public/
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript files
│   ├── images/               # Images and logo
│   └── *.html                # HTML pages
├── amplify.yml               # Amplify build config
├── package.json              # Node.js dependencies
├── deploy.sh                 # Automated deployment script
├── DEPLOYMENT-GUIDE.md       # Detailed deployment guide
└── README.md                 # This file
```

## 🧪 Testing

### Local Testing
1. Run Lambda functions locally using SAM CLI
2. Test API endpoints with Postman or curl
3. Use DynamoDB Local for database testing

### Production Testing
1. Test all user roles and permissions
2. Verify loan application workflow
3. Test repayment recording
4. Check dashboard statistics

## 📈 Monitoring

### CloudWatch
- Lambda function logs
- API Gateway metrics
- DynamoDB performance
- Error tracking

### Amplify Console
- Build history
- Deployment logs
- Performance metrics
- User analytics

## 🔒 Security

- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ HTTPS everywhere (API Gateway + CloudFront)
- ✅ DynamoDB encryption at rest
- ✅ IAM least privilege access
- ✅ CORS configured
- ⚠️ Change default passwords
- ⚠️ Use AWS Secrets Manager for JWT secret
- ⚠️ Enable AWS WAF for API protection

## 💰 Cost Estimate

Monthly costs (assuming moderate usage):
- **Amplify Hosting**: $0.15/GB + $0.01/10k requests (~$5-10)
- **Lambda**: First 1M requests free, then $0.20/1M
- **API Gateway**: $3.50/million requests
- **DynamoDB**: On-demand pricing ~$10-50
- **S3**: $0.023/GB storage
- **CloudWatch**: Logs and metrics ~$5

**Estimated Total**: $20-80/month

## 🚀 Performance

- **API Response Time**: <200ms (Lambda cold start: <3s)
- **Static Content**: Served via CloudFront CDN
- **Database**: DynamoDB auto-scaling
- **Concurrent Users**: Scales automatically

## 📝 License

Proprietary - Kumbi Beat Holdings T/A Skycap Loans

## 🆘 Support

For issues or questions:
1. Check [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
2. Review AWS documentation
3. Check CloudWatch logs
4. Contact AWS support

## 🔄 Updates and Maintenance

### Regular Tasks
- [ ] Monitor CloudWatch metrics
- [ ] Review error logs
- [ ] Backup DynamoDB tables
- [ ] Update dependencies
- [ ] Review IAM permissions
- [ ] Test disaster recovery

### Quarterly Tasks
- [ ] Security audit
- [ ] Cost optimization review
- [ ] Performance testing
- [ ] Update documentation

## 🎯 Roadmap

- [ ] SMS notifications
- [ ] Email notifications
- [ ] Mobile app
- [ ] Advanced reporting
- [ ] Document OCR processing
- [ ] Credit score integration
- [ ] Automated repayment reminders

## 📞 Contact

**Kumbi Beat Holdings T/A Skycap Loans**
- 📍 Light Industrial, Ngilichi Towers, Francistown, Botswana
- 📞 +267 78 493 980
- 📧 skycap@gmail.com

---

**Built with ❤️ using AWS Amplify**
