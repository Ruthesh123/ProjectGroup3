import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ jobId: 'j1' }),
  };
});

// Config (no real Firebase objects)
vi.mock('../../config/firebase', () => ({ db: {}, storage: {} }));

// Auth
let currentUser: any = { id: 'u1', email: 's@x.com', role: 'student' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));

// Firestore (stable, minimal API)
vi.mock('firebase/firestore', () => {
  const doc = vi.fn(() => ({}));
  const getDoc = vi.fn(async () => ({
    exists: () => true,
    id: 'j1',
    data: () => ({
      employerId: 'e1',
      companyName: 'Acme',
      title: 'QA Intern',
      description: 'desc',
      location: 'Toronto',
      type: 'internship',
      skills: [],
      status: 'active',
      createdAt: { toDate: () => new Date('2024-01-01') },
      updatedAt: { toDate: () => new Date('2024-01-02') },
    }),
  }));
  const collection = vi.fn(() => ({}));
  const addDoc = vi.fn(async () => ({ id: 'app1' }));
  const serverTimestamp = vi.fn(() => ({ __ts: 'server' }));
  const query = vi.fn(() => ({}));
  const where = vi.fn(() => ({}));
  const getDocs = vi.fn(async () => ({ empty: true })); // not already applied

  (globalThis as any).__fsApply = { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs };
  return { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs };
});

// Storage (not used in these tests; no-op stubs)
vi.mock('firebase/storage', () => {
  const ref = vi.fn(() => ({}));
  const uploadBytesResumable = vi.fn(() => ({
    on: (ev: string, prog: any, err: any, done: any) => done && done(),
    snapshot: { ref: {} },
  }));
  const getDownloadURL = vi.fn(async () => 'https://example.com/resume.pdf');
  return { ref, uploadBytesResumable, getDownloadURL };
});

// SUT after mocks
import { ApplyJob } from '../../pages/ApplyJob';

function renderApply() {
  const { MemoryRouter } = require('react-router-dom');
  return render(
    <MemoryRouter>
      <ApplyJob />
    </MemoryRouter>
  );
}

describe('<ApplyJob /> (minimal, stable)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = { id: 'u1', email: 's@x.com', role: 'student' };
  });

  it('renders job info (smoke)', async () => {
    renderApply();
    expect(await screen.findByText(/apply to qa intern/i)).toBeInTheDocument();
    expect(screen.getByText(/acme/i)).toBeInTheDocument();
  });

  it('redirects to /login if user is not logged in on submit', async () => {
    currentUser = null;
    renderApply();

    // Wait for page to be ready (header text visible)
    await screen.findByText(/apply to qa intern/i);

    // Provide a URL so it doesn't require upload path
    const urlInput = screen.getByPlaceholderText(/https:\/\/drive\.google\.com\/your-resume\.pdf/i);
    await userEvent.type(urlInput, 'https://example.com/resume.pdf');

    const submit = screen.getByRole('button', { name: /submit application/i });
    await userEvent.click(submit);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
