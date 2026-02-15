#!/bin/bash

# Skycap Loans - Automated AWS Amplify Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "================================================"
echo "Skycap Loans - AWS Amplify Deployment"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v amplify &> /dev/null; then
    echo -e "${YELLOW}Amplify CLI not found. Installing...${NC}"
    npm install -g @aws-amplify/cli
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Get AWS region
echo -e "${YELLOW}Enter your AWS region (default: us-east-1):${NC}"
read -r AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

# Get environment name
echo -e "${YELLOW}Enter environment name (default: prod):${NC}"
read -r ENV_NAME
ENV_NAME=${ENV_NAME:-prod}

# Initialize Amplify if not already initialized
if [ ! -d "amplify" ]; then
    echo -e "${YELLOW}Initializing Amplify project...${NC}"
    amplify init --yes \
        --envName "$ENV_NAME" \
        --defaultEditor code \
        --appType javascript \
        --sourceDir public \
        --distDir public \
        --buildCommand "npm run build" \
        --startCommand "npm start"
else
    echo -e "${GREEN}✓ Amplify already initialized${NC}"
fi

# Deploy CloudFormation stacks
echo ""
echo -e "${YELLOW}Deploying DynamoDB tables...${NC}"
aws cloudformation deploy \
    --template-file amplify/backend/storage/skycapdb/skycapdb-cloudformation-template.json \
    --stack-name skycap-dynamodb-$ENV_NAME \
    --region $AWS_REGION \
    --capabilities CAPABILITY_IAM

echo -e "${GREEN}✓ DynamoDB tables created${NC}"

# Get table names from CloudFormation outputs
USERS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name skycap-dynamodb-$ENV_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`UsersTableName`].OutputValue' \
    --output text)

