-- Migration 001: Initial schema setup
-- Run this SQL in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('candidate', 'hr');
CREATE TYPE application_status AS ENUM ('submitted', 'screened', 'shortlisted', 'declined');
CREATE TYPE invitation_status AS ENUM ('pending', 'sent', 'accepted', 'declined');
CREATE TYPE interview_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE message_sender AS ENUM ('candidate', 'agent', 'system');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hr_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    location VARCHAR(255),
    salary_min INTEGER,
    salary_max INTEGER,
    deadline TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_path TEXT NOT NULL,
    cv_original_name TEXT NOT NULL,
    status application_status DEFAULT 'submitted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, candidate_id)
);

-- Screenings table
CREATE TABLE screenings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    total_score INTEGER,
    years_experience INTEGER,
    education TEXT,
    skills TEXT[] DEFAULT '{}',
    red_flags TEXT[] DEFAULT '{}',
    recommended_level TEXT,
    summary TEXT,
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations table
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    status invitation_status DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews table
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    room_code VARCHAR(50) UNIQUE NOT NULL,
    status interview_status DEFAULT 'scheduled',
    agent_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview messages table
CREATE TABLE interview_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    sender message_sender NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices for better performance
CREATE INDEX idx_jobs_active ON jobs(is_active, deadline DESC);
CREATE INDEX idx_jobs_hr_id ON jobs(hr_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_screenings_score ON screenings(total_score DESC);
CREATE INDEX idx_interviews_room ON interviews(room_code);
CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_interviews_time ON interviews(start_at, end_at);
CREATE INDEX idx_interview_messages_interview ON interview_messages(interview_id);
CREATE INDEX idx_interview_messages_time ON interview_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Can read own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Jobs: Public read for active jobs, HR can manage own jobs
CREATE POLICY "Public can read active jobs" ON jobs
    FOR SELECT USING (is_active = true);

CREATE POLICY "HR can manage own jobs" ON jobs
    FOR ALL USING (auth.uid()::text = hr_id::text);

-- Applications: Candidates can read own, HR can read for their jobs
CREATE POLICY "Candidates can read own applications" ON applications
    FOR SELECT USING (auth.uid()::text = candidate_id::text);

CREATE POLICY "HR can read applications for their jobs" ON applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = applications.job_id 
            AND jobs.hr_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Candidates can create applications" ON applications
    FOR INSERT WITH CHECK (auth.uid()::text = candidate_id::text);

-- Screenings: HR can read for their jobs
CREATE POLICY "HR can read screenings for their jobs" ON screenings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications a
            JOIN jobs j ON j.id = a.job_id
            WHERE a.id = screenings.application_id 
            AND j.hr_id::text = auth.uid()::text
        )
    );

-- Invitations: Candidates can read own, HR can manage for their jobs
CREATE POLICY "Candidates can read own invitations" ON invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications a
            WHERE a.id = invitations.application_id 
            AND a.candidate_id::text = auth.uid()::text
        )
    );

CREATE POLICY "HR can manage invitations for their jobs" ON invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM applications a
            JOIN jobs j ON j.id = a.job_id
            WHERE a.id = invitations.application_id 
            AND j.hr_id::text = auth.uid()::text
        )
    );

-- Interviews: Participants can read their interviews
CREATE POLICY "Interview participants can read" ON interviews
    FOR SELECT USING (
        auth.uid()::text = candidate_id::text OR
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = interviews.job_id 
            AND jobs.hr_id::text = auth.uid()::text
        )
    );

CREATE POLICY "HR can manage interviews for their jobs" ON interviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = interviews.job_id 
            AND jobs.hr_id::text = auth.uid()::text
        )
    );

-- Interview messages: Participants can read/write in their interviews
CREATE POLICY "Interview participants can read messages" ON interview_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM interviews i
            WHERE i.id = interview_messages.interview_id 
            AND (
                i.candidate_id::text = auth.uid()::text OR
                EXISTS (
                    SELECT 1 FROM jobs j
                    WHERE j.id = i.job_id 
                    AND j.hr_id::text = auth.uid()::text
                )
            )
        )
    );

CREATE POLICY "Candidates can send messages in their interviews" ON interview_messages
    FOR INSERT WITH CHECK (
        sender = 'candidate' AND
        EXISTS (
            SELECT 1 FROM interviews i
            WHERE i.id = interview_messages.interview_id 
            AND i.candidate_id::text = auth.uid()::text
        )
    );

-- Create function to generate room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
BEGIN
    RETURN UPPER(
        SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8)
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically set room code
CREATE OR REPLACE FUNCTION set_room_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.room_code IS NULL THEN
        NEW.room_code := generate_room_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set room code
CREATE TRIGGER trigger_set_room_code
    BEFORE INSERT ON interviews
    FOR EACH ROW
    EXECUTE FUNCTION set_room_code();

-- Insert sample data for testing
INSERT INTO users (id, role, name, email, password_hash) VALUES
('00000000-0000-0000-0000-000000000001', 'hr', 'HR Manager', 'hr@company.com', '$2b$10$dummy.hash.for.testing'),
('00000000-0000-0000-0000-000000000002', 'candidate', 'John Candidate', 'candidate@email.com', '$2b$10$dummy.hash.for.testing');

INSERT INTO jobs (id, hr_id, title, description, tags, location, salary_min, salary_max, deadline, is_active) VALUES
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Senior React Developer', 'We are looking for an experienced React developer to join our team.', ARRAY['React', 'JavaScript', 'Node.js'], 'Remote', 80000, 120000, NOW() + INTERVAL '30 days', true),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Backend Engineer', 'Node.js backend engineer position for building scalable APIs.', ARRAY['Node.js', 'PostgreSQL', 'Express'], 'New York', 90000, 130000, NOW() + INTERVAL '45 days', true);