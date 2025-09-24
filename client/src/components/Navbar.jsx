import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated, isHR, isCandidate } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-xl font-bold text-primary-600">CV Screener</h1>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-700">
                  Welcome, {user.name}
                </span>
                
                {isCandidate && (
                  <>
                    <Link
                      to="/candidate"
                      className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/candidate/invitations"
                      className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Invitations
                    </Link>
                    <Link
                      to="/candidate/interviews"
                      className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Interviews
                    </Link>
                  </>
                )}

                {isHR && (
                  <>
                    <Link
                      to="/hr"
                      className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/hr/jobs/new"
                      className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Create Job
                    </Link>
                    <Link
                      to="/hr/interviews"
                      className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Interviews
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;