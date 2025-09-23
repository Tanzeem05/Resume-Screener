const express = require('express');
const path = require('path');
const fs = require('fs');
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get CV file
router.get('/cv/:applicationId', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Get application details
    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        id,
        cv_path,
        cv_original_name,
        candidate_id,
        job:jobs(hr_id)
      `)
      .eq('id', applicationId)
      .single();

    if (error || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check authorization: must be the candidate who applied or HR who owns the job
    const isCandidate = req.user.id === application.candidate_id;
    const isHR = req.user.role === 'hr' && req.user.id === application.job.hr_id;

    if (!isCandidate && !isHR) {
      return res.status(403).json({ error: 'Not authorized to access this file' });
    }

    // Check if file exists
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', application.cv_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `inline; filename="${application.cv_original_name}"`);
    res.setHeader('Content-Type', 'application/pdf'); // Default to PDF, could be enhanced to detect actual type

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('File access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;