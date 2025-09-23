# DEPLOYMENT GUIDE

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Supabase Account** for database
3. **SmythOS Account** (optional - has mock fallbacks)

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd CV

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Database Setup

1. Create a new project in [Supabase](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Copy and paste the contents of `database/001_init.sql`
4. Run the SQL script to create all tables and policies
5. Note your Project URL and Service Key from Settings > API

### 3. Environment Configuration

#### Server Environment (.env)
```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your actual values:
```env
PORT=5000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-very-long-random-secret-key
SMYTHOS_API_URL=https://api.smythos.com
SMYTHOS_API_KEY=your-smythos-key
NODE_ENV=development
```

#### Client Environment (.env)
```bash
cd client
cp .env.example .env
```

Edit `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
```

### 4. Run the Application

```bash
# Terminal 1 - Start the server
cd server
npm run dev

# Terminal 2 - Start the client
cd client
npm run dev
```

Access the application at http://localhost:5173

## Production Deployment

### Option 1: Traditional Hosting (VPS/Dedicated Server)

#### Server Deployment
```bash
# Build the client
cd client
npm run build

# Copy build files to server public directory
cp -r dist/* ../server/public/

# Install PM2 for process management
npm install -g pm2

# Start the server with PM2
cd ../server
pm2 start src/app.js --name cv-platform

# Setup nginx reverse proxy (optional)
```

#### Nginx Configuration (optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Cloud Platform Deployment

#### Vercel (Frontend)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

#### Railway/Render (Backend)
1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

#### Heroku (Full Stack)
```bash
# Create Heroku apps
heroku create cv-platform-api
heroku create cv-platform-client

# Set environment variables
heroku config:set SUPABASE_URL=your-url --app cv-platform-api
heroku config:set SUPABASE_SERVICE_KEY=your-key --app cv-platform-api
# ... set other environment variables

# Deploy
git subtree push --prefix server heroku master
```

### Production Environment Variables

#### Server (.env)
```env
PORT=5000
NODE_ENV=production
SUPABASE_URL=your-production-supabase-url
SUPABASE_SERVICE_KEY=your-production-service-key
JWT_SECRET=your-production-jwt-secret
SMYTHOS_API_URL=https://api.smythos.com
SMYTHOS_API_KEY=your-production-smythos-key
```

#### Client (.env)
```env
VITE_API_URL=https://your-api-domain.com/api
VITE_WS_URL=wss://your-api-domain.com
VITE_APP_NAME=CV Screening Platform
```

## Database Migration

If you need to update the database schema:

1. Update `database/001_init.sql` with your changes
2. Create a new migration file (e.g., `002_update.sql`)
3. Run the new migration in your Supabase SQL editor
4. Update your application code accordingly

## Monitoring and Maintenance

### Health Checks
- API Health: `GET /api/health`
- Database connectivity
- File upload functionality

### Logs
```bash
# PM2 logs
pm2 logs cv-platform

# Application logs
tail -f server/logs/app.log
```

### Backup
- Database: Use Supabase automatic backups
- Files: Backup `server/uploads/` directory
- Code: Ensure Git repository is backed up

## SSL Certificate (Production)

### Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Performance Optimization

### Client Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement lazy loading
- Optimize images

### Server Optimization
- Enable compression middleware
- Implement API rate limiting
- Use database connection pooling
- Add caching headers

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database RLS policies active
- [ ] File upload validation enabled
- [ ] JWT secrets are strong
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase URL and key
   - Check network connectivity
   - Ensure RLS policies are correct

2. **File Upload Issues**
   - Check file size limits
   - Verify upload directory permissions
   - Ensure multer configuration

3. **WebSocket Connection Issues**
   - Check firewall settings
   - Verify WebSocket URL
   - Ensure JWT token is valid

4. **Build Errors**
   - Clear node_modules and reinstall
   - Check environment variables
   - Verify all dependencies are installed

### Support

For additional support:
1. Check the main README.md
2. Review error logs
3. Check Supabase dashboard for database issues
4. Verify all environment variables are set correctly