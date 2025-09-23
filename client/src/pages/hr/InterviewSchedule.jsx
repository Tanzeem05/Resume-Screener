import React, { useState, useEffect } from 'react';
import { formatDate, formatDateTime } from '../../utils/helpers';
import api from '../../utils/api';

const HRInterviewSchedule = () => {
  const [invitations, setInvitations] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [scheduling, setScheduling] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invitationsRes, interviewsRes] = await Promise.all([
        api.get('/invitations/hr'),
        api.get('/interviews/hr')
      ]);
      
      setInvitations(invitationsRes.data);
      setInterviews(interviewsRes.data);
    } catch (err) {
      setError('Failed to load interview data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInterview = async (invitationId, scheduledDate, scheduledTime) => {
    setScheduling({ ...scheduling, [invitationId]: true });

    try {
      const datetime = new Date(`${scheduledDate}T${scheduledTime}`);
      
      await api.post(`/interviews/hr/invitations/${invitationId}/schedule`, {
        scheduled_at: datetime.toISOString()
      });
      
      alert('Interview scheduled successfully!');
      fetchData(); // Refresh data
      
    } catch (err) {
      console.error('Error scheduling interview:', err);
      alert('Failed to schedule interview. Please try again.');
    } finally {
      setScheduling({ ...scheduling, [invitationId]: false });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const pendingInvitations = invitations.filter(inv => inv.status === 'accepted');
  const scheduledInterviews = interviews.filter(interview => 
    interview.status === 'scheduled' || interview.status === 'completed'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Interview Schedule</h1>
        <p className="text-gray-600 mt-2">
          Manage interviews and schedule meetings with candidates
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Pending Schedule</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingInvitations.length}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Scheduled</h3>
          <p className="text-3xl font-bold text-blue-600">
            {scheduledInterviews.filter(i => i.status === 'scheduled').length}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Completed</h3>
          <p className="text-3xl font-bold text-green-600">
            {scheduledInterviews.filter(i => i.status === 'completed').length}
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900">Today's Interviews</h3>
          <p className="text-3xl font-bold text-purple-600">
            {scheduledInterviews.filter(i => {
              const today = new Date().toDateString();
              const interviewDate = new Date(i.scheduled_at).toDateString();
              return today === interviewDate && i.status === 'scheduled';
            }).length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Schedule ({pendingInvitations.length})
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'scheduled'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Scheduled ({scheduledInterviews.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'pending' && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Candidates Awaiting Interview Schedule
            </h2>
          </div>

          {pendingInvitations.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No pending invitations</p>
              <p className="text-gray-400">Accepted invitations will appear here for scheduling.</p>
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
                      Job
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule Interview
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingInvitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invitation.application.candidate.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {invitation.application.candidate.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {invitation.application.job.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invitation.application.job.company}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(invitation.responded_at)}
                      </td>
                      <td className="px-6 py-4">
                        <ScheduleForm 
                          invitationId={invitation.id}
                          onSchedule={handleScheduleInterview}
                          loading={scheduling[invitation.id]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scheduled' && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Scheduled Interviews</h2>
          </div>

          {scheduledInterviews.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No scheduled interviews</p>
              <p className="text-gray-400">Scheduled interviews will appear here.</p>
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
                      Job
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scheduledInterviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {interview.invitation.application.candidate.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {interview.invitation.application.candidate.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {interview.invitation.application.job.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {interview.invitation.application.job.company}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(interview.scheduled_at)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(interview.scheduled_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`status-badge ${getStatusColor(interview.status)}`}>
                          {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        {interview.status === 'scheduled' && (
                          <a
                            href={`/hr/interviews/${interview.id}`}
                            className="text-primary-600 hover:text-primary-500"
                          >
                            Join Interview
                          </a>
                        )}
                        {interview.status === 'completed' && interview.notes && (
                          <details>
                            <summary className="text-blue-600 hover:text-blue-500 cursor-pointer">
                              View Notes
                            </summary>
                            <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                              {interview.notes}
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
      )}
    </div>
  );
};

// Component for scheduling form
const ScheduleForm = ({ invitationId, onSchedule, loading }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (date && time) {
      onSchedule(invitationId, date, time);
      setDate('');
      setTime('');
    }
  };

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        min={today}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
        required
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm"
        required
      />
      <button
        type="submit"
        disabled={loading || !date || !time}
        className="px-3 py-1 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? 'Scheduling...' : 'Schedule'}
      </button>
    </form>
  );
};

export default HRInterviewSchedule;