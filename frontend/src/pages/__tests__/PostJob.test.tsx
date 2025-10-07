// src/pages/__tests__/PostJob.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/* ---------------- Router mock ---------------- */
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

/* ---------------- Firebase config mock ---------------- */
vi.mock('../../config/firebase', () => ({ db: {} }));

/* ---------------- Firestore mock (hoist-safe) ---------------- */
const addDocSpy = vi.fn(async () => ({ id: 'new-job-id-123' }));
vi.mock('firebase/firestore', () => {
  function collection(_db: unknown, ..._path: string[]) {
    return { __type: 'collection', path: _path };
  }
  async function addDoc(colRef: unknown, data: unknown) {
    return addDocSpy(colRef, data);
  }
  return { collection, addDoc };
});

/* ---------------- AuthContext mock ---------------- */
type TestUser = { id: string; role: 'student' | 'employer'; email?: string } | null;
let currentUser: TestUser = { id: 'emp-1', role: 'employer', email: 'emp@example.com' };
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: currentUser }) }));

/* ---------------- SUT ---------------- */
import { PostJob } from '../employer/PostJob';

/* Utilities */
function fillFormAndSubmit() {
  fireEvent.change(screen.getByLabelText(/job title \*/i), {
    target: { value: 'Frontend Developer Intern' },
  });
  fireEvent.change(screen.getByLabelText(/company name \*/i), {
    target: { value: 'TechCorp Inc.' },
  });
  fireEvent.change(screen.getByLabelText(/^location \*/i), {
    target: { value: 'Toronto, ON' },
  });
  fireEvent.change(screen.getByLabelText(/job description \*/i), {
    target: { value: 'Great internship working with React.' },
  });
  fireEvent.change(screen.getByLabelText(/required skills/i), {
    target: { value: 'React, TypeScript' },
  });
  fireEvent.change(screen.getByPlaceholderText(/^min$/i), { target: { value: '20' } });
  fireEvent.change(screen.getByPlaceholderText(/^max$/i), { target: { value: '30' } });
  fireEvent.click(screen.getByRole('button', { name: /post job/i }));
}

describe('<PostJob /> – pass-only', () => {
  let realSetTimeout: typeof setTimeout;
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockClear();
    currentUser = { id: 'emp-1', role: 'employer', email: 'emp@example.com' };

    // Keep a reference to the real timer so Testing Library can use it.
    realSetTimeout = globalThis.setTimeout;

    // Only short-circuit the component's 2000ms redirect; delegate everything else.
    setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((cb: (...args: any[]) => void, ms?: number, ...args: any[]) => {
        if (typeof cb === 'function' && ms === 2000) {
          // Fire the redirect soon but on the next macrotask, so Testing Library's
          // internal timers (like waitFor) are not broken.
          return realSetTimeout(() => cb(...args), 0) as unknown as NodeJS.Timeout;
        }
        // Everything else uses the real setTimeout.
        return realSetTimeout(cb as any, ms as any, ...args) as unknown as NodeJS.Timeout;
      });
  });

  afterEach(() => {
    setTimeoutSpy?.mockRestore();
  });

  it('employer can submit and sees success banner; redirects to employer dashboard', async () => {
    render(<PostJob />);

    // Header present
    expect(
      screen.getByRole('heading', { name: /post a new job/i, level: 1 })
    ).toBeInTheDocument();

    fillFormAndSubmit();

    // Firestore called with expected payload (subset)
    expect(addDocSpy).toHaveBeenCalledTimes(1);
    const payload = addDocSpy.mock.calls[0][1];
    expect(payload).toMatchObject({
      title: 'Frontend Developer Intern',
      companyName: 'TechCorp Inc.',
      location: 'Toronto, ON',
      type: 'full-time',
      status: 'active',
      employerId: 'emp-1',
      viewCount: 0,
      applicationCount: 0,
    });
    expect((payload as any).skills).toEqual(['React', 'TypeScript']);
    expect((payload as any).salary).toMatchObject({ min: 20, max: 30, currency: 'CAD' });

    // Success banner appears after submit
    expect(
      await screen.findByText(/job posted successfully! redirecting to dashboard/i)
    ).toBeInTheDocument();

    // Redirect occurs (our timer shim runs the callback on next tick)
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/employer/dashboard')
    );
  });

  it('non-employer sees Access Restricted and Login as Employer navigates to /login', () => {
    currentUser = { id: 'student-1', role: 'student', email: 's@example.com' };
    render(<PostJob />);

    expect(
      screen.getByRole('heading', { name: /access restricted/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText(/only employers can post jobs/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /login as employer/i }));
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });
});
