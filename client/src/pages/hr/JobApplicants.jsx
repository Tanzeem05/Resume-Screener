import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import api from '../../utils/api';

const HRJobApplicants = () => {
  const { jobId } = useParams();
  const [jobData, setJobData] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviting, setInviting] = useState({});

  useEffect(() => {
    fetchApplicants();
  }, [jobId]);

  const fetchApplicants = async () => {
    try {
      const response = await api.get(`/jobs/hr/jobs/${jobId}/applicants`);
      setJobData(response.data.job);
      setApplications(response.data.applications);
    } catch (err) {
      setError('Failed to load applicants');
      console.error('Error fetching applicants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (applicationId) => {
    setInviting({ ...inviting, [applicationId]: true });

    try {
      await api.post(`/invitations/hr/applications/${applicationId}/invite`, {
        message: `You have been invited to interview for ${jobData.title}. Please check your invitations to accept or decline.`
      });
      
      // You might want to show a success message here
      alert('Invitation sent successfully!');
      
    } catch (err) {
      console.error('Error sending invitation:', err);
      alert('Failed to send invitation. Please try again.');
    } finally {
      setInviting({ ...inviting, [applicationId]: false });
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
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link to="/hr" className="text-primary-600 hover:text-primary-500">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Applicants for {jobData?.title}
        </h1>
        <p className="text-gray-600 mt-2">
          Review and manage applications for this position
        </p>
      </div>

      {/* Summary Stats */}
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
          <h3 className="text-lg font-medium text-gray-900">Avg. Score</h3>
          <p className="text-3xl font-bold text-purple-600">
            {applications.filter(app => app.screening?.total_score).length > 0
              ? Math.round(
                  applications
                    .filter(app => app.screening?.total_score)
                    .reduce((sum, app) => sum + app.screening.total_score, 0) /
                  applications.filter(app => app.screening?.total_score).length
                )
              : '-'}
          </p>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Applications</h2>
        </div>

        {applications.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No applications yet</p>
            <p className="text-gray-400">Applications will appear here when candidates apply.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {application.candidate.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.candidate.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`status-badge ${getStatusColor(application.status)}`}>
                        {getStatusLabel(application.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {application.screening?.total_score ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {application.screening.total_score}/10
                          </div>
                          {application.screening.recommended_level && (
                            <div className="text-xs text-gray-500">
                              {application.screening.recommended_level}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {application.screening?.years_experience
                        ? `${application.screening.years_experience} years`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(application.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <a
                        href={`/api/files/cv/${application.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-500"
                      >
                        View CV
                      </a>
                      
                      {application.status === 'screened' && (
                        <button
                          onClick={() => handleInvite(application.id)}
                          disabled={inviting[application.id]}
                          className="text-green-600 hover:text-green-500"
                        >
                          {inviting[application.id] ? 'Inviting...' : 'Invite'}
                        </button>
                      )}
                      
                      {application.screening?.summary && (
                        <details className="mt-2">
                          <summary className="text-blue-600 hover:text-blue-500 cursor-pointer">
                            View Summary
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                            <p>{application.screening.summary}</p>
                            {application.screening.skills && application.screening.skills.length > 0 && (
                              <div className="mt-2">
                                <span className="font-medium">Skills: </span>
                                {application.screening.skills.join(', ')}
                              </div>
                            )}
                            {application.screening.red_flags && application.screening.red_flags.length > 0 && (
                              <div className="mt-2">
                                <span className="font-medium text-red-600">Red Flags: </span>
                                {application.screening.red_flags.join(', ')}
                              </div>
                            )}
                          </div>
                        </details>
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

export default HRJobApplicants;