import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { SiteHeader } from '../../components/shared/SiteHeader';

type SettingsData = {
  emailNotifications: boolean;
  jobAlerts: boolean;
  resumeUrl: string;
};

const DEFAULTS: SettingsData = {
  emailNotifications: true,
  jobAlerts: true,
  resumeUrl: '',
};

export default function Settings() {
  const { user, resetPassword } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [settings, setSettings] = useState<SettingsData>(DEFAULTS);

  useEffect(() => {
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, 'users', user.id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data() as any;
          const s = d?.settings || {};
          setSettings({
            emailNotifications: typeof s.emailNotifications === 'boolean' ? s.emailNotifications : DEFAULTS.emailNotifications,
            jobAlerts: typeof s.jobAlerts === 'boolean' ? s.jobAlerts : DEFAULTS.jobAlerts,
            resumeUrl: typeof s.resumeUrl === 'string' ? s.resumeUrl : DEFAULTS.resumeUrl,
          });
        }
      } catch (e: any) {
        setErr(e?.message || 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      await setDoc(
        doc(db, 'users', user.id),
        {
          // keep top-level data intact; only update settings + timestamp
          settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setMsg('Settings saved!');
    } catch (e: any) {
      setErr(e?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!user?.email) return;
    setMsg(null);
    setErr(null);
    try {
      await resetPassword(user.email);
      setMsg('Password reset email sent.');
    } catch (e: any) {
      setErr(e?.message || 'Failed to send reset email.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-700">Please log in to access your settings.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SiteHeader />
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your preferences and account options</p>
        </div>

        {msg && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-green-800">
            {msg}
          </div>
        )}
        {err && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-red-800">
            {err}
          </div>
        )}

        <form onSubmit={save} className="bg-white shadow rounded-lg divide-y">
          {/* Preferences */}
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
              <p className="text-sm text-gray-500">Control notifications and job alerts</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email notifications</p>
                <p className="text-sm text-gray-500">Receive updates about your applications</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.emailNotifications}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, emailNotifications: e.target.checked }))
                  }
                />
                <span className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></span>
                <span className="ml-3 text-sm text-gray-700">{settings.emailNotifications ? 'On' : 'Off'}</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Job alerts</p>
                <p className="text-sm text-gray-500">Get notified about new matching jobs</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.jobAlerts}
                  onChange={(e) => setSettings((s) => ({ ...s, jobAlerts: e.target.checked }))}
                />
                <span className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></span>
                <span className="ml-3 text-sm text-gray-700">{settings.jobAlerts ? 'On' : 'Off'}</span>
              </label>
            </div>
          </div>

          {/* Resume */}
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Default Resume</h2>
              <p className="text-sm text-gray-500">
                This URL can be pre-filled when you apply to jobs.
              </p>
            </div>
            <input
              type="url"
              placeholder="https://drive.google.com/your-resume.pdf"
              value={settings.resumeUrl}
              onChange={(e) => setSettings((s) => ({ ...s, resumeUrl: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Actions */}
          <div className="p-6 flex flex-col sm:flex-row gap-3 sm:justify-between">
            <button
              type="button"
              onClick={sendPasswordReset}
              className="px-4 py-2 bg-white text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              Send password reset email
            </button>

            <div className="flex gap-3 sm:justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
