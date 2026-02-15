const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE || 'SkycapUsers';

// Hash password function (same as used in authentication)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const defaultUsers = [
  {
    userId: crypto.randomUUID(),
    username: 'admin',
    password: hashPassword('password123'),
    fullName: 'System Administrator',
    role: 'admin',
    email: 'admin@skycap.com',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    userId: crypto.randomUUID(),
    username: 'maker1',
    password: hashPassword('password123'),
    fullName: 'Loan Officer',
    role: 'maker',
    email: 'maker@skycap.com',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    userId: crypto.randomUUID(),
    username: 'checker1',
    password: hashPassword('password123'),
    fullName: 'Loan Verifier',
    role: 'checker',
    email: 'checker@skycap.com',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    userId: crypto.randomUUID(),
    username: 'accountant1',
    password: hashPassword('password123'),
    fullName: 'Senior Accountant',
    role: 'accountant',
    email: 'accountant@skycap.com',
    active: true,
    createdAt: new Date().toISOString()
  }
];

async function seedUsers() {
  console.log('Seeding default users...');
  
  for (const user of defaultUsers) {
    try {
      await dynamodb.put({
        TableName: USERS_TABLE,
        Item: user,
        ConditionExpression: 'attribute_not_exists(userId)'
      }).promise();
      console.log(`✓ Created user: ${user.username} (${user.role})`);
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        console.log(`- User already exists: ${user.username}`);
      } else {
        console.error(`✗ Error creating user ${user.username}:`, error);
      }
    }
  }
  
  console.log('User seeding complete!');
}

// Run if executed directly
if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seedUsers };
