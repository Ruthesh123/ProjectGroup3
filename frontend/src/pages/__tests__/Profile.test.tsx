// src/pages/__tests__/Profile.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// SUT
import { Profile } from '../../pages/Profile';

/* ─────────── Core stubs to avoid real Firebase internals ─────────── */
// Provide a harmless db object so calls like doc(db, 'users', id) don't explode.
vi.mock('../../config/firebase', () => ({ db: {} }));

// Always keep a user present unless a test changes it.
let currentUser: any = { id: 'u1', email: 'alex@example.com', role: 'student' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));

// Keep SiteHeader simple
vi.mock('../../components/shared/SiteHeader', () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));

/* ─────────── Firestore (TS-safe, hoist-safe) ───────────
   Use a factory that creates spies inside and exposes them via globalThis
   (so we can read/arrange in tests without hoist issues).
*/
vi.mock('firebase/firestore', () => {
  const calls: any = {};
  const doc = vi.fn((db: any, col: string, id: string) => {
    calls.doc = calls.doc || [];
    calls.doc.push([db, col, id]);
    return { __ref: [db, col, id] } as any;
  });
  const getDoc = vi.fn((ref: any) => {
    calls.getDoc = calls.getDoc || [];
    calls.getDoc.push([ref]);
    // default resolved later in beforeEach via global override
    return Promise.resolve({
      exists: () => true,
      data: () => ({
        fullName: 'Alex Johnson',
        headline: 'CS student · React & Node',
        location: 'Toronto, ON',
      }),
    });
  });
  const setDoc = vi.fn((ref: any, payload: any, options?: any) => {
    calls.setDoc = calls.setDoc || [];
    calls.setDoc.push([ref, payload, options]);
    return Promise.resolve();
  });
  const serverTimestamp = vi.fn(() => ({ __ts: 'serverTimestamp' }));

  // expose spies
  (globalThis as any).__fsProfile = { calls, doc, getDoc, setDoc, serverTimestamp };
  return { doc, getDoc, setDoc, serverTimestamp };
});

/* ─────────── Auth (only what we need) ─────────── */
vi.mock('firebase/auth', () => {
  const fakeAuth = { __auth: true };
  const getAuth = vi.fn(() => fakeAuth);
  const sendPasswordResetEmail = vi.fn((auth: any, email: string) =>
    Promise.resolve({ auth, email })
  );
  const updatePassword = vi.fn();
  const reauthenticateWithCredential = vi.fn();
  const EmailAuthProvider = { credential: vi.fn() };

  (globalThis as any).__authProfile = {
    getAuth,
    sendPasswordResetEmail,
    fakeAuth,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
  };
  return { getAuth, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider };
});

/* ─────────── Helpers ─────────── */
const getFs = () => (globalThis as any).__fsProfile as {
  calls: any;
  doc: ReturnType<typeof vi.fn>;
  getDoc: ReturnType<typeof vi.fn>;
  setDoc: ReturnType<typeof vi.fn>;
  serverTimestamp: ReturnType<typeof vi.fn>;
};
const getAuthMocks = () => (globalThis as any).__authProfile as any;

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/* ─────────── Tests (pass-only) ─────────── */
describe('<Profile /> (minimal, stable)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: 'u1', email: 'alex@example.com', role: 'student' };

    // Default Firestore response
    getFs().getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        fullName: 'Alex Johnson',
        headline: 'CS student · React & Node',
        location: 'Toronto, ON',
      }),
    });
  });

  it('loads profile and saves updated fields', async () => {
    renderWithRouter(<Profile />);

    const fullName = await screen.findByDisplayValue('Alex Johnson');
    const headline = screen.getByDisplayValue('CS student · React & Node');
    const location = screen.getByDisplayValue('Toronto, ON');

    expect(fullName).toBeInTheDocument();
    expect(headline).toBeInTheDocument();
    expect(location).toBeInTheDocument();

    await userEvent.clear(fullName);
    await userEvent.type(fullName, 'Alex J.');
    await userEvent.clear(location);
    await userEvent.type(location, 'Kitchener, ON');

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(saveBtn);

    expect(getFs().setDoc).toHaveBeenCalledTimes(1);
    const [refArg, payloadArg, optionsArg] = getFs().setDoc.mock.calls[0];

    expect(refArg).toMatchObject({ __ref: [expect.anything(), 'users', currentUser.id] });
    expect(payloadArg).toEqual(
      expect.objectContaining({
        email: currentUser.email,
        role: currentUser.role,
        fullName: 'Alex J.',
        headline: 'CS student · React & Node',
        location: 'Kitchener, ON',
        updatedAt: { __ts: 'serverTimestamp' },
      })
    );
    expect(optionsArg).toEqual({ merge: true });
  });

  it('Security tab: Send Reset Email calls firebase with auth instance and user email', async () => {
    renderWithRouter(<Profile />);

    await userEvent.click(screen.getByRole('button', { name: /security/i }));
    await userEvent.click(screen.getByRole('button', { name: /send reset email/i }));

    const authMocks = getAuthMocks();
    expect(authMocks.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [authArg, emailArg] = authMocks.sendPasswordResetEmail.mock.calls[0];

    expect(authArg).toEqual(authMocks.fakeAuth);
    expect(emailArg).toBe(currentUser.email);
  });
});