LOANS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name skycap-dynamodb-$ENV_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LoansTableName`].OutputValue' \
    --output text)

REPAYMENTS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name skycap-dynamodb-$ENV_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`RepaymentsTableName`].OutputValue' \
    --output text)

echo ""
echo -e "${YELLOW}Creating Lambda functions...${NC}"

# Create Lambda execution role
ROLE_NAME="skycap-lambda-role-$ENV_NAME"
aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' \
    --region $AWS_REGION 2>/dev/null || echo "Role already exists"

# Attach policies
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

sleep 10  # Wait for IAM role to propagate

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)

# Package and deploy Lambda functions
for FUNCTION in authHandler loansHandler repaymentsHandler; do
    echo ""
    echo -e "${YELLOW}Deploying $FUNCTION...${NC}"
    
    cd amplify/backend/function/$FUNCTION/src
    
    # Install dependencies
    npm install --production
    
    # Create deployment package
    zip -r ../function.zip . > /dev/null
    
    cd ../../../../..
    
    # Create or update Lambda function
    aws lambda create-function \
        --function-name skycap-$FUNCTION-$ENV_NAME \
        --runtime nodejs18.x \
        --role $ROLE_ARN \
        --handler index.handler \
        --zip-file fileb://amplify/backend/function/$FUNCTION/function.zip \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables="{
            USERS_TABLE=$USERS_TABLE,
            LOANS_TABLE=$LOANS_TABLE,
            REPAYMENTS_TABLE=$REPAYMENTS_TABLE,
            JWT_SECRET=change-this-in-production-$(date +%s)
        }" \
        --region $AWS_REGION 2>/dev/null || \
    aws lambda update-function-code \
        --function-name skycap-$FUNCTION-$ENV_NAME \
        --zip-file fileb://amplify/backend/function/$FUNCTION/function.zip \
        --region $AWS_REGION
    
    # Update environment variables
    aws lambda update-function-configuration \
        --function-name skycap-$FUNCTION-$ENV_NAME \
        --environment Variables="{
            USERS_TABLE=$USERS_TABLE,
            LOANS_TABLE=$LOANS_TABLE,
            REPAYMENTS_TABLE=$REPAYMENTS_TABLE,
            JWT_SECRET=change-this-in-production-$(date +%s)
        }" \
        --region $AWS_REGION > /dev/null
    
    echo -e "${GREEN}✓ $FUNCTION deployed${NC}"
done

# Get Lambda ARNs
AUTH_HANDLER_ARN=$(aws lambda get-function --function-name skycap-authHandler-$ENV_NAME --query 'Configuration.FunctionArn' --output text --region $AWS_REGION)
LOANS_HANDLER_ARN=$(aws lambda get-function --function-name skycap-loansHandler-$ENV_NAME --query 'Configuration.FunctionArn' --output text --region $AWS_REGION)
REPAYMENTS_HANDLER_ARN=$(aws lambda get-function --function-name skycap-repaymentsHandler-$ENV_NAME --query 'Configuration.FunctionArn' --output text --region $AWS_REGION)

echo ""
echo -e "${YELLOW}Creating API Gateway...${NC}"

# Deploy API Gateway
aws cloudformation deploy \
    --template-file amplify/backend/api/skycaploansapi/skycaploansapi-cloudformation-template.json \
    --stack-name skycap-api-$ENV_NAME \
    --parameter-overrides \
        AuthHandlerArn=$AUTH_HANDLER_ARN \
        LoansHandlerArn=$LOANS_HANDLER_ARN \
        RepaymentsHandlerArn=$REPAYMENTS_HANDLER_ARN \
        env=$ENV_NAME \
    --region $AWS_REGION \
    --capabilities CAPABILITY_IAM

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name skycap-api-$ENV_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text)

echo -e "${GREEN}✓ API Gateway created${NC}"
echo -e "${GREEN}API Endpoint: $API_ENDPOINT${NC}"

# Seed users
echo ""
echo -e "${YELLOW}Seeding default users...${NC}"
cd amplify/backend/storage/skycapdb
AWS_REGION=$AWS_REGION USERS_TABLE=$USERS_TABLE node seed-users.js
cd ../../../..
echo -e "${GREEN}✓ Users seeded${NC}"

# Update frontend configuration
echo ""
echo -e "${YELLOW}Updating frontend configuration...${NC}"

# Update API URLs in JavaScript files
for JS_FILE in public/js/staff-common.js public/js/staff-login.js public/js/loan-form.js; do
    if [ -f "$JS_FILE" ]; then
        sed -i.bak "s|https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod/api|$API_ENDPOINT/api|g" "$JS_FILE"
        rm "${JS_FILE}.bak"
    fi
done

echo -e "${GREEN}✓ Frontend configuration updated${NC}"

# Deploy to Amplify Hosting
echo ""
echo -e "${YELLOW}Do you want to deploy to Amplify Hosting? (y/n)${NC}"
read -r DEPLOY_HOSTING

if [ "$DEPLOY_HOSTING" = "y" ]; then
    echo -e "${YELLOW}Deploying to Amplify Hosting...${NC}"
    amplify publish --yes
    echo -e "${GREEN}✓ Deployed to Amplify Hosting${NC}"
fi

# Print summary
echo ""
echo "================================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "Summary:"
echo "--------"
echo "Environment: $ENV_NAME"
echo "Region: $AWS_REGION"
echo "API Endpoint: $API_ENDPOINT"
echo ""
echo "DynamoDB Tables:"
echo "  - Users: $USERS_TABLE"
echo "  - Loans: $LOANS_TABLE"
echo "  - Repayments: $REPAYMENTS_TABLE"
echo ""
echo "Default User Credentials:"
echo "  - Username: admin | Password: password123 (Admin)"
echo "  - Username: maker1 | Password: password123 (Maker)"
echo "  - Username: checker1 | Password: password123 (Checker)"
echo "  - Username: accountant1 | Password: password123 (Accountant)"
echo ""
echo -e "${YELLOW}IMPORTANT: Change default passwords in production!${NC}"
echo ""
echo "Next Steps:"
echo "1. Test the application at your Amplify hosting URL"
echo "2. Change default user passwords"
echo "3. Configure custom domain (optional)"
echo "4. Set up monitoring and alerts"
echo ""
echo "For detailed documentation, see DEPLOYMENT-GUIDE.md"
echo ""
