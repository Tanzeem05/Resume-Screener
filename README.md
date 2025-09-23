# CV Screener and Interview Platform

A full-stack PERN application for automated CV screening and AI-powered interviews.

## Features

- **Role-based Authentication**: Separate interfaces for HR and candidates
- **Job Management**: Create, list, and manage job postings
- **CV Upload & Screening**: Automated CV analysis using SmythOS AI
- **Interview Scheduling**: Schedule and conduct AI-assisted interviews
- **Real-time Chat**: WebSocket-powered interview chat rooms
- **File Management**: Secure CV upload and retrieval

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + WebSocket
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + Supabase Auth
- **AI Integration**: SmythOS agents
- **File Storage**: Local filesystem with static serving

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env` in both `client/` and `server/` folders
   - Update with your Supabase credentials and other settings

3. **Run database migrations:**
   ```bash
   npm run migrate
   ```

4. **Start development servers:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Route components
│   │   └── styles/         # CSS files
│   └── package.json
├── server/                 # Express backend
│   ├── db/                 # Database migrations
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── package.json
└── package.json           # Root workspace
```

## API Documentation

See `ROUTES.md` for detailed API endpoints and WebSocket specifications.

## Database Schema

See `SCHEMA.md` for complete database structure and relationships.

## Development Setup

See `SETUP.md` for detailed development environment setup instructions.

## License

MIT