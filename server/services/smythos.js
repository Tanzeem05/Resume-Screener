const axios = require('axios');
const { supabase } = require('../config/supabase');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// SmythOS configuration
const SMYTHOS_CONFIG = {
  screenAgentUrl: process.env.SMYTHOS_SCREEN_AGENT_URL,
  cvAgentId: process.env.SMYTHOS_CV_AGENT_ID,
  interviewAgentId: process.env.SMYTHOS_INTERVIEW_AGENT_ID,
  apiKey: process.env.SMYTHOS_API_KEY
};

// Check if SmythOS is configured
const isSmythOSConfigured = () => {
  return !!(SMYTHOS_CONFIG.screenAgentUrl);
};

// CV Screening function
async function screenCv({
  filePath,          // REQUIRED with diskStorage
  fileName,          // optional, improves filename sent
  mimeType,          // optional, improves content-type
  candidate,         // { id, name, email }
  job,               // { id, description }
  recruiterEmail,    // string | null
  applicationId      // number | string
}) {
  let screeningResult;

  if (isSmythOSConfigured()) {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('CV file path not found on disk.');
      }

      const form = new FormData();

      // Required text fields for SmythOS
      form.append('job_id', String(job.id));
      form.append('email', candidate.email);
      form.append('name', candidate.name);
      form.append('recruiter_email', recruiterEmail || '');
      form.append('job_description', job.description || '');
    //   form.append('application_id', String(applicationId));

      // File field (change 'resume' to 'cv' if your SmythOS expects that exact field name)
      form.append('resume', fs.createReadStream(filePath), {
        filename: fileName || path.basename(filePath),
        contentType: mimeType || 'application/octet-stream'
      });
      console.log('Submitting CV to SmythOS with fields:');
      const response = await axios.post(
        `${SMYTHOS_CONFIG.screenAgentUrl}/api/screen_resume`,
        form,
        {
          headers: {
            ...form.getHeaders()
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        //   timeout: 60_000
        }
      );
      console.log('SmythOS CV screening response:', response.data);
      screeningResult = response.data;
      console.log('SmythOS CV screening response:', screeningResult);
    } catch (error) {
      console.error('SmythOS CV screening API error:', error?.response?.data || error.message);
      screeningResult = generateMockScreening(candidate, job);
    }
  } else {
    console.log('SmythOS not configured, using mock CV screening');
    screeningResult = generateMockScreening(candidate, job);
  }

  // Persist screening results (unchanged)
  try {
    const { error } = await supabase
      .from('screenings')
      .insert([{
        total_score: screeningResult.status.fit_score || 0,
        years_experience: screeningResult.status.experience_years || 0,
        education: screeningResult.status.education_match,
        skills: screeningResult.status.skills_match || [],
        red_flags: screeningResult.status.missing_skills || [],
        summary: screeningResult.status.summary,
        raw_json: screeningResult.status || screeningResult,
        application_id: applicationId
      }]);

    if (error) {
      console.error('Failed to store screening results:', error);
    } else {
      await supabase
        .from('applications')
        .update({ status: 'screened' })
        .eq('id', applicationId);
    }
  } catch (dbError) {
    console.error('Database error during screening storage:', dbError);
  }

  return screeningResult;
}

// Interview Agent function
async function interviewAgentReply({ roomCode, history, message }) {
  if (isSmythOSConfigured()) {
    try {
      // Call actual SmythOS API
      const response = await axios.post(
        `${SMYTHOS_CONFIG.apiUrl}/agents/${SMYTHOS_CONFIG.interviewAgentId}/run`,
        {
          roomCode,
          history,
          message
        },
        {
          headers: {
            'Authorization': `Bearer ${SMYTHOS_CONFIG.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        }
      );

      return response.data.message || response.data.reply;
    } catch (error) {
      console.error('SmythOS interview API error:', error.message);
      // Fall back to mock
      return generateMockInterviewReply(message);
    }
  } else {
    console.log('SmythOS not configured, using mock interview agent');
    return generateMockInterviewReply(message);
  }
}

// Mock CV screening generator
function generateMockScreening(candidate, job) {
  const skills = ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'CSS', 'HTML'];
  const randomSkills = skills.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 4) + 2);
  
  const score = Math.floor(Math.random() * 40) + 60; // Score between 60-100
  const experience = Math.floor(Math.random() * 8) + 1; // 1-8 years
  
  const levels = ['Junior', 'Junior+', 'Mid-level', 'Senior'];
  const level = levels[Math.floor(experience / 2)];
  
  const redFlags = [];
  if (Math.random() > 0.7) {
    redFlags.push('Gap in employment history');
  }
  if (Math.random() > 0.8) {
    redFlags.push('Frequent job changes');
  }

  return {
    total_score: score,
    years_experience: experience,
    education: 'BSc Computer Science',
    skills: randomSkills,
    red_flags: redFlags,
    recommended_level: level,
    summary: `${candidate.name} appears to be a good fit for ${job.title}. They have ${experience} years of experience and demonstrate strong technical skills in ${randomSkills.slice(0, 2).join(' and ')}.`,
    raw: {
      mock: true,
      timestamp: new Date().toISOString(),
      candidate_id: candidate.id,
      job_id: job.id
    }
  };
}

// Mock interview reply generator
function generateMockInterviewReply(message) {
  const responses = [
    `That's an interesting point about "${message.slice(0, 30)}...". Can you tell me more about your experience with this?`,
    `Thank you for sharing that. Based on what you've said, I'd like to understand your approach to problem-solving. Can you walk me through a challenging situation you've faced?`,
    `I see. How do you think this experience has prepared you for the role we're discussing today?`,
    `That's valuable insight. What would you say is your greatest strength in this area?`,
    `Excellent. Now, let's talk about your long-term career goals. Where do you see yourself in the next few years?`,
    `Thank you for that detailed explanation. Do you have any questions about the role or our company culture?`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// Export functions
module.exports = {
  screenCv,
  interviewAgentReply,
  isSmythOSConfigured
};