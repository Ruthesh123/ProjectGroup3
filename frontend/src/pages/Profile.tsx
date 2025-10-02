// src/pages/Profile.tsx
import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { SiteHeader } from '../components/shared/SiteHeader';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load profile
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return setLoading(false);
      try {
        const ref = doc(db, 'users', user.id);
        const snap = await getDoc(ref);
        if (alive && snap.exists()) {
          const d = snap.data() as any;
          setFullName(d.fullName || '');
          setHeadline(d.headline || '');
          setLocation(d.location || '');
        }
      } catch (err) {
        if (alive) setMessage({ type: 'error', text: 'Failed to load profile.' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const validate = () => {
    if (fullName.trim().length === 0) {
      setMessage({ type: 'error', text: 'Please enter your full name.' });
      return false;
    }
    if (headline.length > 120) {
      setMessage({ type: 'error', text: 'Headline should be 120 characters or fewer.' });
      return false;
    }
    if (location.length > 80) {
      setMessage({ type: 'error', text: 'Location should be 80 characters or fewer.' });
      return false;
    }
    return true;
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setMessage(null);

    if (!validate()) return;

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.id),
        {
          email: user.email,
          role: user.role,
          fullName: fullName.trim(),
          headline: headline.trim(),
          location: location.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setMessage({ type: 'success', text: 'Your profile has been updated.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-8 text-center">
            <p className="text-gray-700">Please log in to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header card */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-2xl font-bold">
              {fullName?.trim()?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
              <p className="text-gray-500 text-sm">Manage your basic information</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? '✅ ' : '❌ '}
            {message.text}
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-xl shadow border border-gray-200">
          {loading ? (
            <div className="p-6 animate-pulse">
              <div className="h-5 w-40 bg-gray-200 rounded mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-10 w-full bg-gray-200 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-10 w-full bg-gray-200 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-10 w-full bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={saveProfile} className="p-6">
              {/* Read-only account info */}
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-3">Account</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      value={user.email}
                      disabled
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input
                      value={user.role}
                      disabled
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed capitalize"
                    />
                  </div>
                </div>
              </div>

              {/* Editable profile info */}
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-3">Profile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Alex Johnson"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Headline <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g., CS student · React & Node"
                      maxLength={120}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-400">{120 - headline.length} characters left</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Toronto, ON"
                      maxLength={80}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    // simple reset to last loaded values
                    setMessage(null);
                    setLoading(true);
                    // re-fetch
                    (async () => {
                      try {
                        const ref = doc(db, 'users', user.id);
                        const snap = await getDoc(ref);
                        if (snap.exists()) {
                          const d = snap.data() as any;
                          setFullName(d.fullName || '');
                          setHeadline(d.headline || '');
                          setLocation(d.location || '');
                        }
                      } finally {
                        setLoading(false);
                      }
                    })();
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
