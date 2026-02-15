const AWS = require('aws-sdk');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;
const JWT_SECRET = process.env.JWT_SECRET || 'skycap-secret-key-change-in-production';

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

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
    // Login endpoint
    if (path.includes('/auth/login') && method === 'POST') {
      const body = JSON.parse(event.body);
      const { username, password } = body;
      
      if (!username || !password) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Username and password are required' })
        };
      }
      
      // Query user by username
      const result = await dynamodb.query({
        TableName: USERS_TABLE,
        IndexName: 'UsernameIndex',
        KeyConditionExpression: 'username = :username',
        ExpressionAttributeValues: {
          ':username': username
        }
      }).promise();
      
      if (result.Items.length === 0) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid username or password' })
        };
      }
      
      const user = result.Items[0];
      const hashedPassword = hashPassword(password);
      
      if (user.password !== hashedPassword) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid username or password' })
        };
      }
      
      if (!user.active) {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Account is disabled' })
        };
      }
      
      // Generate token
      const token = generateToken(user);
      
      // Return user info (without password)
      const { password: _, ...userWithoutPassword } = user;
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          token,
          user: {
            userId: user.userId,
            username: user.username,
            full_name: user.fullName,
            role: user.role,
            email: user.email
          }
        })
      };
    }
    
    // Verify token endpoint
    if (path.includes('/auth/verify') && method === 'GET') {
      const token = event.headers.Authorization?.replace('Bearer ', '');
      
      if (!token) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'No token provided' })
        };
      }
      
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ valid: true, user: decoded })
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

// Export helper functions for use in other Lambda functions
exports.verifyToken = verifyToken;
