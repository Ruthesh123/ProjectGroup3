import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { SiteHeader } from '../components/shared/SiteHeader';

// Auth (for password change)
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  User as FbUser,
} from 'firebase/auth';

type Msg = { type: 'success' | 'error' | 'info'; text: string };

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const auth = getAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile state
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Msg | null>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [secMsg, setSecMsg] = useState<Msg | null>(null);

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
      } catch {
        if (alive) setMessage({ type: 'error', text: 'Failed to load profile.' });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const validateProfile = () => {
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

    if (!validateProfile()) return;

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
    } catch {
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // --- SECURITY (Change Password) ---
  const validatePassword = () => {
    if (!newPassword || !confirmNewPassword) {
      setSecMsg({ type: 'error', text: 'Please enter a new password and confirm it.' });
      return false;
    }
    if (newPassword !== confirmNewPassword) {
      setSecMsg({ type: 'error', text: 'New passwords do not match.' });
      return false;
    }
    if (newPassword.length < 6) {
      setSecMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return false;
    }
    return true;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecMsg(null);

    const fbUser: FbUser | null = auth.currentUser;
    if (!fbUser) {
      setSecMsg({ type: 'error', text: 'Please sign in again and try.' });
      return;
    }
    if (!user?.email) {
      setSecMsg({ type: 'error', text: 'No email found for this account.' });
      return;
    }
    if (!validatePassword()) return;

    setChanging(true);
    try {
      // Re-authenticate with current password
      if (!currentPassword) {
        setSecMsg({ type: 'error', text: 'Please enter your current password.' });
        setChanging(false);
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(fbUser, credential);

      // Update password
      await updatePassword(fbUser, newPassword);

      setSecMsg({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      // Common issues: wrong-password, requires-recent-login
      const code = err?.code || '';
      if (code === 'auth/wrong-password') {
        setSecMsg({ type: 'error', text: 'Current password is incorrect.' });
      } else if (code === 'auth/too-many-requests') {
        setSecMsg({
          type: 'error',
          text: 'Too many attempts. Please wait a bit or use the reset email option.',
        });
      } else if (code === 'auth/requires-recent-login') {
        setSecMsg({
          type: 'error',
          text: 'For security, please sign out and sign in again, then retry. Or use the reset email option below.',
        });
      } else {
        setSecMsg({ type: 'error', text: err?.message || 'Failed to change password.' });
      }
    } finally {
      setChanging(false);
    }
  };

  const sendResetEmail = async () => {
    setSecMsg(null);
    if (!user?.email) {
      setSecMsg({ type: 'error', text: 'No email found for this account.' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSecMsg({
        type: 'success',
        text: 'Password reset email sent. Check your inbox for further instructions.',
      });
    } catch (err: any) {
      setSecMsg({ type: 'error', text: err?.message || 'Failed to send reset email.' });
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
              {fullName?.trim()?.charAt(0)?.toUpperCase() ||
                user.email?.charAt(0)?.toUpperCase() ||
                'U'}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1>
              <p className="text-gray-500 text-sm">Manage your profile and security</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow border border-gray-200">
          <div className="border-b border-gray-200 px-6 pt-4">
            <nav className="-mb-px flex gap-6">
              <button
                className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium ${
                  activeTab === 'profile'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
              <button
                className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium ${
                  activeTab === 'security'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('security')}
              >
                Security
              </button>
            </nav>
          </div>

          {/* Alerts */}
          {(activeTab === 'profile' ? message : secMsg) && (
            <div
              className={`mx-6 mt-4 rounded-lg border px-4 py-3 ${
                (activeTab === 'profile' ? message : secMsg)!.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : (activeTab === 'profile' ? message : secMsg)!.type === 'info'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {(activeTab === 'profile' ? message : secMsg)!.type === 'success'
                ? '✅ '
                : (activeTab === 'profile' ? message : secMsg)!.type === 'info'
                ? 'ℹ️ '
                : '❌ '}
              {(activeTab === 'profile' ? message : secMsg)!.text}
            </div>
          )}

          {/* Tab content */}
          {activeTab === 'profile' ? (
            // PROFILE TAB
            <>
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
                        <p className="mt-1 text-xs text-gray-400">
                          {120 - headline.length} characters left
                        </p>
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
                        setMessage(null);
                        setLoading(true);
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
            </>
          ) : (
            // SECURITY TAB
            <form onSubmit={handleChangePassword} className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3">Change Password</h2>
                <p className="text-sm text-gray-500">
                  Enter your current password and a new password to update your account.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={sendResetEmail}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Send Reset Email
                </button>
                <button
                  type="submit"
                  disabled={changing}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {changing ? 'Updating…' : 'Update Password'}
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
