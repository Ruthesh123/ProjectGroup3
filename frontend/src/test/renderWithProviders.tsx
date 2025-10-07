import { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export function renderWithProviders(ui: ReactNode, userOverride?: any) {
  const mockAuth = {
    user: userOverride ?? { uid: 'stu-1', role: 'student', email: 'a@x.com' },
    loading: false,
    signOut: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={mockAuth as any}>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthContext.Provider>
  );
}
