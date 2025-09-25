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

    const { 
      next_response, 
      interview_status, 
      answer_evaluation,
      score,
      rating,
      overall_summary 
    } = continueResponse.data;

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

    console.log('Interview status received:', interview_status);
    const statusUpper = interview_status ? interview_status.toUpperCase() : '';
    
    if (statusUpper === 'INTERVIEW_COMPLETE') {
      // Interview is finished
      responseData.completed = true;
      responseData.total_questions = session.current_question_number;
      responseData.score = score;
      responseData.rating = rating;
      responseData.overall_summary = overall_summary;
      
      try {
        // Update interview status in database
        await supabase
          .from('interviews')
          .update({ status: 'completed' })
          .eq('id', session.interview_id);

        // Insert interview summary into summary table
        const { error: summaryError } = await supabase
          .from('summary')
          .insert({
            interview_id: session.interview_id,
            score: score || null,
            rating: rating || null,
            overall_summary: overall_summary || null,
            created_at: new Date().toISOString()
          });

        if (summaryError) {
          console.error('Error inserting interview summary:', summaryError);
          // Don't fail the request, just log the error
        } else {
          console.log('Interview summary saved successfully');
        }

      } catch (dbError) {
        console.error('Database operation error:', dbError);
        // Don't fail the request, just log the error
      }

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
      
      try {
        // Update interview status in database
        await supabase
          .from('interviews')
          .update({ status: 'completed' })
          .eq('id', session.interview_id);

        // Insert interview summary (fallback case without external API data)
        const { error: summaryError } = await supabase
          .from('summary')
          .insert({
            interview_id: session.interview_id,
            score: null,
            rating: null,
            overall_summary: 'Interview completed without final evaluation',
            created_at: new Date().toISOString()
          });

        if (summaryError) {
          console.error('Error inserting fallback interview summary:', summaryError);
        } else {
          console.log('Fallback interview summary saved');
        }

      } catch (dbError) {
        console.error('Database operation error (fallback):', dbError);
      }

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

// Get all interview summaries for HR
router.get('/hr/summaries', authenticateToken, requireRole(['hr']), async (req, res) => {
  try {
    const hrId = req.user.id;

    // Get all interview summaries for jobs owned by this HR
    const { data: summaries, error } = await supabase
      .from('summary')
      .select(`
        id,
        interview_id,
        score,
        rating,
        overall_summary,
        created_at,
        interview:interviews(
          id,
          start_at,
          end_at,
          status,
          candidate_id,
          job_id,
          candidate:users!interviews_candidate_id_fkey(
            id,
            name,
            email
          ),
          job:jobs(
            id,
            title,
            hr_id
          )
        )
      `)
      .eq('interview.job.hr_id', hrId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch interview summaries' });
    }

    // Filter out any null interviews (in case of data inconsistency)
    const validSummaries = summaries.filter(summary => summary.interview && summary.interview.job);

    // Transform the data for frontend consumption
    const transformedData = validSummaries.map(summary => ({
      id: summary.id,
      interview_id: summary.interview_id,
      candidateName: summary.interview.candidate.name,
      candidateEmail: summary.interview.candidate.email,
      jobTitle: summary.interview.job.title,
      scheduledAt: summary.interview.start_at,
      completedAt: summary.created_at,
      status: 'completed', // All summaries are for completed interviews
      score: summary.score,
      rating: summary.rating,
      overall_summary: summary.overall_summary,
      created_at: summary.created_at
    }));

    res.json({
      summaries: transformedData,
      total: transformedData.length
    });

  } catch (error) {
    console.error('Get HR interview summaries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alternative route if the nested query doesn't work properly
router.get('/hr/summaries-alt', authenticateToken, requireRole(['hr']), async (req, res) => {
  try {
    const hrId = req.user.id;

    // First get all interviews for jobs owned by this HR
    const { data: interviews, error: interviewsError } = await supabase
      .from('interviews')
      .select(`
        id,
        start_at,
        end_at,
        status,
        candidate_id,
        job_id,
        candidate:users!interviews_candidate_id_fkey(id, name, email),
        job:jobs!interviews_job_id_fkey(id, title)
      `)
      .eq('job.hr_id', hrId)
      .eq('status', 'completed');

    if (interviewsError) {
      console.error('Interviews fetch error:', interviewsError);
      return res.status(500).json({ error: 'Failed to fetch interviews' });
    }

    if (!interviews || interviews.length === 0) {
      return res.json({ summaries: [], total: 0 });
    }

    // Get interview IDs
    const interviewIds = interviews.map(interview => interview.id);

    // Get summaries for these interviews
    const { data: summaries, error: summariesError } = await supabase
      .from('summary')
      .select('*')
      .in('interview_id', interviewIds)
      .order('created_at', { ascending: false });

    if (summariesError) {
      console.error('Summaries fetch error:', summariesError);
      return res.status(500).json({ error: 'Failed to fetch summaries' });
    }

    // Combine interview and summary data
    const transformedData = summaries.map(summary => {
      const interview = interviews.find(i => i.id === summary.interview_id);
      return {
        id: summary.id,
        interview_id: summary.interview_id,
        candidateName: interview.candidate.name,
        candidateEmail: interview.candidate.email,
        jobTitle: interview.job.title,
        scheduledAt: interview.start_at,
        completedAt: summary.created_at,
        status: 'completed',
        score: summary.score,
        rating: summary.rating,
        overall_summary: summary.overall_summary,
        created_at: summary.created_at
      };
    });

    res.json({
      summaries: transformedData,
      total: transformedData.length
    });

  } catch (error) {
    console.error('Get HR interview summaries error (alt):', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;