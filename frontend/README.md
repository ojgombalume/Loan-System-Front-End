# Skycap Loans Management System

Loan management system for Kumbi Beat Holdings T/A Skycap Loans

## Features

- Online loan application form
- Staff portal with role-based access
- Loan approval workflow (Maker-Checker-Accountant)
- Repayment tracking
- Dashboard with statistics

## Deployment to Railway

### Prerequisites
- Railway account (https://railway.app)
- Git installed on your computer

### Steps to Deploy

1. **Initialize Git Repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub** (optional but recommended):
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

3. **Deploy to Railway**:
   
   **Option A: Deploy from GitHub**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect the Node.js project and deploy

   **Option B: Deploy using Railway CLI**
   - Install Railway CLI: `npm i -g @railway/cli`
   - Login: `railway login`
   - Initialize: `railway init`
   - Deploy: `railway up`

4. **Access Your Application**:
   - Railway will provide a public URL (e.g., `your-app.up.railway.app`)
   - Visit the URL to see your live application

### Environment Variables
No environment variables are required for basic deployment. The application will automatically detect the PORT from Railway.

### Default Login Credentials

**Administrator:**
- Username: `admin`
- Password: `password123`

**Loan Officer (Maker):**
- Username: `maker1`
- Password: `password123`

**Verifier (Checker):**
- Username: `checker1`
- Password: `password123`

**Accountant:**
- Username: `accountant1`
- Password: `password123`

⚠️ **IMPORTANT**: Change these passwords after first login in production!

## Project Structure

```
/
├── server.js              # Express backend server
├── package.json           # Node.js dependencies
├── Procfile              # Railway deployment config
├── railway.json          # Railway configuration
├── *.html                # HTML pages
├── public/
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   └── images/           # Images and logos
└── uploads/              # File uploads directory
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open browser to `http://localhost:3000`

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **File Upload**: Multer
- **Storage**: In-memory (replace with database for production)

## Production Recommendations

For production deployment, consider:

1. **Database**: Replace in-memory storage with PostgreSQL or MySQL
2. **Authentication**: Implement proper JWT with secret keys
3. **File Storage**: Use cloud storage (AWS S3, Cloudinary) for uploads
4. **Security**: 
   - Enable HTTPS
   - Implement rate limiting
   - Add input validation
   - Use environment variables for sensitive data
5. **Monitoring**: Add logging and error tracking

## Support

For issues or questions, contact the development team.

## License

Proprietary - Kumbi Beat Holdings (PTY) LTD
