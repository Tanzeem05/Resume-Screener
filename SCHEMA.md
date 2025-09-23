
## Database schema (SQL migrations)

Create these tables with indices and FKs:

- users (id PK, role ENUM('candidate','hr'), name, email UNIQUE, password_hash, created_at)
- jobs (id PK, hr_id FK users(id), title, description, tags TEXT[], location, salary_min INT, salary_max INT, deadline TIMESTAMPTZ, is_active BOOLEAN DEFAULT TRUE, created_at)
- applications (id PK, job_id FK jobs(id), candidate_id FK users(id), cv_path TEXT, status ENUM('submitted','screened','shortlisted','declined'), created_at)
- screenings (id PK, application_id FK applications(id) UNIQUE, total_score INT, years_experience INT, education TEXT, skills TEXT[], red_flags TEXT[], recommended_level TEXT, summary TEXT, raw_json JSONB, created_at)
- invitations (id PK, application_id FK applications(id), status ENUM('pending','sent','accepted','declined'), message TEXT, created_at)
- interviews (id PK, invitation_id FK invitations(id), job_id FK jobs(id), candidate_id FK users(id), start_at TIMESTAMPTZ, end_at TIMESTAMPTZ, room_code TEXT UNIQUE, status ENUM('scheduled','in_progress','completed','cancelled'), agent_notes TEXT, created_at)
- interview_messages (id PK, interview_id FK interviews(id), sender ENUM('candidate','agent','system'), content TEXT, created_at)

Also create indices:
- idx_jobs_active (is_active, deadline desc)
- idx_applications_job (job_id)
- idx_screenings_score (total_score desc)
- idx_interviews_room (room_code)

## Backend API contract

Auth:
- POST /api/auth/register {role, name, email, password}
- POST /api/auth/login {email, password}
- POST /api/auth/logout
- GET  /api/auth/me  -> { user: {id,name,email,role} }

Jobs (public + HR):
- GET  /api/jobs?active=1 -> list public jobs
- POST /api/hr/jobs (HR only) {title, description, tags[], location, salary_min, salary_max, deadline}
- GET  /api/hr/jobs -> list HR’s jobs
- GET  /api/hr/jobs/:jobId/applicants -> [{application, candidate, screening}]
- PATCH /api/hr/jobs/:jobId {is_active?}

Applications (Candidate + HR view):
- POST /api/candidate/jobs/:jobId/apply (multipart form: fields + CV file)
- GET  /api/candidate/applications
- GET  /api/hr/jobs/:jobId/applications

Files:
- GET /api/files/cv/:applicationId -> streams file if HR or owner

Screening (internal):
- POST /api/internal/screen/:applicationId -> trigger screening now (protected by admin key header)
- Webhook receiver (optional): POST /api/internal/screen/callback -> upsert screening

Invitations & Interviews:
- POST /api/hr/applications/:applicationId/invite {message}
- POST /api/hr/invitations/:invId/schedule {start_at, end_at} -> creates interview + room_code
- GET  /api/candidate/invitations
- POST /api/candidate/invitations/:invId/accept
- POST /api/candidate/invitations/:invId/decline
- GET  /api/interviews/:room_code -> auth check (candidate must match)
- WS  /ws/interview/:room_code -> chat channel (store messages)

## SmythOS agent stubs

Create `services/smythos.js`:
- `async function screenCv({fileUrl, candidate, job})` -> if env URL exists, POST {fileUrl,candidate,job} with API key; else return mock:


{
total_score: 78,
years_experience: 3,
education: "BSc CSE",
skills: ["React","Node","Postgres"],
red_flags: ["Gap 6 months"],
recommended_level: "Junior+",
summary: "Good fit for front-end focus",
raw: {mock: true}
}