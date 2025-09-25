const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get candidate's interviews (separate from invitations)
router.get('/candidate/interviews', authenticateToken, requireRole('candidate'), async (req, res) => {
  try {
    // First, get all interviews for the candidate
    const { data: interviews, error: interviewsError } = await supabase
      .from('interviews')
      .select(`
        id,
        invitation_id,
        start_at,
        end_at,
        room_code,
        status,
        number_of_questions,
        job:jobs(id, title, location, hr:users!jobs_hr_id_fkey(name, email))
      `)
      .eq('candidate_id', req.user.id)
      .order('start_at', { ascending: false });

    if (interviewsError) {
      console.error('Database error:', interviewsError);
      return res.status(500).json({ error: 'Failed to fetch interviews' });
    }

    if (!interviews || interviews.length === 0) {
      return res.json({ interviews: [] });
    }

    // Get invitation details for these interviews
    const invitationIds = interviews.map(interview => interview.invitation_id);
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitations')
      .select('id, message, status')
      .in('id', invitationIds);

    if (invitationsError) {
      console.error('Invitations error:', invitationsError);
      return res.status(500).json({ error: 'Failed to fetch invitation details' });
    }

    // Filter interviews to only include those with accepted invitations
    const acceptedInvitations = invitations?.filter(inv => inv.status === 'accepted') || [];
    const acceptedInvitationIds = acceptedInvitations.map(inv => inv.id);
    
    const filteredInterviews = interviews.filter(interview => 
      acceptedInvitationIds.includes(interview.invitation_id)
    );

    // Add time status and invitation details to each interview
    const now = new Date();
    const interviewsWithStatus = filteredInterviews.map(interview => {
      const startTime = new Date(interview.start_at);
      const endTime = new Date(interview.end_at);
      
      let timeStatus = 'upcoming';
      if (now >= startTime && now <= endTime) {
        timeStatus = 'active';
      } else if (now > endTime) {
        timeStatus = 'past';
      }

      // Find the corresponding invitation
      const invitation = invitations?.find(inv => inv.id === interview.invitation_id);

      return {
        ...interview,
        time_status: timeStatus,
        invitation: invitation || null
      };
    });

    res.json({ interviews: interviewsWithStatus });
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get candidate's invitations (Alternative approach)
router.get('/candidate/invitations', authenticateToken, requireRole('candidate'), async (req, res) => {
  try {
    // First get invitations
    const { data: invitations, error: invError } = await supabase
      .from('invitations')
      .select(`
        id,
        status,
        message,
        created_at,
        application:applications!inner(
          id,
          candidate_id,
          job:jobs(id, title, location, hr:users!jobs_hr_id_fkey(name, email))
        )
      `)
      .eq('application.candidate_id', req.user.id)
      .order('created_at', { ascending: false });

    if (invError) {
      console.error('Database error:', invError);
      return res.status(500).json({ error: 'Failed to fetch invitations' });
    }

    // Get all interview details for these invitations in one query
    const invitationIds = (invitations || []).map(inv => inv.id);
    
    let interviews = [];
    if (invitationIds.length > 0) {
      const { data: interviewData, error: intError } = await supabase
        .from('interviews')
        .select('id, invitation_id, start_at, end_at, room_code, status, number_of_questions')
        .in('invitation_id', invitationIds);

      if (!intError) {
        interviews = interviewData || [];
      }
    }

    // Merge invitations with their corresponding interviews
    const invitationsWithInterviews = (invitations || []).map(invitation => {
      const interview = interviews.find(int => int.invitation_id === invitation.id);
      return {
        ...invitation,
        interview: interview || null
      };
    });

    res.json({ invitations: invitationsWithInterviews });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept invitation
router.post('/candidate/invitations/:invitationId/accept', authenticateToken, requireRole('candidate'), async (req, res) => {
  try {
    const { invitationId } = req.params;

    // Verify invitation belongs to candidate
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select(`
        id,
        status,
        application:applications(candidate_id)
      `)
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.application.candidate_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (invitation.status !== 'sent') {
      return res.status(400).json({ error: 'Invitation cannot be accepted' });
    }

    // Update invitation status
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to accept invitation' });
    }

    res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decline invitation
router.post('/candidate/invitations/:invitationId/decline', authenticateToken, requireRole('candidate'), async (req, res) => {
  try {
    const { invitationId } = req.params;

    // Verify invitation belongs to candidate
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select(`
        id,
        status,
        application:applications(candidate_id)
      `)
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.application.candidate_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (invitation.status !== 'sent') {
      return res.status(400).json({ error: 'Invitation cannot be declined' });
    }

    // Update invitation status
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to decline invitation' });
    }

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send invitation with interview scheduling (HR only)
router.post('/hr/applications/:applicationId/invite', [
  body('message').optional().isString().trim(),
  body('start_at').notEmpty().isISO8601().withMessage('Start time is required'),
  body('end_at').notEmpty().isISO8601().withMessage('End time is required')
], authenticateToken, requireRole('hr'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { applicationId } = req.params;
    const { message, start_at, end_at, number_of_questions } = req.body;

    // Validate time range
    const startTime = new Date(start_at);
    const endTime = new Date(end_at);
    
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    if (startTime <= new Date()) {
      return res.status(400).json({ error: 'Interview cannot be scheduled in the past' });
    }

    // Verify HR owns the job for this application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        candidate_id,
        job_id,
        job:jobs(id, hr_id, title)
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.job.hr_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('application_id', applicationId)
      .single();

    if (existingInvitation) {
      return res.status(409).json({ error: 'Invitation already sent for this application' });
    }

    // Generate unique room code
    const generateRoomCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let roomCode = generateRoomCode();
    
    // Ensure room code is unique
    let roomCodeExists = true;
    while (roomCodeExists) {
      const { data: existingRoom } = await supabase
        .from('interviews')
        .select('id')
        .eq('room_code', roomCode)
        .single();
      
      if (!existingRoom) {
        roomCodeExists = false;
      } else {
        roomCode = generateRoomCode();
      }
    }

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert([{
        application_id: applicationId,
        message: message || `You have been invited to interview for ${application.job.title} on ${startTime.toLocaleDateString()} from ${startTime.toLocaleTimeString()} to ${endTime.toLocaleTimeString()}`,
        status: 'sent'
      }])
      .select('*')
      .single();

    if (invitationError) {
      console.error('Database error creating invitation:', invitationError);
      return res.status(500).json({ error: 'Failed to send invitation' });
    }
    console.log(number_of_questions);
    // Create interview record
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .insert([{
        invitation_id: invitation.id,
        job_id: application.job_id,
        application_id: application.id,
        candidate_id: application.candidate_id,
        start_at: start_at,
        end_at: end_at,
        number_of_questions: number_of_questions,
        room_code: roomCode,
        status: 'scheduled'
      }])
      .select('*')
      .single();

    if (interviewError) {
      console.error('Database error creating interview:', interviewError);
      // Rollback invitation if interview creation fails
      await supabase
        .from('invitations')
        .delete()
        .eq('id', invitation.id);
      return res.status(500).json({ error: 'Failed to schedule interview' });
    }

    res.status(201).json({
      message: 'Invitation sent and interview scheduled successfully',
      invitation,
      interview
    });
  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Schedule interview (HR only) - Fixed data structure
router.post('/hr/invitations/:invitationId/schedule', authenticateToken, requireRole('hr'), [
  body('start_at').isISO8601().withMessage('Start time must be a valid date'),
  body('end_at').isISO8601().withMessage('End time must be a valid date')
], async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { invitationId } = req.params;
    const { start_at, end_at } = req.body;

    // Validate time range
    const startTime = new Date(start_at);
    const endTime = new Date(end_at);
    
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    if (startTime <= new Date()) {
      return res.status(400).json({ error: 'Interview cannot be scheduled in the past' });
    }

    // Verify invitation and authorization
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select(`
        id,
        status,
        application:applications!inner(
          id,
          candidate_id,
          job:jobs!inner(id, hr_id, title)
        )
      `)
      .eq('id', invitationId)
      .single();

    if (invError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.application.job.hr_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (invitation.status !== 'accepted') {
      return res.status(400).json({ error: 'Invitation must be accepted before scheduling' });
    }

    // Check if interview already scheduled
    const { data: existingInterview } = await supabase
      .from('interviews')
      .select('id')
      .eq('invitation_id', invitationId)
      .single();

    if (existingInterview) {
      return res.status(409).json({ error: 'Interview already scheduled for this invitation' });
    }

    // Generate unique room code
    const roomCode = uuidv4().slice(0, 8).toUpperCase();

    // Create interview
    const { data: interview, error } = await supabase
      .from('interviews')
      .insert([{
        invitation_id: invitationId,
        job_id: invitation.application.job.id,
        candidate_id: invitation.application.candidate_id,
        start_at,
        end_at,
        room_code: roomCode,
        status: 'scheduled'
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to schedule interview' });
    }

    res.status(201).json({
      message: 'Interview scheduled successfully',
      interview
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get HR interviews
router.get('/hr/interviews', authenticateToken, requireRole('hr'), async (req, res) => {
  try {
    const { data: interviews, error } = await supabase
      .from('interviews')
      .select(`
        id,
        start_at,
        end_at,
        room_code,
        status,
        job:jobs!inner(id, title, hr_id),
        candidate:users!interviews_candidate_id_fkey(id, name, email),
        invitation:invitations(id, message)
      `)
      .eq('job.hr_id', req.user.id)
      .order('start_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch interviews' });
    }

    res.json({ interviews: interviews || [] });
  } catch (error) {
    console.error('Get HR interviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get HR invitations
router.get('/hr/invitations', authenticateToken, requireRole('hr'), async (req, res) => {
  try {
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        id,
        status,
        message,
        created_at,
        application:applications!inner(
          id,
          candidate:users!applications_candidate_id_fkey(id, name, email),
          job:jobs!inner(id, title, hr_id)
        ),
        interview:interviews(id, start_at, end_at, room_code, status)
      `)
      .eq('application.job.hr_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch invitations' });
    }

    res.json({ invitations: invitations || [] });
  } catch (error) {
    console.error('Get HR invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;