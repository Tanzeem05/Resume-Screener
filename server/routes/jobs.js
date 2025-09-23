const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const jobValidation = [
    body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Description must be between 10 and 5000 characters'),
    body('location').optional().trim().isLength({ max: 200 }).withMessage('Location must be less than 200 characters'),
    body('salary_min').optional().isInt({ min: 0 }).withMessage('Minimum salary must be a positive number'),
    body('salary_max').optional().isInt({ min: 0 }).withMessage('Maximum salary must be a positive number'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('deadline').optional().isISO8601().withMessage('Deadline must be a valid date')
];

// Get public jobs (for landing page)
router.get('/', async (req, res) => {
    try {
        const { active = '1', limit = '20', offset = '0' } = req.query;

        let query = supabase
            .from('jobs')
            .select(`
        id,
        title,
        description,
        tags,
        location,
        salary_min,
        salary_max,
        deadline,
        created_at,
        hr:users!jobs_hr_id_fkey(name)
      `)
            .order('created_at', { ascending: false });

        if (active === '1') {
            query = query.eq('is_active', true);
        }

        const { data: jobs, error, count } = await query
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch jobs' });
        }

        res.json({
            jobs: jobs || [],
            total: count || 0
        });
    } catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single job details
router.get('/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;

        const { data: job, error } = await supabase
            .from('jobs')
            .select(`
        id,
        title,
        description,
        tags,
        location,
        salary_min,
        salary_max,
        deadline,
        is_active,
        created_at,
        hr:users!jobs_hr_id_fkey(name, email)
      `)
            .eq('id', jobId)
            .single();

        if (error || !job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ job });
    } catch (error) {
        console.error('Get job error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// HR Routes (require authentication and HR role)

// Get HR's own jobs
router.get('/hr/my-jobs', authenticateToken, requireRole('hr'), async (req, res) => {
    try {
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select(`
        id,
        title,
        description,
        tags,
        location,
        salary_min,
        salary_max,
        deadline,
        is_active,
        created_at,
        applications:applications(count)
      `)
            .eq('hr_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch jobs' });
        }

        res.json({ jobs: jobs || [] });
    } catch (error) {
        console.error('Get HR jobs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new job (HR only)
router.post('/hr/jobs', authenticateToken, requireRole('hr'), jobValidation, async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { title, description, tags, location, salary_min, salary_max, deadline } = req.body;

        // Validate salary range
        if (salary_min && salary_max && salary_min > salary_max) {
            return res.status(400).json({ error: 'Minimum salary cannot be greater than maximum salary' });
        }

        const { data: newJob, error } = await supabase
            .from('jobs')
            .insert([{
                hr_id: req.user.id,
                title,
                description,
                tags: tags || [],
                location,
                salary_min,
                salary_max,
                deadline: deadline || null
            }])
            .select('*')
            .single();

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to create job' });
        }

        res.status(201).json({
            message: 'Job created successfully',
            job: newJob
        });
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update job (HR only)
router.patch('/hr/jobs/:jobId', authenticateToken, requireRole('hr'), async (req, res) => {
    try {
        const { jobId } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated
        delete updates.id;
        delete updates.hr_id;
        delete updates.created_at;

        // Verify job ownership
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('hr_id')
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.hr_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this job' });
        }

        const { data: updatedJob, error } = await supabase
            .from('jobs')
            .update(updates)
            .eq('id', jobId)
            .select('*')
            .single();

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to update job' });
        }

        res.json({
            message: 'Job updated successfully',
            job: updatedJob
        });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete job (HR only)
router.delete('/hr/jobs/:jobId', authenticateToken, requireRole('hr'), async (req, res) => {
    try {
        const { jobId } = req.params;

        // Verify job ownership
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('hr_id')
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.hr_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this job' });
        }

        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', jobId);

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to delete job' });
        }

        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get job applicants (HR only)
router.get('/hr/jobs/:jobId/applicants', authenticateToken, requireRole('hr'), async (req, res) => {
    try {
        const { jobId } = req.params;

        // Verify job ownership
        const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('hr_id, title')
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.hr_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to view these applicants' });
        }

        const { data, error } = await supabase
            .from('applications')
            .select(`
        id,
        status,
        created_at,
        candidate:users!applications_candidate_id_fkey(id, name, email),
        screening:screenings(total_score, years_experience, education, summary)
      `)
            .eq('job_id', jobId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch applicants' });
        }
        const applications = (data || []).map(a => ({
            id: a.id,
            status: a.status,
            created_at: a.created_at,
            candidate: a.candidate,
            screening: a.screening?.[0] || null, // { total_score, years_experience, education, summary, created_at } or null
        }));
        res.json({
            job: { id: jobId, title: job.title },
            applications: applications || []
        });
    } catch (error) {
        console.error('Get applicants error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/job_description/:job_id', async (req, res) => {
    try {
        const { job_id } = req.params;
        const { data, error } = await supabase
            .from('jobs')
            .select('description')
            .eq('id', job_id)
            .single();
        if (error || !data) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json({ description: data.description });
    } catch (error) {
        console.error('Get job description error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;