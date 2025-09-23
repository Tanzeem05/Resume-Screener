import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import api from '../../utils/api';

const CandidateDashboard = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/candidate/applications');
      setApplications(response.data.applications);
    } catch (err) {
      setError('Failed to load applications');
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Track your job applications and interview invitations
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Total Applications</h3>
          <p className="text-3xl font-bold text-primary-600">{applications.length}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Screened</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {applications.filter(app => app.status === 'screened').length}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Shortlisted</h3>
          <p className="text-3xl font-bold text-green-600">
            {applications.filter(app => app.status === 'shortlisted').length}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Declined</h3>
          <p className="text-3xl font-bold text-red-600">
            {applications.filter(app => app.status === 'declined').length}
          </p>
        </div>
      </div>

      {/* Applications List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Applications</h2>
        </div>
        
        {error && (
          <div className="p-6 bg-red-50 border-b border-red-200 text-red-700">
            {error}
          </div>
        )}

        {applications.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No applications yet</p>
            <Link to="/" className="btn-primary">
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {application.job.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.job.location}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`status-badge ${getStatusColor(application.status)}`}>
                        {getStatusLabel(application.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(application.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {application.screening?.total_score ? (
                        <div>
                          <span className="font-medium">{application.screening.total_score}/10</span>
                          {application.screening.recommended_level && (
                            <div className="text-xs text-gray-400">
                              {application.screening.recommended_level}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
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

export default CandidateDashboard;