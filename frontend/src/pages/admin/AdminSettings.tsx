import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface PlatformSettings {
  // General Settings
  platformName: string;
  platformDescription: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;

  // Registration Settings
  allowStudentRegistration: boolean;
  allowEmployerRegistration: boolean;
  requireEmailVerification: boolean;
  autoApproveEmployers: boolean;

  // Job Posting Settings
  maxJobsPerEmployer: number;
  jobPostingRequiresApproval: boolean;
  jobExpirationDays: number;
  allowRemoteJobs: boolean;

  // Application Settings
  maxApplicationsPerStudent: number;
  allowMultipleApplications: boolean;
  requireCoverLetter: boolean;
  applicationDeadlineBuffer: number;

  // Notification Settings
  emailNotifications: boolean;
  adminEmailAlerts: string;
  newUserNotification: boolean;
  newJobNotification: boolean;
  newApplicationNotification: boolean;

  // Display Settings
  itemsPerPage: number;
  showStatistics: boolean;
  enableDarkMode: boolean;
  defaultLanguage: string;
}

export const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'registration' | 'jobs' | 'notifications' | 'display'>('general');
  const [showSuccess, setShowSuccess] = useState(false);

  const [settings, setSettings] = useState<PlatformSettings>({
    platformName: 'InternLink',
    platformDescription: 'Connect students with internship opportunities',
    maintenanceMode: false,
    maintenanceMessage: 'We are currently performing maintenance. Please check back later.',

    allowStudentRegistration: true,
    allowEmployerRegistration: true,
    requireEmailVerification: true,
    autoApproveEmployers: false,

    maxJobsPerEmployer: 50,
    jobPostingRequiresApproval: false,
    jobExpirationDays: 90,
    allowRemoteJobs: true,

    maxApplicationsPerStudent: 100,
    allowMultipleApplications: true,
    requireCoverLetter: false,
    applicationDeadlineBuffer: 7,

    emailNotifications: true,
    adminEmailAlerts: 'admin@interlink.com',
    newUserNotification: true,
    newJobNotification: true,
    newApplicationNotification: false,

    itemsPerPage: 10,
    showStatistics: true,
    enableDarkMode: false,
    defaultLanguage: 'en',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'platform'));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as PlatformSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setShowSuccess(false);

    try {
      await setDoc(doc(db, 'settings', 'platform'), {
        ...settings,
        updatedAt: new Date(),
        updatedBy: user?.email,
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600">Only administrators can access settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {showSuccess && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            ✅ Settings saved successfully!
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-4 py-3 rounded-t-lg flex items-center space-x-3 ${
                  activeTab === 'general' ? 'bg-blue-50 text-primary border-l-4 border-primary' : 'hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>General</span>
              </button>

              <button
                onClick={() => setActiveTab('registration')}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 ${
                  activeTab === 'registration' ? 'bg-blue-50 text-primary border-l-4 border-primary' : 'hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Registration</span>
              </button>

              <button
                onClick={() => setActiveTab('jobs')}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 ${
                  activeTab === 'jobs' ? 'bg-blue-50 text-primary border-l-4 border-primary' : 'hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Jobs & Applications</span>
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 ${
                  activeTab === 'notifications' ? 'bg-blue-50 text-primary border-l-4 border-primary' : 'hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Notifications</span>
              </button>

              <button
                onClick={() => setActiveTab('display')}
                className={`w-full text-left px-4 py-3 rounded-b-lg flex items-center space-x-3 ${
                  activeTab === 'display' ? 'bg-blue-50 text-primary border-l-4 border-primary' : 'hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Display</span>
              </button>
            </nav>
          </div>

          {/* Settings Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow p-6">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      value={settings.platformName}
                      onChange={(e) => handleChange('platformName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform Description
                    </label>
                    <textarea
                      value={settings.platformDescription}
                      onChange={(e) => handleChange('platformDescription', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-4">Maintenance Mode</h3>

                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="maintenanceMode"
                        checked={settings.maintenanceMode}
                        onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="maintenanceMode" className="ml-2 text-sm text-gray-700">
                        Enable maintenance mode
                      </label>
                    </div>

                    {settings.maintenanceMode && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Maintenance Message
                        </label>
                        <textarea
                          value={settings.maintenanceMessage}
                          onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Registration Settings */}
              {activeTab === 'registration' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Registration Settings</h2>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowStudentReg"
                        checked={settings.allowStudentRegistration}
                        onChange={(e) => handleChange('allowStudentRegistration', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="allowStudentReg" className="ml-2 text-sm text-gray-700">
                        Allow student registration
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowEmployerReg"
                        checked={settings.allowEmployerRegistration}
                        onChange={(e) => handleChange('allowEmployerRegistration', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="allowEmployerReg" className="ml-2 text-sm text-gray-700">
                        Allow employer registration
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireEmail"
                        checked={settings.requireEmailVerification}
                        onChange={(e) => handleChange('requireEmailVerification', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="requireEmail" className="ml-2 text-sm text-gray-700">
                        Require email verification
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoApprove"
                        checked={settings.autoApproveEmployers}
                        onChange={(e) => handleChange('autoApproveEmployers', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="autoApprove" className="ml-2 text-sm text-gray-700">
                        Auto-approve employer accounts
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Jobs & Applications Settings */}
              {activeTab === 'jobs' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Jobs & Applications Settings</h2>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Jobs per Employer
                      </label>
                      <input
                        type="number"
                        value={settings.maxJobsPerEmployer}
                        onChange={(e) => handleChange('maxJobsPerEmployer', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Expiration (days)
                      </label>
                      <input
                        type="number"
                        value={settings.jobExpirationDays}
                        onChange={(e) => handleChange('jobExpirationDays', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Applications per Student
                      </label>
                      <input
                        type="number"
                        value={settings.maxApplicationsPerStudent}
                        onChange={(e) => handleChange('maxApplicationsPerStudent', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Application Deadline Buffer (days)
                      </label>
                      <input
                        type="number"
                        value={settings.applicationDeadlineBuffer}
                        onChange={(e) => handleChange('applicationDeadlineBuffer', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="jobApproval"
                        checked={settings.jobPostingRequiresApproval}
                        onChange={(e) => handleChange('jobPostingRequiresApproval', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="jobApproval" className="ml-2 text-sm text-gray-700">
                        Job postings require admin approval
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowRemote"
                        checked={settings.allowRemoteJobs}
                        onChange={(e) => handleChange('allowRemoteJobs', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="allowRemote" className="ml-2 text-sm text-gray-700">
                        Allow remote job postings
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="requireCover"
                        checked={settings.requireCoverLetter}
                        onChange={(e) => handleChange('requireCoverLetter', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="requireCover" className="ml-2 text-sm text-gray-700">
                        Require cover letter for applications
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="multipleApps"
                        checked={settings.allowMultipleApplications}
                        onChange={(e) => handleChange('allowMultipleApplications', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="multipleApps" className="ml-2 text-sm text-gray-700">
                        Allow multiple applications to same company
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Email for Alerts
                    </label>
                    <input
                      type="email"
                      value={settings.adminEmailAlerts}
                      onChange={(e) => handleChange('adminEmailAlerts', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="emailNotif"
                        checked={settings.emailNotifications}
                        onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="emailNotif" className="ml-2 text-sm text-gray-700">
                        Enable email notifications
                      </label>
                    </div>

                    {settings.emailNotifications && (
                      <>
                        <div className="ml-6 space-y-3">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="newUserNotif"
                              checked={settings.newUserNotification}
                              onChange={(e) => handleChange('newUserNotification', e.target.checked)}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <label htmlFor="newUserNotif" className="ml-2 text-sm text-gray-700">
                              Notify on new user registration
                            </label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="newJobNotif"
                              checked={settings.newJobNotification}
                              onChange={(e) => handleChange('newJobNotification', e.target.checked)}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <label htmlFor="newJobNotif" className="ml-2 text-sm text-gray-700">
                              Notify on new job posting
                            </label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="newAppNotif"
                              checked={settings.newApplicationNotification}
                              onChange={(e) => handleChange('newApplicationNotification', e.target.checked)}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <label htmlFor="newAppNotif" className="ml-2 text-sm text-gray-700">
                              Notify on new application
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Display Settings */}
              {activeTab === 'display' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Display Settings</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Items per Page
                    </label>
                    <select
                      value={settings.itemsPerPage}
                      onChange={(e) => handleChange('itemsPerPage', parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Language
                    </label>
                    <select
                      value={settings.defaultLanguage}
                      onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                    >
                      <option value="en">English</option>
                      <option value="fr">French</option>
                      <option value="es">Spanish</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showStats"
                        checked={settings.showStatistics}
                        onChange={(e) => handleChange('showStatistics', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="showStats" className="ml-2 text-sm text-gray-700">
                        Show platform statistics on dashboard
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="darkMode"
                        checked={settings.enableDarkMode}
                        onChange={(e) => handleChange('enableDarkMode', e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="darkMode" className="ml-2 text-sm text-gray-700">
                        Enable dark mode option
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button (Mobile) */}
            <div className="mt-6 flex justify-end md:hidden">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};