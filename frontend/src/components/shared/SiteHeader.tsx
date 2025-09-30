import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ProfileDropdown } from './ProfileDropdown';

const linkBase =
  'text-gray-700 hover:text-primary transition-colors font-medium';
const linkActive = 'text-primary';

export const SiteHeader: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center">
            <button onClick={() => navigate('/')} className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">IL</span>
              </div>
              <h1 className="ml-3 text-xl font-bold text-gray-900">InternLink</h1>
            </button>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex space-x-8">
            <NavLink
              to="/jobs"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : ''}`
              }
            >
              Browse Jobs
            </NavLink>

            {user && user.role === 'student' && (
              <>
                <NavLink
                  to="/student/applications"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : ''}`
                  }
                >
                  My Applications
                </NavLink>
                <NavLink
                  to="/student/saved"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : ''}`
                  }
                >
                  Saved Jobs
                </NavLink>
              </>
            )}

            {user && user.role === 'employer' && (
              <>
                <NavLink
                  to="/employer/dashboard"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : ''}`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/employer/post-job"
                  className={({ isActive }) =>
                    `${linkBase} ${isActive ? linkActive : ''}`
                  }
                >
                  Post a Job
                </NavLink>
              </>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {user ? (
              <ProfileDropdown />
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
