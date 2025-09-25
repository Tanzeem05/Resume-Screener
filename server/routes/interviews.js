const express = require('express');
const axios = require('axios');
const { supabase } = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Store interview sessions in memory (you can move to Redis later)
const interviewSessions = new Map();

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
        number_of_questions,
        invitation_id,
        job_id,
        job:jobs(id, title, description, hr_id, hr:users!jobs_hr_id_fkey(name)),
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
        number_of_questions: interview.number_of_questions,
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

// Initialize interview session
router.post('/:roomCode/initialize', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;

    // Get interview details with job data including description
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select(`
        id,
        candidate_id,
        number_of_questions,
        invitation_id,
        job_id,
        job:jobs(id, title, description)
      `)
      .eq('room_code', roomCode)
      .single();

    if (interviewError || !interview) {
      console.error('Interview fetch error:', interviewError);
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Check if user is the candidate
    if (req.user.id !== interview.candidate_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if session already exists
    if (interviewSessions.has(roomCode)) {
      const session = interviewSessions.get(roomCode);
      return res.json({
        first_question: session.current_question,
        interview_status: session.status,
        current_question_number: session.current_question_number
      });
    }

    // Get the application through invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        application:applications(id)
      `)
      .eq('id', interview.invitation_id)
      .single();

    if (invitationError || !invitation?.application) {
      console.error('Application fetch error:', invitationError);
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get candidate resume screening
    const { data: screening, error: screeningError } = await supabase
      .from('screenings')
      .select('summary')
      .eq('application_id', invitation.application.id)
      .single();

    if (screeningError) {
      console.warn('Screening fetch error:', screeningError);
    }

    console.log('Interview data:', {
      job_id: interview.job.id,
      job_title: interview.job.title,
      has_description: !!interview.job.description,
      number_of_questions: interview.number_of_questions,
      has_screening: !!screening?.summary
    });

    console.log('Calling external API to initialize interview...');
    console.log(interview.job_id, interview.job.title, interview.number_of_questions, interview.job.description);

    // Call external API to initialize interview
    const initializeResponse = await axios.post(
      'https://cmfybfgfy6cu4o3wtd97l69c1.agent.pa.smyth.ai/api/initialize_interview',
      {
        job_title: interview.job.title,
        job_description: interview.job.description || `Job Title: ${interview.job.title}. No detailed description available.`,
        number_of_questions: interview.number_of_questions,
        candidate_resume_screening: screening?.summary || 'No screening summary available'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        // timeout: 30000
      }
    );
    console.log('External API response received');
    console.log('Initialize response data:', initializeResponse.data);
    const { first_question, all_questions, interview_status } = initializeResponse.data;

    if (!first_question) {
      return res.status(500).json({ error: 'Failed to generate interview questions' });
    }

    // Store session data
    const sessionData = {
      interview_id: interview.id,
      candidate_id: interview.candidate_id,
      job_id: interview.job.id,
      all_questions,
      current_question: first_question,
      current_question_number: 1,
      status: interview_status,
      answers: [],
      created_at: new Date()
    };
    console.log('Storing interview session:', sessionData);
    interviewSessions.set(roomCode, sessionData);

    console.log('Interview initialized successfully');

    res.json({
      first_question,
      interview_status,
      current_question_number: 1
    });

  } catch (error) {
    console.error('Initialize interview error:', error);
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ error: 'Interview initialization timeout. Please try again.' });
    }
    if (error.response) {
      console.error('External API error:', error.response.data);
      return res.status(500).json({ error: 'Failed to initialize interview with AI service' });
    }
    res.status(500).json({ error: 'Failed to initialize interview. Please try again.' });
  }
});

// Continue interview session
router.post('/:roomCode/answer', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { answer } = req.body;

    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Answer is required' });
    }

    // Get session data
    const session = interviewSessions.get(roomCode);
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found. Please refresh and try again.' });
    }

    // Check if user is the candidate
    if (req.user.id !== session.candidate_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if interview is already completed
    if (session.status === 'interview_complete') {
      return res.status(400).json({ error: 'Interview has already been completed' });
    }

    // Add current answer to session
    session.answers.push({
      question_number: session.current_question_number,
      question: session.current_question,
      answer: answer.trim(),
      timestamp: new Date()
    });

    console.log(`Processing answer ${session.current_question_number}:`, answer.trim().substring(0, 100) + '...');

    // Call external API to continue interview
    const continueResponse = await axios.post(
      'https://cmfybfgfy6cu4o3wtd97l69c1.agent.pa.smyth.ai/api/continue_interview',
      {
        candidate_answer: answer.trim(),
        current_question_number: session.current_question_number,
        all_questions: session.all_questions,
        previous_answers: session.answers.map(a => ({
          question: a.question,
          answer: a.answer
        }))
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const { next_response, interview_status, answer_evaluation } = continueResponse.data;

    // Update session
    session.status = interview_status;
    
    // Add evaluation to the last answer
    if (session.answers.length > 0) {
      session.answers[session.answers.length - 1].evaluation = answer_evaluation;
    }

    let responseData = {
      interview_status,
      answer_evaluation,
      current_question_number: session.current_question_number
    };

    if (interview_status === 'INTERVIEW_COMPLETE') {
      // Interview is finished
      responseData.completed = true;
      responseData.total_questions = session.current_question_number;
      
      // Update interview status in database
      await supabase
        .from('interviews')
        .update({ status: 'completed' })
        .eq('id', session.interview_id);

      console.log('Interview completed successfully');
        
    } else if (next_response && next_response.trim()) {
      // Continue with next question
      session.current_question_number += 1;
      session.current_question = next_response;
      
      responseData.next_question = next_response;
      responseData.current_question_number = session.current_question_number;

      console.log(`Next question ${session.current_question_number}:`, next_response.substring(0, 100) + '...');
    } else {
      // No more questions, interview complete
      session.status = 'interview_complete';
      responseData.interview_status = 'interview_complete';
      responseData.completed = true;
      responseData.total_questions = session.current_question_number;
      
      // Update interview status in database
      await supabase
        .from('interviews')
        .update({ status: 'completed' })
        .eq('id', session.interview_id);

      console.log('Interview completed (no more questions)');
    }

    // Update session in memory
    interviewSessions.set(roomCode, session);

    res.json(responseData);

  } catch (error) {
    console.error('Continue interview error:', error);
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ error: 'Request timeout. Please try again.' });
    }
    if (error.response) {
      console.error('External API error:', error.response.data);
      return res.status(500).json({ error: 'Failed to process answer with AI service' });
    }
    res.status(500).json({ error: 'Failed to process answer' });
  }
});

// Get interview session status
router.get('/:roomCode/status', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const session = interviewSessions.get(roomCode);
    
    if (!session) {
      return res.json({ initialized: false });
    }

    // Check authorization
    if (req.user.id !== session.candidate_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      initialized: true,
      status: session.status,
      current_question: session.current_question,
      current_question_number: session.current_question_number,
      total_answers: session.answers.length
    });

  } catch (error) {
    console.error('Get session status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get interview messages (keeping existing functionality)
router.get('/:roomCode/messages', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // Verify access to interview
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('id, candidate_id, job_id, job:jobs(hr_id)')
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