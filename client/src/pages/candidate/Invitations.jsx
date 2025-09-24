import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { formatDate, getStatusColor, getStatusLabel } from '../../utils/helpers';
import api from '../../utils/api';

const CandidateInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const response = await api.get('/invitations/candidate/invitations');
      setInvitations(response.data.invitations);
    } catch (err) {
      setError('Failed to load invitations');
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationAction = async (invitationId, action) => {
    setActionLoading({ ...actionLoading, [invitationId]: true });
    
    try {
      await api.post(`/invitations/candidate/invitations/${invitationId}/${action}`);
      await fetchInvitations(); // Refresh the list
    } catch (err) {
      console.error(`Error ${action} invitation:`, err);
      // You might want to show an error toast here
    } finally {
      setActionLoading({ ...actionLoading, [invitationId]: false });
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
        <h1 className="text-3xl font-bold text-gray-900">Interview Invitations</h1>
        <p className="text-gray-600 mt-2">
          Manage your interview invitations and scheduled interviews
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No invitations yet</p>
          <p className="text-gray-400">Interview invitations will appear here when employers invite you.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {invitation.application.job.title}
                  </h3>
                  <p className="text-gray-600">{invitation.application.job.location}</p>
                  <p className="text-sm text-gray-500">
                    From: {invitation.application.job.hr.name} ({invitation.application.job.hr.email})
                  </p>
                </div>
                <span className={`status-badge ${getStatusColor(invitation.status)}`}>
                  {getStatusLabel(invitation.status)}
                </span>
              </div>

              {invitation.message && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Message:</p>
                  <p className="text-gray-700">{invitation.message}</p>
                </div>
              )}

              <div className="text-sm text-gray-500 mb-4">
                Invitation sent: {formatDate(invitation.created_at)}
              </div>

              {/* Interview details if scheduled */}
              {invitation.interview && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">Interview Scheduled</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700 font-medium">Start Time</p>
                      <p className="text-blue-600">{formatDate(invitation.interview.start_at)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-medium">End Time</p>
                      <p className="text-blue-600">{formatDate(invitation.interview.end_at)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-medium">Room Code</p>
                      <p className="text-blue-600 font-mono">{invitation.interview.room_code}</p>
                    </div>
                  </div>
                  
                  {invitation.interview && (
                    <div className="mt-4">
                      <Link
                        to={`/candidate/interview/${invitation.interview.room_code}`}
                        className="btn-primary"
                      >
                        {(() => {
                          const now = new Date();
                          const startTime = new Date(invitation.interview.start_at);
                          const endTime = new Date(invitation.interview.end_at);
                          
                          if (now >= startTime && now <= endTime) {
                            return "Join Interview Now";
                          } else if (now < startTime) {
                            return "Preview Interview Room";
                          } else {
                            return "View Interview";
                          }
                        })()}
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex space-x-3">
                {invitation.status === 'sent' && (
                  <>
                    <button
                      onClick={() => handleInvitationAction(invitation.id, 'accept')}
                      disabled={actionLoading[invitation.id]}
                      className="btn-primary"
                    >
                      {actionLoading[invitation.id] ? 'Processing...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleInvitationAction(invitation.id, 'decline')}
                      disabled={actionLoading[invitation.id]}
                      className="btn-danger"
                    >
                      {actionLoading[invitation.id] ? 'Processing...' : 'Decline'}
                    </button>
                  </>
                )}
                
                {invitation.status === 'accepted' && !invitation.interview && (
                  <div className="text-sm text-gray-600">
                    ✓ Accepted - Waiting for interview to be scheduled
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidateInvitations;