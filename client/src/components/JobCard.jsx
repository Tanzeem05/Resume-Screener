import React from 'react';
import { Link } from 'react-router-dom';
import { formatSalary, formatDate } from '../utils/helpers';

const JobCard = ({ job, showApplyButton = false }) => {
  return (
    <div className="card p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
        {job.hr && (
          <span className="text-sm text-gray-500">by {job.hr.name}</span>
        )}
      </div>
      
      <p className="text-gray-600 mb-4 line-clamp-3">{job.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {job.tags && job.tags.map((tag, index) => (
          <span key={index} className="tag">
            {tag}
          </span>
        ))}
      </div>
      
      <div className="space-y-2 mb-4">
        {job.location && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Location:</span> {job.location}
          </p>
        )}
        <p className="text-sm text-gray-600">
          <span className="font-medium">Salary:</span> {formatSalary(job.salary_min, job.salary_max)}
        </p>
        {job.deadline && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Deadline:</span> {formatDate(job.deadline)}
          </p>
        )}
      </div>
      
      {showApplyButton && (
        <Link
          to={`/candidate/apply/${job.id}`}
          className="btn-primary w-full text-center"
        >
          Apply Now
        </Link>
      )}
    </div>
  );
};

export default JobCard;