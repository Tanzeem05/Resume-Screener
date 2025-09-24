import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CandidateDashboard from './pages/candidate/Dashboard';
import CandidateApply from './pages/candidate/Apply';
import CandidateInvitations from './pages/candidate/Invitations';
import CandidateInterviews from './pages/candidate/Interviews';
import CandidateInterview from './pages/candidate/Interview';
import HRDashboard from './pages/hr/Dashboard';
import HRJobCreate from './pages/hr/JobCreate';
import HRJobApplicants from './pages/hr/JobApplicants';
import HRInterviewSchedule from './pages/hr/InterviewSchedule';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Candidate routes */}
              <Route path="/candidate" element={
                <ProtectedRoute role="candidate">
                  <CandidateDashboard />
                </ProtectedRoute>
              } />
              <Route path="/candidate/apply/:jobId" element={
                <ProtectedRoute role="candidate">
                  <CandidateApply />
                </ProtectedRoute>
              } />
              <Route path="/candidate/invitations" element={
                <ProtectedRoute role="candidate">
                  <CandidateInvitations />
                </ProtectedRoute>
              } />
              <Route path="/candidate/interviews" element={
                <ProtectedRoute role="candidate">
                  <CandidateInterviews />
                </ProtectedRoute>
              } />
              <Route path="/candidate/interview/:roomCode" element={
                <ProtectedRoute role="candidate">
                  <CandidateInterview />
                </ProtectedRoute>
              } />
              
              {/* HR routes */}
              <Route path="/hr" element={
                <ProtectedRoute role="hr">
                  <HRDashboard />
                </ProtectedRoute>
              } />
              <Route path="/hr/jobs/new" element={
                <ProtectedRoute role="hr">
                  <HRJobCreate />
                </ProtectedRoute>
              } />
              <Route path="/hr/jobs/:jobId/applicants" element={
                <ProtectedRoute role="hr">
                  <HRJobApplicants />
                </ProtectedRoute>
              } />
              <Route path="/hr/interviews/:jobId/schedule/:applicationId" element={
                <ProtectedRoute role="hr">
                  <HRInterviewSchedule />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;