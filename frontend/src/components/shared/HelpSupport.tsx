import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { SiteHeader } from '../../components/shared/SiteHeader';

type TicketForm = {
  email: string;
  subject: string;
  message: string;
};

const FAQ = [
  {
    q: 'How do I apply to a job?',
    a: 'Open a job and click “Apply”. You can upload a PDF resume or paste a resume URL. After submitting, track status on the My Applications page.',
  },
  {
    q: 'How do I save jobs?',
    a: 'Click the bookmark icon on a job card. View them anytime under Saved Jobs.',
  },
  {
    q: 'Why can’t I post a job?',
    a: 'Only employer accounts can post jobs. If you need employer access, contact support.',
  },
  {
    q: 'I forgot my password.',
    a: 'Use the “Forgot password?” link on the login page. You’ll receive a reset email.',
  },
];

export default function HelpSupport() {
  const { user } = useAuth();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const [form, setForm] = useState<TicketForm>({
    email: user?.email ?? '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const update = (k: keyof TicketForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    const email = form.email.trim();
    const subject = form.subject.trim();
    const message = form.message.trim();

    if (!email || !subject || !message) {
      setErr('Please fill in email, subject, and message.');
      return;
    }

    try {
      setSubmitting(true);
      await addDoc(collection(db, 'supportTickets'), {
        email,
        subject,
        message,
        userId: user?.id ?? null,
        createdAt: serverTimestamp(),
        status: 'open', // open | pending | resolved
      });
      setMsg('Thanks! Your ticket has been submitted. We’ll get back to you soon.');
      setForm({
        email: user?.email ?? '',
        subject: '',
        message: '',
      });
    } catch (e: any) {
      setErr(e?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
          <p className="text-gray-600 mt-2">
            Find quick answers or contact us — we’re here to help.
          </p>
        </header>

        {/* FAQ */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <div className="divide-y">
              {FAQ.map((item, i) => {
                const open = openIdx === i;
                return (
                  <div key={i} className="py-3">
                    <button
                      type="button"
                      onClick={() => setOpenIdx(open ? null : i)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="font-medium text-gray-900">{item.q}</span>
                      <span className="text-gray-500">{open ? '–' : '+'}</span>
                    </button>
                    {open && (
                      <p className="mt-2 text-gray-600">{item.a}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact / Ticket form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Contact Support</h2>
            <p className="text-sm text-gray-500 mb-4">
              Submit a ticket and we’ll reply to your inbox.
            </p>

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

            <form onSubmit={submitTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-600 focus:border-blue-600"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => update('subject', e.target.value)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-600 focus:border-blue-600"
                  placeholder="How can we help?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  rows={6}
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-600 focus:border-blue-600"
                  placeholder="Describe the issue or question…"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <a
                  href={`mailto:support@internlink.example?subject=${encodeURIComponent(form.subject || 'Help request')}&body=${encodeURIComponent(form.message)}`}
                  className="text-blue-700 hover:underline text-sm"
                >
                  Prefer email? Write to support@internlink.example
                </a>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Extra resources */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Tips</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>Check your spam folder for our replies.</li>
            <li>For job issues, include the Job Title and a link or Job ID.</li>
            <li>For account issues, include the email you use to sign in.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
