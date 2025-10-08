import React from 'react';
import { Job } from '../../types';
import { Link } from 'react-router-dom';

interface JobCardProps {
  job: Job;
  onApply: (jobId: string) => void;
  onSave: (jobId: string) => void; // toggle save/unsave
  isSaved?: boolean;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onApply,
  onSave,
  isSaved = false,
}) => {
  const salaryText = (() => {
    const s: any = job.salary;
    if (!s) return null;
    if (typeof s === 'string') return s;
    if (typeof s === 'number') return `${s}`;
    const cur = s?.currency ? `${s.currency} ` : '';
    const min = typeof s?.min === 'number' ? s.min.toLocaleString() : null;
    const max = typeof s?.max === 'number' ? s.max.toLocaleString() : null;
    if (min && max) return `${cur}${min} - ${cur}${max}`;
    if (min) return `${cur}${min}`;
    if (max) return `${cur}${max}`;
    return null;
  })();

  return (
    <div
      className={[
        'bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow',
        isSaved ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200',
      ].join(' ')}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              <Link
                to={`/jobs/${job.id}`}
                className="hover:underline hover:text-blue-700 transition-colors"
              >
                {job.title}
              </Link>
            </h3>
            {isSaved && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Saved
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">{job.companyName}</p>
        </div>

        <button
          onClick={() => onSave(job.id)}
          className={[
            'group inline-flex items-center justify-center rounded-md p-2 transition-colors',
            isSaved ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 hover:text-blue-600',
          ].join(' ')}
          aria-pressed={isSaved}
          title={isSaved ? 'Unsave' : 'Save'}
        >
          <svg
            className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`}
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <span className="sr-only">{isSaved ? 'Unsave job' : 'Save job'}</span>
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
          </svg>
          {job.location}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {job.type}
        </div>
        {salaryText && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {salaryText}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {(job.skills || []).slice(0, 3).map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {skill}
            </span>
          ))}
          {(job.skills || []).length > 3 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              +{(job.skills || []).length - 3} more
            </span>
          )}
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{job.description}</p>

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {job.applicationCount} applicants • {job.viewCount} views
        </span>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Saved
            </span>
          )}
          <button
            onClick={() => onApply(job.id)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
};