const AWS = require('aws-sdk');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

const LOANS_TABLE = process.env.LOANS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET;
const JWT_SECRET = process.env.JWT_SECRET || 'skycap-secret-key-change-in-production';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Get user from token
function getUserFromEvent(event) {
  const token = event.headers.Authorization?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

// Generate loan reference number
function generateLoanReference() {
  return crypto.randomUUID();
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  
  const path = event.path;
  const method = event.httpMethod;
  
  try {
    // Apply for loan (public endpoint)
    if (path.includes('/loans/apply') && method === 'POST') {
      const body = JSON.parse(event.body);
      
      const loanId = generateLoanReference();
      const timestamp = new Date().toISOString();
      
      const loan = {
        loanId,
        // Personal Information
        firstName: body.firstName,
        lastName: body.lastName,
        idNumber: body.idNumber,
        contactNumber: body.contactNumber,
        physicalAddress: body.physicalAddress,
        postalAddress: body.postalAddress,
        
        // Next of Kin
        kinName: body.kinName,
        kinRelationship: body.kinRelationship,
        kinAddress: body.kinAddress,
        
        // Spouse Information
        marriedInCommunity: body.marriedInCommunity === 'Yes',
        spouseName: body.spouseName || null,
        spouseIdNumber: body.spouseIdNumber || null,
        
        // Loan Details
        loanAmount: parseFloat(body.loanAmount),
        interestRate: parseFloat(body.interestRate),
        totalAmount: parseFloat(body.totalAmount),
        loanPeriodMonths: parseInt(body.loanPeriodMonths),
        loanDate: body.loanDate,
        
        // Bank Details
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        branch: body.branch,
        
        // Repayment
        repaymentMethod: body.repaymentMethod,
        paymentDate: body.paymentDate || null,
        
        // Terms
        termsAccepted: JSON.parse(body.termsAccepted || '[]'),
        
        // Status and tracking
        status: 'pending',
        createdAt: timestamp,
        updatedAt: timestamp,
        
        // Workflow tracking
        checkedBy: null,
        checkedAt: null,
        checkerComments: null,
        disbursedBy: null,
        disbursedAt: null,
        disbursementReference: null
      };
      
      await dynamodb.put({
        TableName: LOANS_TABLE,
        Item: loan
      }).promise();
      
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          reference: loanId,
          message: 'Loan application submitted successfully'
        })
      };
    }
    
    // All other endpoints require authentication
    const user = getUserFromEvent(event);
    if (!user) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    // Get all loans (with filters)
    if (path.match(/\/loans\/?$/) && method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      const status = queryParams.status;
      const search = queryParams.search;
      const limit = parseInt(queryParams.limit) || 100;
      
      let result;
      
      if (status) {
        // Query by status
        result = await dynamodb.query({
          TableName: LOANS_TABLE,
          IndexName: 'StatusIndex',
          KeyConditionExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': status
          },
          Limit: limit,
          ScanIndexForward: false
        }).promise();
      } else {
        // Scan all loans
        result = await dynamodb.scan({
          TableName: LOANS_TABLE,
          Limit: limit
        }).promise();
      }
      
      let loans = result.Items;
      
      // Client-side search filter
      if (search) {
        const searchLower = search.toLowerCase();
        loans = loans.filter(loan => 
          loan.firstName.toLowerCase().includes(searchLower) ||
          loan.lastName.toLowerCase().includes(searchLower) ||
          loan.idNumber.includes(search) ||
          loan.contactNumber.includes(search)
        );
      }
      
      // Sort by creation date (newest first)
      loans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(loans)
      };
    }
    
    // Get single loan by ID
    if (path.match(/\/loans\/[^/]+$/) && method === 'GET') {
      const loanId = path.split('/').pop();
      
      const result = await dynamodb.get({
        TableName: LOANS_TABLE,
        Key: { loanId }
      }).promise();
      
      if (!result.Item) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Loan not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result.Item)
      };
    }
    
    // Review loan (Checker only)
    if (path.match(/\/loans\/[^/]+\/review$/) && method === 'POST') {
      if (user.role !== 'checker' && user.role !== 'admin') {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Insufficient permissions' })
        };
      }
      
      const loanId = path.split('/')[path.split('/').length - 2];
      const body = JSON.parse(event.body);
      const { action, comments } = body;
      
      if (!['approve', 'reject'].includes(action)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid action' })
        };
      }
      
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      await dynamodb.update({
        TableName: LOANS_TABLE,
        Key: { loanId },
        UpdateExpression: 'SET #status = :status, checkedBy = :checkedBy, checkedAt = :checkedAt, checkerComments = :comments, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': newStatus,
          ':checkedBy': user.userId,
          ':checkedAt': new Date().toISOString(),
          ':comments': comments,
          ':updatedAt': new Date().toISOString()
        }
      }).promise();
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: `Loan ${action}d successfully` })
      };
    }
    
    // Disburse loan (Accountant only)
    if (path.match(/\/loans\/[^/]+\/disburse$/) && method === 'POST') {
      if (user.role !== 'accountant' && user.role !== 'admin') {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Insufficient permissions' })
        };
      }
      
      const loanId = path.split('/')[path.split('/').length - 2];
      const body = JSON.parse(event.body);
      const { referenceNumber } = body;
      
      await dynamodb.update({
        TableName: LOANS_TABLE,
        Key: { loanId },
        UpdateExpression: 'SET #status = :status, disbursedBy = :disbursedBy, disbursedAt = :disbursedAt, disbursementReference = :reference, updatedAt = :updatedAt',
        ConditionExpression: '#status = :approvedStatus',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'disbursed',
          ':approvedStatus': 'approved',
          ':disbursedBy': user.userId,
          ':disbursedAt': new Date().toISOString(),
          ':reference': referenceNumber,
          ':updatedAt': new Date().toISOString()
        }
      }).promise();
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Loan disbursed successfully' })
      };
    }
    
    // Get loan statistics
    if (path.includes('/loans/stats/summary') && method === 'GET') {
      const result = await dynamodb.scan({
        TableName: LOANS_TABLE
      }).promise();
      
      const loans = result.Items;
      const stats = {
        total: loans.length,
        pending: loans.filter(l => l.status === 'pending').length,
        approved: loans.filter(l => l.status === 'approved').length,
        rejected: loans.filter(l => l.status === 'rejected').length,
        disbursed: loans.filter(l => l.status === 'disbursed').length,
        totalAmount: loans.reduce((sum, l) => sum + (l.totalAmount || 0), 0)
      };
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(stats)
      };
    }
    
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
