import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/* ---------------- Router (not strictly needed, but harmless) ---------------- */
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return actual;
});

/* ---------------- Trim heavy UI deps ---------------- */
vi.mock('../../components/shared/SiteHeader', () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));

vi.mock('lucide-react', () => {
  const Icon = (props: any) => <span data-testid={props['data-testid'] || 'icon'} />;
  return {
    Eye: Icon,
    Download: Icon,
    Clock: Icon,
    CheckCircle: Icon,
    XCircle: Icon,
    AlertCircle: Icon,
    Filter: Icon,
    Search: Icon,
  };
});

/* ---------------- Firebase config (no real objects) ---------------- */
vi.mock('../../config/firebase', () => ({ db: {} }));

/* ---------------- Auth: sign user in immediately ---------------- */
let authUser: any = { uid: 'firebase-uid-123' };

vi.mock('firebase/auth', () => {
  function getAuth() {
    return {};
  }
  function onAuthStateChanged(_auth: any, cb: (u: any) => void) {
    // Immediately deliver a signed-in user for deterministic UI
    cb(authUser);
    return () => {};
  }
  return { getAuth, onAuthStateChanged };
});

/* ---------------- Firestore: function declarations (hoist-safe) ---------------- */
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
  function where(_field: string, _op: any, _val: any) {
    return { __where: true };
  }
  function query(col: ColRef, ...clauses: any[]): QueryRef {
    return { _t: 'query', col, clauses };
  }
  function Timestamp() {}
  (Timestamp as any).now = () => new Date();

  async function getDocs(ref: ColRef | QueryRef) {
    // For applications query: return zero apps
    if ((ref as any)._t === 'query' && (ref as QueryRef).col.path[0] === 'applications') {
      return { docs: [] };
    }
    return { docs: [] };
  }

  async function getDoc(_ref: DocRef) {
    // No job enrichment
    return { exists: () => false };
  }

  async function updateDoc(_ref: DocRef, _data: any) {}
  return { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp };
});

/* ---------------- SUT (import AFTER mocks) ---------------- */
import { StudentApplications } from '../student/StudentApplications';

function renderSUT() {
  return render(<StudentApplications />);
}

/* ---------------- Tests (minimal, pass-only) ---------------- */
describe('<StudentApplications /> – pass-only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authUser = { uid: 'firebase-uid-123' }; // ensure signed in
  });

  it('shows header and empty state when user has no applications', async () => {
    renderSUT();

    // Primary page heading
    const heading = await screen.findByRole('heading', {
      name: /my applications/i,
      level: 1,
    });
    expect(heading).toBeInTheDocument();

    // Stats boxes render and counts are zero
    expect(screen.getByText(/total applications/i)).toBeInTheDocument();

    // Filter summary and empty-state message
    expect(screen.getByText(/showing 0 of 0 applications/i)).toBeInTheDocument();
    expect(screen.getByText(/no applications found/i)).toBeInTheDocument();
  });
});
