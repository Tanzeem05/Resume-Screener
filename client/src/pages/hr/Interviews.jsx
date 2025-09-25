import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const HRInterviews = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, high-score, average-score, low-score

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try the main endpoint first, fallback to alternative if needed
      let response;
      try {
        response = await api.get('/interviews/hr/summaries');
      } catch (primaryError) {
        console.warn('Primary endpoint failed, trying alternative:', primaryError);
        response = await api.get('/interviews/hr/summaries-alt');
      }

      setInterviews(response.data.summaries || []);
    } catch (err) {
      console.error('Error fetching interviews:', err);
      setError(err.response?.data?.error || 'Failed to load interview summaries');
    } finally {
      setLoading(false);
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    if (filter === 'high-score') return interview.score >= 80;
    if (filter === 'average-score') return interview.score >= 60 && interview.score < 80;
    if (filter === 'low-score') return interview.score < 60;
    return true; // 'all'
  });

  const getScoreColor = (score) => {
    if (!score) return 'text-gray-400';
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-blue-600 bg-blue-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRatingColor = (rating) => {
    if (!rating) return 'text-gray-400';
    switch (rating.toLowerCase()) {
      case 'outstanding': return 'text-green-600 bg-green-100';
      case 'excellent': return 'text-blue-600 bg-blue-100';
      case 'good': return 'text-yellow-600 bg-yellow-100';
      case 'average': return 'text-orange-600 bg-orange-100';
      case 'below average': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
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
          <p className="text-gray-600">Loading interview summaries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
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

  const highScorers = interviews.filter(i => i.score >= 80).length;
  const averageScore = interviews.length > 0
    ? Math.round(interviews.reduce((sum, i) => sum + (i.score || 0), 0) / interviews.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Summaries</h1>
        <p className="text-gray-600">Review completed interviews with candidate scores and feedback</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            {
              key: 'all',
              label: 'All Interviews',
              count: interviews.length
            },
            {
              key: 'high-score',
              label: 'High Score (80+)',
              count: interviews.filter(i => i.score >= 80).length
            },
            {
              key: 'average-score',
              label: 'Average (60-79)',
              count: interviews.filter(i => i.score >= 60 && i.score < 80).length
            },
            {
              key: 'low-score',
              label: 'Low Score (<60)',
              count: interviews.filter(i => i.score < 60).length
            }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${filter === tab.key
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-primary-600">
            {interviews.length}
          </div>
          <div className="text-gray-600">Total Interviews</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">
            {highScorers}
          </div>
          <div className="text-gray-600">High Scorers (80+)</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">
            {averageScore}
          </div>
          <div className="text-gray-600">Average Score</div>
        </div>
      </div>

      {/* Interviews List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Interview Results</h2>
        </div>

        {filteredInterviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500">No interview summaries found for the selected filter.</p>
            {interviews.length === 0 && (
              <p className="text-gray-400 mt-2">Complete some interviews to see summaries here.</p>
            )}
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
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Summary
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
                      {interview.score !== null ? (
                        <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getScoreColor(interview.score)}`}>
                          {interview.score}/100
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.rating ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRatingColor(interview.rating)}`}>
                          {interview.rating}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        {interview.overall_summary ? (
                          <p className="text-sm text-gray-900 line-clamp-3">
                            {interview.overall_summary}
                          </p>
                        ) : (
                          <span className="text-gray-400">No summary available</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRInterviews;