const AWS = require('aws-sdk');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const dynamodb = new AWS.DynamoDB.DocumentClient();

const REPAYMENTS_TABLE = process.env.REPAYMENTS_TABLE;
const LOANS_TABLE = process.env.LOANS_TABLE;
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
    // All endpoints require authentication
    const user = getUserFromEvent(event);
    if (!user) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    // Record a payment
    if (path.match(/\/repayments\/?$/) && method === 'POST') {
      if (user.role !== 'accountant' && user.role !== 'admin') {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Insufficient permissions' })
        };
      }
      
      const body = JSON.parse(event.body);
      const { loanId, paymentDate, amountPaid, paymentMethod, referenceNumber, notes } = body;
      
      // Validate required fields
      if (!loanId || !paymentDate || !amountPaid) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Missing required fields' })
        };
      }
      
      // Verify loan exists and is disbursed
      const loanResult = await dynamodb.get({
        TableName: LOANS_TABLE,
        Key: { loanId }
      }).promise();
      
      if (!loanResult.Item) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Loan not found' })
        };
      }
      
      if (loanResult.Item.status !== 'disbursed') {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Loan must be disbursed before recording payments' })
        };
      }
      
      const repaymentId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const repayment = {
        repaymentId,
        loanId,
        paymentDate,
        amountPaid: parseFloat(amountPaid),
        paymentMethod: paymentMethod || null,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        recordedBy: user.userId,
        createdAt: timestamp
      };
      
      await dynamodb.put({
        TableName: REPAYMENTS_TABLE,
        Item: repayment
      }).promise();
      
      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          repaymentId,
          message: 'Payment recorded successfully'
        })
      };
    }
    
    // Get all repayments
    if (path.match(/\/repayments\/?$/) && method === 'GET') {
      const result = await dynamodb.scan({
        TableName: REPAYMENTS_TABLE
      }).promise();
      
      const repayments = result.Items;
      
      // Enrich with loan and user information
      const enrichedRepayments = await Promise.all(
        repayments.map(async (repayment) => {
          const loanResult = await dynamodb.get({
            TableName: LOANS_TABLE,
            Key: { loanId: repayment.loanId }
          }).promise();
          
          return {
            ...repayment,
            first_name: loanResult.Item?.firstName,
            last_name: loanResult.Item?.lastName,
            recorded_by_name: 'Staff Member' // Can be enriched from users table if needed
          };
        })
      );
      
      // Sort by payment date (newest first)
      enrichedRepayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ repayments: enrichedRepayments })
      };
    }
    
    // Get repayments for a specific loan
    if (path.match(/\/repayments\/loan\/[^/]+$/) && method === 'GET') {
      const loanId = path.split('/').pop();
      
      // Get loan details
      const loanResult = await dynamodb.get({
        TableName: LOANS_TABLE,
        Key: { loanId }
      }).promise();
      
      if (!loanResult.Item) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Loan not found' })
        };
      }
      
      const loan = loanResult.Item;
      
      // Get all repayments for this loan
      const result = await dynamodb.query({
        TableName: REPAYMENTS_TABLE,
        IndexName: 'LoanIndex',
        KeyConditionExpression: 'loanId = :loanId',
        ExpressionAttributeValues: {
          ':loanId': loanId
        }
      }).promise();
      
      const repayments = result.Items;
      
      // Calculate summary
      const totalPaid = repayments.reduce((sum, r) => sum + r.amountPaid, 0);
      const balance = loan.totalAmount - totalPaid;
      
      // Sort repayments by date
      repayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
      
      // Enrich repayments with user info
      const enrichedRepayments = repayments.map(r => ({
        ...r,
        recorded_by_name: 'Staff Member'
      }));
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          summary: {
            loanAmount: loan.totalAmount,
            totalPaid,
            balance
          },
          repayments: enrichedRepayments
        })
      };
    }
    
    // Get repayment statistics
    if (path.includes('/repayments/stats/summary') && method === 'GET') {
      // Get all disbursed loans
      const loansResult = await dynamodb.query({
        TableName: LOANS_TABLE,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'disbursed'
        }
      }).promise();
      
      const loans = loansResult.Items;
      
      // Get all repayments
      const repaymentsResult = await dynamodb.scan({
        TableName: REPAYMENTS_TABLE
      }).promise();
      
      const repayments = repaymentsResult.Items;
      
      const totalLoaned = loans.reduce((sum, l) => sum + (l.totalAmount || 0), 0);
      const totalCollected = repayments.reduce((sum, r) => sum + r.amountPaid, 0);
      const outstandingBalance = totalLoaned - totalCollected;
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          totalLoaned,
          total_collected: totalCollected,
          outstandingBalance,
          active_loans: loans.length
        })
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
