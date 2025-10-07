import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/* ---------- Router (only for navigate used in handlers) ---------- */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

/* ---------- App deps we don't want to fully render ---------- */
vi.mock('../../components/shared/ProfileDropdown', () => ({
  ProfileDropdown: () => <div data-testid="profile-dropdown" />,
}));

// Keep JobCard tiny & inert; we won’t render any since we return 0 jobs.
vi.mock('../../components/student/JobCard', () => ({
  JobCard: () => <div data-testid="job-card" />,
}));

// useSavedJobs hook: stable, no side effects.
vi.mock('../../hooks/useSavedJobs', () => ({
  useSavedJobs: (_uid?: string | null) => ({
    isSaved: (_id: string) => false,
    toggle: vi.fn(),
  }),
}));

/* ---------- Auth ---------- */
let currentUser: any = { id: 'u1', email: 's@x.com', role: 'student' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));

/* ---------- Firebase config (no real SDK objects) ---------- */
vi.mock('../../config/firebase', () => ({ db: {} }));

/* ---------- Firestore: function declarations (hoist-safe) ---------- */
vi.mock('firebase/firestore', () => {
  type ColRef = { _t: 'col'; path: string[] };
  type QueryRef = { _t: 'query'; col: ColRef; clauses: any[] };

  function collection(_db: any, ...path: string[]): ColRef {
    return { _t: 'col', path };
  }
  function orderBy(_field: string, _dir?: 'asc' | 'desc') {
    return { __orderBy: true };
  }
  function query(col: ColRef, ...clauses: any[]): QueryRef {
    return { _t: 'query', col, clauses };
  }
  async function getDocs(_ref: ColRef | QueryRef) {
    // Return no jobs to keep UI deterministic
    return { docs: [] };
  }

  return { collection, orderBy, query, getDocs };
});

/* ---------- SUT (import AFTER mocks) ---------- */
import { StudentDashboard } from '../student/StudentDashboard';

function renderSUT() {
  const { MemoryRouter } = require('react-router-dom');
  return render(
    <MemoryRouter>
      <StudentDashboard />
    </MemoryRouter>
  );
}

/* ---------- Tests (minimal, pass-only) ---------- */
describe('<StudentDashboard /> – pass-only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: 'u1', email: 's@x.com', role: 'student' };
  });

  it('renders heading and shows 0 jobs found (no Firestore data)', async () => {
    renderSUT();

    // Page title in the header
    expect(await screen.findByText(/internlink/i)).toBeInTheDocument();

    // Section heading: Available Opportunities (h2)
    const section = await screen.findByRole('heading', {
      name: /available opportunities/i,
      level: 2,
    });
    expect(section).toBeInTheDocument();

    // Count text reflects 0 jobs
    expect(screen.getByText(/0 jobs found/i)).toBeInTheDocument();

    // No JobCard rendered
    expect(screen.queryByTestId('job-card')).not.toBeInTheDocument();
  });
});
