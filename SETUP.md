# Development Setup Guide

## Prerequisites

1. **Node.js**: Version 18 or higher
2. **PostgreSQL**: Version 14 or higher
3. **Git**: For version control

## Step-by-Step Setup

### 1. Database Setup

Create a PostgreSQL database and user:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database and user
CREATE DATABASE cv_screener_app;
CREATE USER cv_app_user WITH ENCRYPTED PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE cv_screener_app TO cv_app_user;
\q
```

### 2. Environment Configuration

#### Server Environment (`server/.env`)

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cv_screener_app
DB_USER=cv_app_user
DB_PASSWORD=SecurePassword123!

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# SmythOS Integration (Optional - uses mocks if not provided)
SMYTHOS_API_URL=https://api.smythos.com
SMYTHOS_CV_AGENT_ID=your-cv-screening-agent-id
SMYTHOS_INTERVIEW_AGENT_ID=your-interview-agent-id
SMYTHOS_API_KEY=your-smythos-api-key
```

#### Client Environment (`client/.env`)

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

### 3. Installation and Database Migration

```bash
# Install all dependencies
npm install

# Run database migrations
npm run migrate

# Start the development servers
npm run dev
```

### 4. Verify Installation

1. **Frontend**: Visit http://localhost:5173
2. **Backend**: Check http://localhost:3001/api/health (should return OK)
3. **Database**: Verify tables were created successfully

### 5. Test User Accounts

Create test accounts:

1. **HR User**:
   - Email: hr@company.com
   - Password: HRPassword123!
   - Role: hr

2. **Candidate User**:
   - Email: candidate@email.com
   - Password: CandidatePass123!
   - Role: candidate

## Development Commands

```bash
# Start both client and server
npm run dev

# Start only server
npm run dev:server

# Start only client  
npm run dev:client

# Build for production
npm run build

# Run database migrations
npm run migrate

# Start production server
npm run start
```

## Folder Structure

```
CV_Screener_and_Interview/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   ├── pages/          # Route components
│   │   └── styles/         # CSS and Tailwind config
│   ├── public/             # Static assets
│   └── package.json        # Client dependencies
├── server/                 # Express backend application
│   ├── db/                 # Database migrations and setup
│   ├── middleware/         # Express middleware
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic and external integrations
│   ├── uploads/            # File upload storage
│   └── package.json        # Server dependencies
├── package.json            # Root workspace configuration
├── .env.example            # Environment variables template
└── README.md              # Main documentation
```

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running: `pg_isready`
2. Check connection parameters in `.env`
3. Ensure database and user exist
4. Verify user permissions

### Port Conflicts

- Server runs on port 3001
- Client runs on port 5173
- WebSocket uses the same port as server (3001)

### File Upload Issues

1. Ensure `uploads` directory exists in server folder
2. Check file permissions
3. Verify `UPLOAD_DIR` environment variable

### CORS Issues

- Frontend and backend must run on different ports
- Check `CORS_ORIGIN` in server configuration
- Ensure credentials are included in API calls

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure HTTPS
4. Set up proper PostgreSQL instance
5. Configure reverse proxy (nginx)
6. Use process manager (PM2)

## SmythOS Integration

The application includes SmythOS AI agent integration for:

- **CV Screening**: Automatic analysis and scoring of uploaded CVs
- **Interview Assistance**: AI-powered interview questions and evaluation

When SmythOS environment variables are not configured, the application uses mock implementations to ensure full functionality during development.

## Support

For issues or questions:
1. Check the console logs (browser and server)
2. Verify environment configuration
3. Ensure all dependencies are installed
4. Check database connectivity