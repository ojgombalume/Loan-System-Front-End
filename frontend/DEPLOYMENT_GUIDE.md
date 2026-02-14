# Railway Deployment Guide for Skycap Loans

## What Was Fixed

Your error occurred because Railway couldn't find a `start.sh` script and didn't know how to build your application. The issues were:

1. **Missing Backend**: You only had frontend files (HTML/CSS/JS), but the JavaScript code expected a backend API at `http://localhost:3000/api`
2. **Missing Configuration**: No `package.json` or deployment configuration files
3. **Wrong File Structure**: Files weren't organized in the correct structure

## What I've Created

### 1. Backend Server (`server.js`)
A complete Express.js backend that provides:
- Authentication API for staff login
- Loan application API endpoints
- Loan review/approval workflow
- Repayment tracking
- File upload handling
- Static file serving for your HTML/CSS/JS

### 2. Configuration Files
- `package.json`: Node.js dependencies and scripts
- `railway.json`: Railway-specific deployment configuration
- `Procfile`: Tells Railway how to start your app
- `.gitignore`: Excludes unnecessary files from deployment

### 3. File Structure
```
your-project/
├── server.js              # Backend server
├── package.json           # Dependencies
├── Procfile              # Railway config
├── railway.json          # Railway settings
├── *.html                # Your HTML pages
├── public/               # Static assets
│   ├── css/             # Your stylesheets
│   ├── js/              # Your JavaScript
│   └── images/          # Your images
└── uploads/             # File uploads directory
```

## How to Deploy to Railway

### Method 1: Deploy from GitHub (Recommended)

1. **Create a GitHub repository**:
   - Go to https://github.com/new
   - Create a new repository (e.g., "skycap-loans")
   - Don't initialize with README (we already have files)

2. **Push your code to GitHub**:
   ```bash
   cd your-project-folder
   git init
   git add .
   git commit -m "Initial commit - Skycap Loans System"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/skycap-loans.git
   git push -u origin main
   ```

3. **Deploy on Railway**:
   - Go to https://railway.app
   - Sign up or log in
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authenticate with GitHub if prompted
   - Select your repository
   - Railway will automatically:
     - Detect it's a Node.js project
     - Install dependencies from `package.json`
     - Start the server using `npm start`

4. **Get your URL**:
   - Once deployed, Railway will show you a public URL
   - Click on it to access your application
   - The URL will look like: `your-app-name.up.railway.app`

### Method 2: Deploy using Railway CLI

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```
   This will open a browser window for authentication.

3. **Initialize and deploy**:
   ```bash
   cd your-project-folder
   railway init
   railway up
   ```

4. **Open your deployed app**:
   ```bash
   railway open
   ```

### Method 3: Deploy from Zip File

1. Create a zip file of all your project files
2. Go to https://railway.app
3. Create a new project
4. Use the "Deploy from GitHub" option but look for "Upload from Computer"
5. Upload your zip file

## After Deployment

### 1. Test Your Application

Visit your Railway URL and test:
- Homepage: `https://your-app.up.railway.app/`
- Loan Application: `https://your-app.up.railway.app/loan-application.html`
- Staff Login: `https://your-app.up.railway.app/staff-login.html`

### 2. Login to Staff Portal

Use these default credentials:
- **Admin**: username: `admin`, password: `password123`
- **Checker**: username: `checker1`, password: `password123`
- **Accountant**: username: `accountant1`, password: `password123`

### 3. Test the Workflow

1. Submit a loan application from the public form
2. Login as checker and approve it
3. Login as accountant and disburse it
4. Record a repayment

## Troubleshooting

### If deployment fails:

1. **Check Railway logs**:
   - In Railway dashboard, click on your deployment
   - Go to "Deployments" tab
   - Click on the latest deployment
   - View the build and runtime logs

2. **Common issues**:
   - **Port error**: Railway automatically sets PORT environment variable, the app uses it
   - **Module not found**: Make sure `package.json` is in the root directory
   - **Build fails**: Check that Node.js version is compatible (we're using Node 18+)

3. **Verify files are correct**:
   ```bash
   # Make sure these files exist in your root directory:
   ls -la
   # Should show: server.js, package.json, Procfile, railway.json
   ```

## Important Notes for Production

⚠️ **Current Limitations** (for development/testing only):

1. **Data Storage**: Currently using in-memory storage
   - All data is lost when the server restarts
   - **Solution**: Migrate to PostgreSQL (Railway offers free PostgreSQL)

2. **File Uploads**: Files are stored on the server
   - Will be lost on redeployment
   - **Solution**: Use cloud storage (AWS S3, Cloudinary)

3. **Security**: Basic authentication only
   - **Solution**: Implement proper JWT with secret keys
   - Add password hashing (bcrypt)
   - Enable HTTPS (Railway does this automatically)

4. **Default Passwords**: Change immediately after first login

## Upgrading to Production Database

To add PostgreSQL on Railway:

1. In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway will create a database and provide connection details
3. Install database driver: `npm install pg`
4. Update `server.js` to use PostgreSQL instead of in-memory arrays

## Getting Help

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Test all functionality
3. 🔲 Set up PostgreSQL database
4. 🔲 Implement file upload to cloud storage
5. 🔲 Add proper authentication/security
6. 🔲 Configure custom domain (optional)
7. 🔲 Set up monitoring and logging

---

**Your application is now ready to deploy!** Just follow the deployment steps above and you'll be live in minutes.
