import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface JobForm {
  title: string;
  companyName: string;
  description: string;
  location: string;
  type: 'full-time' | 'part-time' | 'internship' | 'contract';
  skills: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  requirements: string;
  benefits: string;
}

export const PostJob: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<JobForm>({
    title: '',
    companyName: '',
    description: '',
    location: '',
    type: 'full-time',
    skills: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'CAD',
    requirements: '',
    benefits: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // Validate form
      if (!form.title || !form.companyName || !form.description || !form.location) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Prepare job data
      const jobData = {
        title: form.title,
        companyName: form.companyName,
        description: form.description,
        location: form.location,
        type: form.type,
        skills: form.skills.split(',').map(s => s.trim()).filter(s => s),
        salary: form.salaryMin && form.salaryMax ? {
          min: parseFloat(form.salaryMin),
          max: parseFloat(form.salaryMax),
          currency: form.currency
        } : null,
        requirements: form.requirements,
        benefits: form.benefits,
        employerId: user?.id || '',
        status: 'active',
        viewCount: 0,
        applicationCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'jobs'), jobData);
      console.log('Job posted with ID:', docRef.id);

      setSuccess(true);

      // Reset form
      setForm({
        title: '',
        companyName: '',
        description: '',
        location: '',
        type: 'full-time',
        skills: '',
        salaryMin: '',
        salaryMax: '',
        currency: 'CAD',
        requirements: '',
        benefits: '',
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/employer/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Error posting job:', error);
      setError(error.message || 'Failed to post job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'employer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-4">Only employers can post jobs.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
          >
            Login as Employer
          </button>
        </div>
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
              <button onClick={() => navigate('/employer/dashboard')} className="mr-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Post a New Job</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              ✅ Job posted successfully! Redirecting to dashboard...
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="e.g., Frontend Developer Intern"
                required
              />
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={form.companyName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="e.g., TechCorp Inc."
                required
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={form.location}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="e.g., Toronto, ON or Remote"
                required
              />
            </div>

            {/* Job Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Job Type *
              </label>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                required
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
            </div>

            {/* Salary Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary Range (Optional)
              </label>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  name="salaryMin"
                  value={form.salaryMin}
                  onChange={handleChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="Min"
                />
                <input
                  type="number"
                  name="salaryMax"
                  value={form.salaryMax}
                  onChange={handleChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="Max"
                />
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                Required Skills (comma-separated)
              </label>
              <input
                type="text"
                id="skills"
                name="skills"
                value={form.skills}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="e.g., React, TypeScript, Node.js"
              />
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Job Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="Provide a detailed description of the role, responsibilities, and what you're looking for..."
                required
              />
            </div>

            {/* Requirements */}
            <div>
              <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
                Requirements
              </label>
              <textarea
                id="requirements"
                name="requirements"
                value={form.requirements}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="List specific requirements, qualifications, or experience needed..."
              />
            </div>

            {/* Benefits */}
            <div>
              <label htmlFor="benefits" className="block text-sm font-medium text-gray-700 mb-1">
                Benefits & Perks
              </label>
              <textarea
                id="benefits"
                name="benefits"
                value={form.benefits}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                placeholder="List benefits, perks, and what makes your company great..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Posting...' : 'Post Job'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/employer/dashboard')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Tips for a Great Job Posting</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Use a clear, specific job title that candidates will search for</li>
            <li>• Highlight what makes your company and this role unique</li>
            <li>• Be specific about requirements but avoid unnecessary barriers</li>
            <li>• Include salary range to attract the right candidates</li>
            <li>• Mention growth opportunities and learning experiences</li>
          </ul>
        </div>
      </div>
    </div>
  );
};