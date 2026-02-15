#!/bin/bash

# Configuration Update Script
# Run this after deployment to update API endpoints in frontend files

echo "Skycap Loans - Configuration Update"
echo "===================================="
echo ""

# Get API endpoint
echo "Enter your API Gateway endpoint URL:"
echo "(Format: https://xxxxx.execute-api.region.amazonaws.com/prod/api)"
read -r API_ENDPOINT

if [ -z "$API_ENDPOINT" ]; then
    echo "Error: API endpoint is required"
    exit 1
fi

echo ""
echo "Updating configuration files..."

# Update JavaScript files
FILES=(
    "public/js/staff-common.js"
    "public/js/staff-login.js"
    "public/js/loan-form.js"
)

for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        echo "Updating $FILE..."
        sed -i.bak "s|https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod/api|$API_ENDPOINT|g" "$FILE"
        rm "${FILE}.bak"
        echo "✓ $FILE updated"
    else
        echo "✗ $FILE not found"
    fi
done

echo ""
echo "Configuration update complete!"
echo ""
echo "API Endpoint: $API_ENDPOINT"
echo ""
echo "Next steps:"
echo "1. Test the frontend locally"
echo "2. Deploy to Amplify hosting: amplify publish"
echo "3. Access your application"
echo ""
