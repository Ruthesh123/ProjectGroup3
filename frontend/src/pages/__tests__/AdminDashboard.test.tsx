import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { AdminDashboard } from '../admin/AdminDashboard';

// --- Router/Auth/Profile mocks ---
const navigateMock = vi.fn();

vi.mock('react-router-dom', async (orig) => {
  const actual: any = await orig();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1', role: 'admin', email: 'a@example.com' } }),
}));

// The dashboard imports ProfileDropdown; replace with a simple stub so tests don’t pull in its internals.
vi.mock('../../components/shared/ProfileDropdown', () => ({
  ProfileDropdown: () => <div data-testid="profile-dropdown">profile</div>,
}));

// --- Firestore mocks ---
const getDocs = vi.fn();

vi.mock('firebase/firestore', () => ({
  // these are used by the component; they don’t need to do anything fancy in tests
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  getDocs,
}));

// helper to return an object with a `size` property like Firestore QuerySnapshot
const snapshotWithSize = (size: number) => ({ size });

describe('<AdminDashboard />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    getDocs.mockReset();

    // The component calls getDocs 4 times in this order:
    // 1) students (role == student)
    // 2) employers (role == employer)
    // 3) jobs  (collection 'jobs')
    // 4) applications (collection 'applications')
    getDocs
      .mockResolvedValueOnce(snapshotWithSize(12)) // students
      .mockResolvedValueOnce(snapshotWithSize(5))  // employers
      .mockResolvedValueOnce(snapshotWithSize(9))  // jobs
      .mockResolvedValueOnce(snapshotWithSize(3)); // applications
  });

  it('renders header and stats after loading', async () => {
    render(<AdminDashboard />);

    // header brand/title
    expect(await screen.findByText(/internlink admin/i)).toBeInTheDocument();
    // profile dropdown stub present
    expect(screen.getByTestId('profile-dropdown')).toBeInTheDocument();

    // wait until one of the stat labels appears, then assert numbers
    await waitFor(() => {
      expect(screen.getByText(/total students/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/total students/i).closest('div')!).toHaveTextContent('12');
    expect(screen.getByText(/total employers/i).closest('div')!).toHaveTextContent('5');
    expect(screen.getByText(/total jobs/i).closest('div')!).toHaveTextContent('9');
    expect(screen.getByText(/active applications/i).closest('div')!).toHaveTextContent('3');
  });

  it('quick actions navigate to the right admin routes', async () => {
    render(<AdminDashboard />);

    // ensure UI loaded
    await screen.findByText(/internlink admin/i);

    fireEvent.click(screen.getByRole('button', { name: /manage users/i }));
    expect(navigateMock).toHaveBeenCalledWith('/admin/users');

    fireEvent.click(screen.getByRole('button', { name: /manage jobs/i }));
    expect(navigateMock).toHaveBeenCalledWith('/admin/jobs');

    fireEvent.click(screen.getByRole('button', { name: /view applications/i }));
    expect(navigateMock).toHaveBeenCalledWith('/admin/applications');
  });
});
