import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTime, getStatusColor } from '../../utils/helpers';
import api from '../../utils/api';

const CandidateInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await api.get('/invitations/candidate/interviews');
      setInterviews(response.data.interviews);
    } catch (err) {
      setError('Failed to load interviews');
      console.error('Error fetching interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeStatusBadge = (timeStatus) => {
    switch (timeStatus) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'past':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeStatusLabel = (timeStatus) => {
    switch (timeStatus) {
      case 'active':
        return 'Live Now';
      case 'upcoming':
        return 'Upcoming';
      case 'past':
        return 'Completed';
      default:
        return timeStatus;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Interviews</h1>
        <p className="text-gray-600 mt-2">
          View and join your scheduled interviews
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {interviews.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10m4-10v10m-4-4h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews scheduled</h3>
          <p className="text-gray-500">Your interview schedule will appear here once invitations are accepted and scheduled.</p>
          <Link
            to="/candidate/invitations"
            className="inline-block mt-4 btn-primary"
          >
            Check Invitations
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {interviews.map((interview) => (
            <div key={interview.id} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {interview.job.title}
                    </h3>
                    <span className={`status-badge ${getTimeStatusBadge(interview.time_status)}`}>
                      {getTimeStatusLabel(interview.time_status)}
                    </span>
                    <span className={`status-badge ${getStatusColor(interview.status)}`}>
                      {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600">{interview.job.location}</p>
                  <p className="text-sm text-gray-500">
                    Interviewer: {interview.job.hr.name} ({interview.job.hr.email})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">Room Code</p>
                  <p className="text-lg font-mono text-primary-600">{interview.room_code}</p>
                </div>
              </div>

              {/* Interview Schedule */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Interview Schedule</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-700 font-medium">Start Time</p>
                    <p className="text-gray-600">{formatDateTime(interview.start_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-700 font-medium">End Time</p>
                    <p className="text-gray-600">{formatDateTime(interview.end_at)}</p>
                  </div>
                </div>
              </div>

              {/* Interview Message */}
              {interview.invitation?.message && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">Message from HR</h4>
                  <p className="text-blue-700">{interview.invitation.message}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                {interview.time_status === 'active' && interview.status === 'scheduled' && (
                  <Link
                    to={`/candidate/interview/${interview.room_code}`}
                    className="btn-primary"
                  >
                    Join Interview Now
                  </Link>
                )}
                
                {interview.time_status === 'upcoming' && interview.status === 'scheduled' && (
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/candidate/interview/${interview.room_code}`}
                      className="btn-secondary"
                    >
                      Preview Interview Room
                    </Link>
                    <span className="text-sm text-gray-500">
                      {(() => {
                        const now = new Date();
                        const start = new Date(interview.start_at);
                        const diffInMinutes = Math.floor((start - now) / (1000 * 60));
                        const diffInHours = Math.floor(diffInMinutes / 60);
                        const diffInDays = Math.floor(diffInHours / 24);
                        
                        if (diffInDays > 0) {
                          return `Starts in ${diffInDays} day${diffInDays > 1 ? 's' : ''}`;
                        } else if (diffInHours > 0) {
                          return `Starts in ${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
                        } else {
                          return `Starts in ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
                        }
                      })()}
                    </span>
                  </div>
                )}
                
                {interview.time_status === 'past' && (
                  <span className="text-sm text-gray-500">Interview completed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidateInterviews;