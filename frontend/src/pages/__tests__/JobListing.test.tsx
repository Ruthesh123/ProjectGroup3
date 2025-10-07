// src/pages/__tests__/JobListing.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// SUT
import { JobsListing } from '../../pages/JobsListing';

/* ─────────── Avoid real Firebase internals ─────────── */
vi.mock('../../config/firebase', () => ({ db: {} })); // harmless db object

// Router + Auth
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

let authUser: any = { id: 'u1' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: authUser }),
}));

// Saved jobs hook (no-op but defined)
vi.mock('../../hooks/useSavedJobs', () => ({
  useSavedJobs: () => ({ isSaved: () => false, toggle: () => {} }),
}));

// SiteHeader stub
vi.mock('../../components/shared/SiteHeader', () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));

/* ─────────── Firestore (just enough to force fallback) ─────────── */
vi.mock('firebase/firestore', () => {
  const collection = vi.fn(() => ({}));
  const query = vi.fn(() => ({}));
  const orderBy = vi.fn(() => ({}));
  const where = vi.fn(() => ({}));
  const getDocs = vi.fn(() => Promise.reject(new Error('force-fallback'))); // always fail -> component uses fallback jobs
  (globalThis as any).__fsJL = { collection, query, orderBy, where, getDocs };
  return { collection, query, orderBy, where, getDocs };
});

/* ─────────── Helper ─────────── */
function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/* ─────────── Tests (pass-only) ─────────── */
describe('<JobsListing /> (minimal, stable)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authUser = { id: 'u1' }; // logged-in by default
  });

  it('renders the hero title and fallback job cards (smoke)', async () => {
    renderWithRouter(<JobsListing />);

    // Hero present
    expect(await screen.findByText(/find your dream internship/i)).toBeInTheDocument();

    // Fallback jobs present (component’s built-in list)
    expect(screen.getByText('Frontend Developer Intern')).toBeInTheDocument();
    expect(screen.getByText('Backend Developer Co-op')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
  });

  it('when logged out, clicking Apply redirects to /login (uses first Apply button)', async () => {
    authUser = null; // logged out
    renderWithRouter(<JobsListing />);

    await screen.findByText('Frontend Developer Intern'); // ensures cards are visible
    const applyButtons = screen.getAllByRole('button', { name: /apply/i });
    await userEvent.click(applyButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
