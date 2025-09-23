import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChatInterface from '../../components/ChatInterface';
import api from '../../utils/api';

const HRInterview = () => {
  const { interviewId } = useParams();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchInterview();
  }, [interviewId]);

  const fetchInterview = async () => {
    try {
      const response = await api.get(`/interviews/hr/${interviewId}`);
      setInterview(response.data);
      setNotes(response.data.notes || '');
    } catch (err) {
      setError('Failed to load interview details');
      console.error('Error fetching interview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.put(`/interviews/hr/${interviewId}/notes`, { notes });
      alert('Notes saved successfully!');
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Failed to save notes. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCompleteInterview = async () => {
    if (window.confirm('Are you sure you want to mark this interview as completed?')) {
      try {
        await api.put(`/interviews/hr/${interviewId}/complete`);
        setInterview({ ...interview, status: 'completed' });
        alert('Interview marked as completed!');
      } catch (err) {
        console.error('Error completing interview:', err);
        alert('Failed to complete interview. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Interview Header */}
      <div className="card p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Interview: {interview.invitation.application.job.title}
            </h1>
            <div className="space-y-1 text-gray-600">
              <p>
                <span className="font-medium">Candidate:</span>{' '}
                {interview.invitation.application.candidate.name}
              </p>
              <p>
                <span className="font-medium">Email:</span>{' '}
                {interview.invitation.application.candidate.email}
              </p>
              <p>
                <span className="font-medium">Scheduled:</span>{' '}
                {new Date(interview.scheduled_at).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">Status:</span>{' '}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  interview.status === 'scheduled' 
                    ? 'bg-blue-100 text-blue-800'
                    : interview.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <a
              href={`/api/files/cv/${interview.invitation.application.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              View CV
            </a>
            
            {interview.status === 'scheduled' && (
              <button
                onClick={handleCompleteInterview}
                className="btn btn-primary"
              >
                Complete Interview
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Interview Chat</h2>
            </div>
            <div className="h-96">
              <ChatInterface interviewId={interviewId} userType="hr" />
            </div>
          </div>
        </div>

        {/* Notes Panel */}
        <div className="space-y-6">
          {/* Candidate Summary */}
          {interview.invitation.application.screening && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidate Summary</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Score:</span>{' '}
                  {interview.invitation.application.screening.total_score}/100
                </div>
                
                {interview.invitation.application.screening.recommended_level && (
                  <div>
                    <span className="font-medium">Level:</span>{' '}
                    {interview.invitation.application.screening.recommended_level}
                  </div>
                )}
                
                {interview.invitation.application.screening.years_experience && (
                  <div>
                    <span className="font-medium">Experience:</span>{' '}
                    {interview.invitation.application.screening.years_experience} years
                  </div>
                )}
                
                {interview.invitation.application.screening.skills && (
                  <div>
                    <span className="font-medium">Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {interview.invitation.application.screening.skills.map((skill, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {interview.invitation.application.screening.summary && (
                  <div>
                    <span className="font-medium">AI Summary:</span>
                    <p className="text-sm text-gray-600 mt-1">
                      {interview.invitation.application.screening.summary}
                    </p>
                  </div>
                )}
                
                {interview.invitation.application.screening.red_flags && 
                 interview.invitation.application.screening.red_flags.length > 0 && (
                  <div>
                    <span className="font-medium text-red-600">Red Flags:</span>
                    <ul className="text-sm text-red-600 mt-1 list-disc list-inside">
                      {interview.invitation.application.screening.red_flags.map((flag, index) => (
                        <li key={index}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interview Notes */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes about the interview here..."
              className="w-full h-40 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="mt-3 btn btn-primary w-full"
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>

          {/* Job Details */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Company:</span>{' '}
                {interview.invitation.application.job.company}
              </div>
              <div>
                <span className="font-medium">Location:</span>{' '}
                {interview.invitation.application.job.location}
              </div>
              <div>
                <span className="font-medium">Salary:</span>{' '}
                ${interview.invitation.application.job.salary_min?.toLocaleString()} - 
                ${interview.invitation.application.job.salary_max?.toLocaleString()}
              </div>
              <div>
                <span className="font-medium">Posted:</span>{' '}
                {new Date(interview.invitation.application.job.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRInterview;