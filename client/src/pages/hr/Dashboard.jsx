import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';
import api from '../../utils/api';

const HRDashboard = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs/hr/my-jobs');
      setJobs(response.data.jobs);
    } catch (err) {
      setError('Failed to load jobs');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleJobStatus = async (jobId, currentStatus) => {
    try {
      await api.patch(`/jobs/hr/jobs/${jobId}`, {
        is_active: !currentStatus
      });
      await fetchJobs(); // Refresh the list
    } catch (err) {
      console.error('Error updating job status:', err);
      // You might want to show an error toast here
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const totalApplications = jobs.reduce((sum, job) => sum + (job.applications?.[0]?.count || 0), 0);
  const activeJobs = jobs.filter(job => job.is_active).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user.name}!
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your job postings and review applications
            </p>
          </div>
          <Link to="/hr/jobs/new" className="btn-primary">
            Create New Job
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Total Jobs</h3>
          <p className="text-3xl font-bold text-primary-600">{jobs.length}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Active Jobs</h3>
          <p className="text-3xl font-bold text-green-600">{activeJobs}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Total Applications</h3>
          <p className="text-3xl font-bold text-blue-600">{totalApplications}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Avg. per Job</h3>
          <p className="text-3xl font-bold text-purple-600">
            {jobs.length > 0 ? Math.round(totalApplications / jobs.length) : 0}
          </p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Job Postings</h2>
        </div>
        
        {error && (
          <div className="p-6 bg-red-50 border-b border-red-200 text-red-700">
            {error}
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No jobs posted yet</p>
            <Link to="/hr/jobs/new" className="btn-primary">
              Create Your First Job
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {job.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {job.location}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/hr/jobs/${job.id}/applicants`}
                        className="text-primary-600 hover:text-primary-500 font-medium"
                      >
                        {job.applications?.[0]?.count || 0} applications
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`status-badge ${job.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {job.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <Link
                        to={`/hr/jobs/${job.id}/applicants`}
                        className="text-primary-600 hover:text-primary-500"
                      >
                        View Applicants
                      </Link>
                      <button
                        onClick={() => toggleJobStatus(job.id, job.is_active)}
                        className="text-gray-600 hover:text-gray-500"
                      >
                        {job.is_active ? 'Deactivate' : 'Activate'}
                      </button>
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

export default HRDashboard;