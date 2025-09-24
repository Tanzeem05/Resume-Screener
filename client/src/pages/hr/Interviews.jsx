import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const HRInterviews = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, completed, in-progress

  // Mock data for now - replace with API call later
  const mockInterviews = [
    {
      id: 1,
      candidateName: 'John Smith',
      candidateEmail: 'john.smith@email.com',
      jobTitle: 'Senior Frontend Developer',
      scheduledAt: '2025-09-20T10:00:00Z',
      completedAt: '2025-09-20T11:30:00Z',
      status: 'completed',
      score: 85,
      overallRating: 'Excellent',
      technicalScore: 88,
      communicationScore: 82,
      problemSolvingScore: 87,
      notes: 'Strong technical skills, excellent communication. Recommended for hire.',
      interviewDuration: 90 // minutes
    },
    {
      id: 2,
      candidateName: 'Sarah Johnson',
      candidateEmail: 'sarah.johnson@email.com',
      jobTitle: 'Full Stack Developer',
      scheduledAt: '2025-09-19T14:00:00Z',
      completedAt: '2025-09-19T15:15:00Z',
      status: 'completed',
      score: 78,
      overallRating: 'Good',
      technicalScore: 80,
      communicationScore: 75,
      problemSolvingScore: 79,
      notes: 'Good technical foundation, needs improvement in system design concepts.',
      interviewDuration: 75
    },
    {
      id: 3,
      candidateName: 'Michael Brown',
      candidateEmail: 'michael.brown@email.com',
      jobTitle: 'Backend Developer',
      scheduledAt: '2025-09-18T09:00:00Z',
      completedAt: '2025-09-18T10:45:00Z',
      status: 'completed',
      score: 92,
      overallRating: 'Outstanding',
      technicalScore: 95,
      communicationScore: 88,
      problemSolvingScore: 93,
      notes: 'Exceptional candidate with deep understanding of backend technologies. Strong hire.',
      interviewDuration: 105
    },
    {
      id: 4,
      candidateName: 'Emily Davis',
      candidateEmail: 'emily.davis@email.com',
      jobTitle: 'Frontend Developer',
      scheduledAt: '2025-09-17T16:00:00Z',
      completedAt: null,
      status: 'in-progress',
      score: null,
      overallRating: null,
      technicalScore: null,
      communicationScore: null,
      problemSolvingScore: null,
      notes: 'Interview scheduled for today.',
      interviewDuration: null
    },
    {
      id: 5,
      candidateName: 'David Wilson',
      candidateEmail: 'david.wilson@email.com',
      jobTitle: 'DevOps Engineer',
      scheduledAt: '2025-09-16T11:00:00Z',
      completedAt: '2025-09-16T12:30:00Z',
      status: 'completed',
      score: 71,
      overallRating: 'Average',
      technicalScore: 70,
      communicationScore: 72,
      problemSolvingScore: 71,
      notes: 'Decent technical skills but lacks experience with cloud platforms.',
      interviewDuration: 90
    }
  ];

  useEffect(() => {
    // For now, use mock data
    setInterviews(mockInterviews);
    setLoading(false);

    // TODO: Replace with actual API call
    // fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/interviews/hr');
      setInterviews(response.data);
    } catch (err) {
      setError('Failed to load interviews');
      console.error('Error fetching interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    if (filter === 'completed') return interview.status === 'completed';
    if (filter === 'in-progress') return interview.status === 'in-progress';
    return true; // 'all'
  });

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Outstanding': return 'text-green-600 bg-green-100';
      case 'Excellent': return 'text-blue-600 bg-blue-100';
      case 'Good': return 'text-yellow-600 bg-yellow-100';
      case 'Average': return 'text-orange-600 bg-orange-100';
      case 'Below Average': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchInterviews}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Management</h1>
        <p className="text-gray-600">Track and review completed interviews with candidate scores</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All Interviews', count: interviews.length },
            { key: 'completed', label: 'Completed', count: interviews.filter(i => i.status === 'completed').length },
            { key: 'in-progress', label: 'In Progress', count: interviews.filter(i => i.status === 'in-progress').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                filter === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-primary-600">
            {interviews.filter(i => i.status === 'completed').length}
          </div>
          <div className="text-gray-600">Completed Interviews</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">
            {interviews.filter(i => i.score >= 80).length}
          </div>
          <div className="text-gray-600">High Scorers (80+)</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">
            {interviews.filter(i => i.score).length > 0 
              ? Math.round(interviews.filter(i => i.score).reduce((sum, i) => sum + i.score, 0) / interviews.filter(i => i.score).length)
              : 0}
          </div>
          <div className="text-gray-600">Average Score</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-orange-600">
            {interviews.filter(i => i.status === 'in-progress').length}
          </div>
          <div className="text-gray-600">In Progress</div>
        </div>
      </div>

      {/* Interviews List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Interview Results</h2>
        </div>
        
        {filteredInterviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No interviews found for the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interview Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overall Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInterviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {interview.candidateName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {interview.candidateEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {interview.jobTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(interview.scheduledAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        interview.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {interview.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.score ? (
                        <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getScoreColor(interview.score)}`}>
                          {interview.score}/100
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.overallRating ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRatingColor(interview.overallRating)}`}>
                          {interview.overallRating}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {interview.interviewDuration ? `${interview.interviewDuration} min` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          // TODO: Implement view details functionality
                          alert(`View details for ${interview.candidateName}`);
                        }}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        View Details
                      </button>
                      {interview.status === 'completed' && (
                        <button
                          onClick={() => {
                            // TODO: Implement download report functionality
                            alert(`Download report for ${interview.candidateName}`);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          Download Report
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Score Breakdown Modal would go here */}
      {/* For now, we'll show score breakdown in a separate section if needed */}
      
    </div>
  );
};

export default HRInterviews;