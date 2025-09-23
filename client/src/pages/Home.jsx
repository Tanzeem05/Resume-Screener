import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import JobCard from '../components/JobCard';
import api from '../utils/api';

const Home = () => {
  const { isAuthenticated, isCandidate } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs?active=1');
      setJobs(response.data.jobs);
    } catch (err) {
      setError('Failed to load jobs');
      console.error('Error fetching jobs:', err);
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
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Find Your Dream Job
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Discover exciting career opportunities with our AI-powered CV screening 
          and interview platform. Connect with top employers and advance your career.
        </p>
      </div>

      {/* Jobs Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Available Positions
          </h2>
          <span className="text-gray-600">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} available
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No jobs available at the moment.</p>
            <p className="text-gray-400">Check back later for new opportunities!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                showApplyButton={isAuthenticated && isCandidate}
              />
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      {!isAuthenticated && (
        <div className="bg-primary-50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-semibold text-primary-900 mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-primary-700 mb-6">
            Join our platform to apply for jobs and get discovered by top employers.
          </p>
          <div className="space-x-4">
            <a href="/register" className="btn-primary">
              Sign Up as Candidate
            </a>
            <a href="/register" className="btn-secondary">
              Post Jobs as HR
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;