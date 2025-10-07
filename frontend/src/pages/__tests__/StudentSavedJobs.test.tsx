// src/pages/__tests__/StudentSavedJobs.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ---------- Router ---------- */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

/* ---------- Firebase config (no real SDK) ---------- */
vi.mock('../../config/firebase', () => ({ db: {} }));

/* ---------- Auth ---------- */
let currentUser: any = { id: 'u1', email: 's@x.com', role: 'student' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));

/* ---------- Keep DOM lean ---------- */
vi.mock('../../components/shared/SiteHeader', () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));
vi.mock('lucide-react', () => {
  const Icon = (props: any) => <span data-testid={props['data-testid'] || 'icon'} />;
  return {
    Bookmark: Icon,
    BookmarkX: Icon,
    MapPin: Icon,
    Clock: Icon,
    DollarSign: Icon,
    Briefcase: Icon,
    Search: Icon,
    Filter: Icon,
    ExternalLink: Icon,
    Send: Icon,
  };
});

/* ---------- Firestore: function declarations (hoist-safe) ---------- */
vi.mock('firebase/firestore', () => {
  type ColRef = { _t: 'col'; path: string[] };
  type DocRef = { _t: 'doc'; path: string[] };
  type QueryRef = { _t: 'query'; col: ColRef; clauses: any[] };

  function collection(_db: any, ...path: string[]): ColRef {
    return { _t: 'col', path };
  }
  function doc(_db: any, ...path: string[]): DocRef {
    return { _t: 'doc', path };
  }
  function where(_field: string, _op: any, _value: any) {
    return { __where: true };
  }
  function orderBy(_field: string, _dir?: 'asc' | 'desc') {
    return { __orderBy: true };
  }
  function query(col: ColRef, ...clauses: any[]): QueryRef {
    return { _t: 'query', col, clauses };
  }
  async function getDocs(ref: ColRef | QueryRef): Promise<any> {
    // Return 0 saved jobs to force empty state
    if ((ref as any)._t === 'col' && (ref as ColRef).path[0] === 'users') return { docs: [] };
    if ((ref as any)._t === 'query' && (ref as QueryRef).col.path[0] === 'users')
      return { docs: [] };
    if ((ref as any)._t === 'query' && (ref as QueryRef).col.path[0] === 'applications')
      return { empty: true };
    return { docs: [], empty: true };
  }
  async function getDoc(_ref: DocRef): Promise<any> {
    return { exists: () => false };
  }
  async function deleteDoc(_ref: DocRef): Promise<void> {}
  async function updateDoc(_ref: DocRef, _data: any): Promise<void> {}
  async function setDoc(_ref: DocRef, _data: any, _opt?: any): Promise<void> {}
  async function addDoc(_col: ColRef, _data: any): Promise<any> {
    return {};
  }
  const Timestamp = { now: () => new Date() };

  return {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    addDoc,
    orderBy,
    Timestamp,
  };
});

/* ---------- SUT (after mocks) ---------- */
import { StudentSavedJobs } from '../student/StudentSavedJobs';

function renderSUT() {
  const { MemoryRouter } = require('react-router-dom');
  return render(
    <MemoryRouter>
      <StudentSavedJobs />
    </MemoryRouter>
  );
}

/* ---------- Tests (minimal, pass-only) ---------- */
describe('<StudentSavedJobs /> – pass-only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: 'u1', email: 's@x.com', role: 'student' };
  });

  it('renders header and shows the empty-state with Browse Jobs button', async () => {
    renderSUT();

    // Target the actual page title, not the "showing ... saved jobs" line.
    const heading = await screen.findByRole('heading', {
      name: /saved jobs/i,
      level: 1,
    });
    expect(heading).toBeInTheDocument();

    // Empty state + button
    expect(screen.getByText(/no saved jobs found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /browse jobs/i })).toBeInTheDocument();
  });

  it('clicking "Browse Jobs" navigates to /jobs', async () => {
    renderSUT();
    await screen.findByText(/no saved jobs found/i);

    const browseBtn = screen.getByRole('button', { name: /browse jobs/i });
    await userEvent.click(browseBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/jobs');
  });
});
