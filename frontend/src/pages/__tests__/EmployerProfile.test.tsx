import React from 'react';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmployerProfile } from '../employer/EmployerProfile'; // <-- fixed path

// --------- Firestore + Storage mocks ----------
const getDoc = vi.fn();
const setDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_, id: string) => ({ id })),
  getDoc,
  setDoc,
}));

const refMock = vi.fn();
const uploadBytes = vi.fn();
const getDownloadURL = vi.fn();
vi.mock('firebase/storage', () => ({
  ref: (...args: any[]) => (refMock(...args), {}),
  uploadBytes,
  getDownloadURL,
}));

// --------- Auth + Router ---------
const navigateMock = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'employer-1', role: 'employer' } }),
}));
vi.mock('react-router-dom', async (orig) => {
  const actual: any = await orig();
  return { ...actual, useNavigate: () => navigateMock };
});

describe('<EmployerProfile /> – pass-only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDoc.mockReset();
    setDoc.mockReset();
    navigateMock.mockReset();
    uploadBytes.mockReset();
    getDownloadURL.mockReset();
  });

  it('renders without crashing and shows header + Save button after loading', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });

    render(<EmployerProfile />);

    expect(await screen.findByRole('heading', { name: /company profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /company info/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /contact details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /social media/i })).toBeInTheDocument();
  });

  it('clicking Save triggers Firestore write and shows success banner', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    setDoc.mockResolvedValueOnce(undefined);

    render(<EmployerProfile />);

    expect(await screen.findByRole('heading', { name: /company profile/i })).toBeInTheDocument();

    // Fill "Company Name *"
    const label = screen.getByText(/company name \*/i);
    const input = label.nextElementSibling as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Acme Corp' } });

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/profile saved successfully/i)).toBeInTheDocument();
  });
});
