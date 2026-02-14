const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// In-memory data storage (replace with database in production)
let loans = [];
let users = [
    { id: 1, username: 'admin', password: 'password123', full_name: 'System Administrator', role: 'admin' },
    { id: 2, username: 'maker1', password: 'password123', full_name: 'Loan Officer', role: 'maker' },
    { id: 3, username: 'checker1', password: 'password123', full_name: 'Loan Verifier', role: 'checker' },
    { id: 4, username: 'accountant1', password: 'password123', full_name: 'Finance Officer', role: 'accountant' }
];
let repayments = [];
let loanIdCounter = 1;
let repaymentIdCounter = 1;

// Generate JWT token (simplified - use proper JWT library in production)
function generateToken(user) {
    return Buffer.from(JSON.stringify({ 
        id: user.id, 
        username: user.username, 
        role: user.role,
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    })).toString('base64');
}

// Verify token middleware
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        if (decoded.exp < Date.now()) {
            return res.status(401).json({ error: 'Token expired' });
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// ===== AUTHENTICATION ROUTES =====

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
        }
    });
});

// ===== LOAN ROUTES =====

// Submit loan application
app.post('/api/loans/apply', upload.array('attachments', 5), (req, res) => {
    try {
        const loanData = {
            id: loanIdCounter++,
            ...req.body,
            status: 'pending',
            created_at: new Date().toISOString(),
            attachments: req.files ? req.files.map(f => f.filename) : []
        };
        
        loans.push(loanData);
        
        res.json({
            success: true,
            reference: `LOAN-${String(loanData.id).padStart(6, '0')}`,
            message: 'Application submitted successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all loans (with filters)
app.get('/api/loans', verifyToken, (req, res) => {
    let filteredLoans = [...loans];
    
    // Filter by status
    if (req.query.status) {
        filteredLoans = filteredLoans.filter(l => l.status === req.query.status);
    }
    
    // Search
    if (req.query.search) {
        const search = req.query.search.toLowerCase();
        filteredLoans = filteredLoans.filter(l => 
            l.first_name?.toLowerCase().includes(search) ||
            l.last_name?.toLowerCase().includes(search) ||
            l.id_number?.includes(search) ||
            l.contact_number?.includes(search)
        );
    }
    
    // Limit
    if (req.query.limit) {
        filteredLoans = filteredLoans.slice(0, parseInt(req.query.limit));
    }
    
    res.json(filteredLoans.reverse());
});

// Get single loan
app.get('/api/loans/:id', verifyToken, (req, res) => {
    const loan = loans.find(l => l.id === parseInt(req.params.id));
    if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
    }
    res.json(loan);
});

// Review loan (checker)
app.post('/api/loans/:id/review', verifyToken, (req, res) => {
    if (req.user.role !== 'checker' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const loan = loans.find(l => l.id === parseInt(req.params.id));
    if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
    }

    const { action, comments } = req.body;
    
    loan.status = action === 'approve' ? 'approved' : 'rejected';
    loan.checker_comments = comments;
    loan.checker_name = req.user.username;
    loan.checked_at = new Date().toISOString();

    res.json({ success: true, loan });
});

// Disburse loan (accountant)
app.post('/api/loans/:id/disburse', verifyToken, (req, res) => {
    if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const loan = loans.find(l => l.id === parseInt(req.params.id));
    if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'approved') {
        return res.status(400).json({ error: 'Loan must be approved first' });
    }

    const { referenceNumber } = req.body;
    
    loan.status = 'disbursed';
    loan.disbursement_reference = referenceNumber;
    loan.accountant_name = req.user.username;
    loan.disbursed_at = new Date().toISOString();

    res.json({ success: true, loan });
});

// Get loan statistics
app.get('/api/loans/stats/summary', verifyToken, (req, res) => {
    const stats = {
        total: loans.length,
        pending: loans.filter(l => l.status === 'pending').length,
        approved: loans.filter(l => l.status === 'approved').length,
        rejected: loans.filter(l => l.status === 'rejected').length,
        disbursed: loans.filter(l => l.status === 'disbursed').length,
        totalAmount: loans.reduce((sum, l) => sum + (parseFloat(l.total_amount) || 0), 0)
    };
    res.json(stats);
});

// ===== REPAYMENT ROUTES =====

// Record repayment
app.post('/api/repayments', verifyToken, (req, res) => {
    try {
        const { loanId, paymentDate, amountPaid, paymentMethod, referenceNumber, notes } = req.body;
        
        const loan = loans.find(l => l.id === parseInt(loanId));
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }

        const repayment = {
            id: repaymentIdCounter++,
            loan_id: parseInt(loanId),
            payment_date: paymentDate,
            amount_paid: parseFloat(amountPaid),
            payment_method: paymentMethod,
            reference_number: referenceNumber,
            notes: notes,
            recorded_by: req.user.id,
            recorded_by_name: req.user.username,
            created_at: new Date().toISOString(),
            first_name: loan.first_name,
            last_name: loan.last_name
        };

        repayments.push(repayment);
        res.json({ success: true, repayment });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all repayments
app.get('/api/repayments', verifyToken, (req, res) => {
    res.json({ repayments: repayments.reverse() });
});

// Get repayments for a specific loan
app.get('/api/repayments/loan/:loanId', verifyToken, (req, res) => {
    const loanId = parseInt(req.params.loanId);
    const loan = loans.find(l => l.id === loanId);
    
    if (!loan) {
        return res.status(404).json({ error: 'Loan not found' });
    }

    const loanRepayments = repayments.filter(r => r.loan_id === loanId);
    const totalPaid = loanRepayments.reduce((sum, r) => sum + r.amount_paid, 0);
    const loanAmount = parseFloat(loan.total_amount) || 0;
    const balance = loanAmount - totalPaid;

    res.json({
        repayments: loanRepayments,
        summary: {
            loanAmount: loanAmount,
            totalPaid: totalPaid,
            balance: balance
        }
    });
});

// Get repayment statistics
app.get('/api/repayments/stats/summary', verifyToken, (req, res) => {
    const disbursedLoans = loans.filter(l => l.status === 'disbursed');
    const totalLoaned = disbursedLoans.reduce((sum, l) => sum + (parseFloat(l.total_amount) || 0), 0);
    const totalCollected = repayments.reduce((sum, r) => sum + r.amount_paid, 0);

    res.json({
        totalLoaned: totalLoaned,
        total_collected: totalCollected,
        outstandingBalance: totalLoaned - totalCollected,
        active_loans: disbursedLoans.length
    });
});

// ===== SERVE STATIC FILES =====

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, `${page}.html`);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Page not found');
    }
});

// Start server
const HOST = '0.0.0.0'; // Railway requires binding to 0.0.0.0
app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Ready to accept requests!`);
});
