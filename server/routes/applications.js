const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { screenCv } = require('../services/smythos');

const router = express.Router();

// Configure multer for CV uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.UPLOAD_DIR || './uploads');
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `cv_${uniqueId}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept PDF, DOC, DOCX files
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
    }
});

// Apply to job (Candidate only)
router.post('/jobs/:jobId/apply', authenticateToken, requireRole('candidate'), upload.single('cv'), async (req, res) => {
    try {
        const { jobId } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'CV file is required' });
        }

        // Check if job exists and is active
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('id, title, is_active, hr_id, description')
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (!job.is_active) {
            return res.status(400).json({ error: 'This job is no longer accepting applications' });
        }

        const { data: hr } = await supabase
            .from('users')
            .select('email')
            .eq('id', job.hr_id)
            .single();
        // Check if user already applied
        const { data: existingApplication } = await supabase
            .from('applications')
            .select('id')
            .eq('job_id', jobId)
            .eq('candidate_id', req.user.id)
            .single();

        if (existingApplication) {
            return res.status(409).json({ error: 'You have already applied to this job' });
        }

        // Create application record
        const { data: application, error } = await supabase
            .from('applications')
            .insert([{
                job_id: jobId,
                candidate_id: req.user.id,
                cv_path: req.file.filename,
                // cv_original_name: req.file.originalname,
                status: 'submitted'
            }])
            .select('*')
            .single();

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to submit application' });
        }

        // Trigger CV screening asynchronously
        // const fileUrl = `${req.protocol}://${req.get('host')}/static/${req.file.filename}`;

        screenCv({
            // from multer.diskStorage
            filePath: req.file.path,                  // absolute or relative path to saved file
            fileName: req.file.originalname,          // original filename (nice for SmythOS)
            mimeType: req.file.mimetype,              // e.g., application/pdf

            candidate: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email
            },
            job: {
                id: job.id,
                description: job.description
            },
            recruiterEmail: hr?.email || null,
            applicationId: application.id
        }).catch(error => {
            console.error('CV screening error:', error);
        });

        res.status(201).json({
            message: 'Application submitted successfully',
            application: {
                id: application.id,
                job_id: application.job_id,
                status: application.status,
                created_at: application.created_at
            }
        });
    } catch (error) {
        console.error('Apply error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get candidate's applications
router.get('/applications', authenticateToken, requireRole('candidate'), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('applications')
            .select(`
        id,
        status,
        created_at,
        job:jobs(id, title, location, salary_min, salary_max),
        screening:screenings(total_score, summary)
      `)
            .eq('candidate_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch applications' });
        }
        const applications = (data || []).map(a => ({
            id: a.id,
            status: a.status,
            created_at: a.created_at,
            job: a.job,
            screening: a.screening?.[0] || null,          // { total_score, summary, created_at } or null
        }));
        console.log('Fetched applications:', applications);
        res.json({ applications: applications || [] });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update application status (HR only)
router.patch('/applications/:applicationId/status', authenticateToken, requireRole('hr'), async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status } = req.body;

        if (!['submitted', 'screened', 'shortlisted', 'declined'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Verify HR owns the job for this application
        const { data: application, error: appError } = await supabase
            .from('applications')
            .select(`
        id,
        job:jobs(hr_id)
      `)
            .eq('id', applicationId)
            .single();

        if (appError || !application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (application.job.hr_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this application' });
        }

        const { data: updatedApplication, error } = await supabase
            .from('applications')
            .update({ status })
            .eq('id', applicationId)
            .select('*')
            .single();

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to update application status' });
        }

        res.json({
            message: 'Application status updated successfully',
            application: updatedApplication
        });
    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bulk invite to interview (HR only)
router.post('/applications/bulk-invite', authenticateToken, requireRole('hr'), async (req, res) => {
    try {
        const { applicationIds, message } = req.body;

        if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({ error: 'Application IDs array is required' });
        }

        // Verify HR owns all these applications
        const { data: applications, error: appError } = await supabase
            .from('applications')
            .select(`
        id,
        candidate_id,
        job:jobs(hr_id, title)
      `)
            .in('id', applicationIds);

        if (appError) {
            console.error('Database error:', appError);
            return res.status(500).json({ error: 'Failed to fetch applications' });
        }

        // Check authorization for all applications
        const unauthorizedApps = applications.filter(app => app.job.hr_id !== req.user.id);
        if (unauthorizedApps.length > 0) {
            return res.status(403).json({ error: 'Not authorized for some applications' });
        }

        // Create invitations
        const invitations = applications.map(app => ({
            application_id: app.id,
            message: message || `You have been invited to interview for ${app.job.title}`,
            status: 'sent'
        }));

        const { data: createdInvitations, error } = await supabase
            .from('invitations')
            .insert(invitations)
            .select('*');

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to create invitations' });
        }

        res.json({
            message: `${createdInvitations.length} invitations sent successfully`,
            invitations: createdInvitations
        });
    } catch (error) {
        console.error('Bulk invite error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;