import React, { useState } from 'react';
import { setupEmulatorTestData } from '../utils/setupEmulatorData';
import { useNavigate } from 'react-router-dom';

export const SetupTestData: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await setupEmulatorTestData();
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError('Failed to setup test data');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Setup Test Data</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ This page is for development only. It will create test users and data in your Firebase Emulator.
          </p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
            <p className="text-sm text-green-800">
              ✅ Test data created successfully! Redirecting to login...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
            <p className="text-sm text-red-800">
              ❌ Error: {error}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 rounded p-4">
            <h3 className="font-semibold mb-2">Test accounts that will be created:</h3>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Admin: admin@interlink.com / Admin@123</li>
              <li>• Student 1: student1@test.com / Test@123</li>
              <li>• Student 2: student2@test.com / Test@123</li>
              <li>• Employer 1: employer1@company.com / Test@123</li>
              <li>• Employer 2: employer2@company.com / Test@123</li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded p-4">
            <h3 className="font-semibold mb-2">Sample data:</h3>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• 3 job postings</li>
              <li>• 2 job applications</li>
              <li>• Company profiles</li>
            </ul>
          </div>

          <button
            onClick={handleSetup}
            disabled={loading || success}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating test data...' : success ? 'Done!' : 'Setup Test Data'}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Skip and go to Login
          </button>
        </div>
      </div>
    </div>
  );
};