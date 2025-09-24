const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get interview details by room code
router.get('/:roomCode', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;

    const { data: interview, error } = await supabase
      .from('interviews')
      .select(`
        id,
        start_at,
        end_at,
        room_code,
        status,
        candidate_id,
        job:jobs(id, title, hr_id, hr:users!jobs_hr_id_fkey(name)),
        candidate:users!interviews_candidate_id_fkey(name, email)
      `)
      .eq('room_code', roomCode)
      .single();

    if (error || !interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check authorization: must be the candidate or HR
    const isCandidate = req.user.id === interview.candidate_id;
    const isHR = req.user.id === interview.job.hr_id;

    if (!isCandidate && !isHR) {
      return res.status(403).json({ error: 'Not authorized to access this interview' });
    }

    // Check if interview is within time range
    const now = new Date();
    const startTime = new Date(interview.start_at);
    const endTime = new Date(interview.end_at);
    
    const isActive = now >= startTime && now <= endTime;
    
    res.json({
      interview: {
        id: interview.id,
        room_code: interview.room_code,
        start_at: interview.start_at,
        end_at: interview.end_at,
        status: interview.status,
        job: interview.job,
        candidate: interview.candidate,
        is_active: isActive,
        user_role: isCandidate ? 'candidate' : 'hr'
      }
    });
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get interview messages
router.get('/:roomCode/messages', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // Verify access to interview
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('id, candidate_id, job:jobs(hr_id)')
      .eq('room_code', roomCode)
      .single();

    if (interviewError || !interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check authorization
    const isCandidate = req.user.id === interview.candidate_id;
    const isHR = req.user.id === interview.job.hr_id;

    if (!isCandidate && !isHR) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from('interview_messages')
      .select('id, sender, content, created_at')
      .eq('interview_id', interview.id)
      .order('created_at', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({ messages: messages || [] });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;