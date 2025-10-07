import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, beforeEach, expect, vi } from 'vitest';

// ---- Hoisted singletons for mocks (safe with Vitest hoisting) ----
const fsm = vi.hoisted(() => ({
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));
const router = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

// ---- Module mocks (only use hoisted refs inside factories) ----
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  doc: vi.fn((_, id: string) => ({ id })),
  getDocs: fsm.getDocs,
  updateDoc: fsm.updateDoc,
  deleteDoc: fsm.deleteDoc,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'employer-1', role: 'employer' } }),
}));

vi.mock('react-router-dom', async (orig) => {
  const actual: any = await orig();
  return { ...actual, useNavigate: () => router.navigateMock };
});

// Avoid importing real firebase objects
vi.mock('../../config/firebase', () => ({ db: {} }));

// Import after mocks
import { EmployerJobs } from '../employer/EmployerJobs';

// ---- Helpers to build firestore snapshots ----
function emptySnapshot() {
  return { forEach: (_cb: (d: any) => void) => {} };
}
function oneJobSnapshot() {
  return {
    forEach: (cb: (d: any) => void) =>
      cb({
        id: 'job-1',
        data: () => ({
          employerId: 'employer-1',
          companyName: 'Tech Co',
          title: 'Frontend Dev',
          description: 'Build cool stuff',
          location: 'Remote',
          type: 'full-time',
          skills: ['React', 'TS'],
          salary: { min: 60000, max: 90000, currency: 'CAD' },
          status: 'active',
          viewCount: 10,
          applicationCount: 2,
          createdAt: { toDate: () => new Date('2025-01-01') },
          updatedAt: { toDate: () => new Date('2025-01-02') },
        }),
      }),
  };
}

describe('<EmployerJobs /> – pass-only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fsm.getDocs.mockReset();
    fsm.updateDoc.mockReset();
    fsm.deleteDoc.mockReset();
    router.navigateMock.mockReset();
  });

  it('renders header and empty state (no jobs)', async () => {
    fsm.getDocs.mockResolvedValueOnce(emptySnapshot());

    render(<EmployerJobs />);

    // header visible
    expect(await screen.findByText(/my job postings/i)).toBeInTheDocument();

    // empty state after loading resolves
    expect(await screen.findByText(/no job postings/i)).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /post your first job/i });
    expect(cta).toBeInTheDocument();

    fireEvent.click(cta);
    expect(router.navigateMock).toHaveBeenCalledWith('/employer/post-job');
  });

  it('renders one job and "Post New Job" navigates', async () => {
    fsm.getDocs.mockResolvedValueOnce(oneJobSnapshot());

    render(<EmployerJobs />);

    // header
    expect(await screen.findByText(/my job postings/i)).toBeInTheDocument();

    // job card content becomes visible
    expect(await screen.findByText(/frontend dev/i)).toBeInTheDocument();
    expect(screen.getByText(/remote/i)).toBeInTheDocument();

    // quick presence checks for stats boxes (labels)
    expect(screen.getByText(/total jobs/i)).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText(/total applications/i)).toBeInTheDocument();
    expect(screen.getByText(/total views/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /post new job/i }));
    expect(router.navigateMock).toHaveBeenCalledWith('/employer/post-job');
  });
});
