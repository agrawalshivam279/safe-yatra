import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../src/app/login/page';
import { AuthGuard } from '../src/components/auth/AuthGuard';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { authService } from '../src/services/authService';
import { storage } from '../src/services/storage';
import { ApiError } from '../src/services/api';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockPathname = '/login';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}));

// Mock Socket.IO client for Sidebar inside AuthGuard
jest.mock('socket.io-client', () => {
  const mockSocket = {
    connected: true,
    connect: jest.fn().mockReturnThis(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };
  return {
    io: jest.fn(() => mockSocket),
    Socket: jest.fn(),
  };
});

describe('1. Admin Dashboard Login Page UI & Actions', () => {
  beforeEach(() => {
    storage.clearStorage();
    jest.clearAllMocks();
    mockPathname = '/login';
  });

  function renderLoginPage() {
    return render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );
  }

  it('renders all essential login form elements', async () => {
    renderLoginPage();

    expect(screen.getByText('Safe Yatra Command Center')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-login-btn')).toBeInTheDocument();
    expect(screen.getByTestId('quick-fill-btn')).toBeInTheDocument();
  });

  it('validates empty inputs and invalid email addresses', async () => {
    renderLoginPage();

    fireEvent.click(screen.getByTestId('submit-login-btn'));

    expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required');
    expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required');

    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'invalid-email-format' },
    });
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: '123' },
    });

    fireEvent.click(screen.getByTestId('submit-login-btn'));

    expect(screen.getByTestId('email-error')).toHaveTextContent('Please enter a valid email address');
    expect(screen.getByTestId('password-error')).toHaveTextContent('Password must be at least 6 characters');
  });

  it('populates credentials when clicking quick-fill demo button', async () => {
    renderLoginPage();

    fireEvent.click(screen.getByTestId('quick-fill-btn'));

    const emailInput = screen.getByTestId('email-input') as HTMLInputElement;
    const passwordInput = screen.getByTestId('password-input') as HTMLInputElement;

    expect(emailInput.value).toBe('admin@safeyatra.in');
    expect(passwordInput.value).toBe('Admin@123456');
  });

  it('toggles password visibility on eye button click', async () => {
    renderLoginPage();

    const passwordInput = screen.getByTestId('password-input') as HTMLInputElement;
    const toggleBtn = screen.getByTestId('toggle-password-btn');

    expect(passwordInput.type).toBe('password');
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('password');
  });

  it('successfully authenticates and redirects to dashboard root on valid login', async () => {
    const mockAdminUser = {
      id: 'admin_001',
      name: 'Safety Commander',
      email: 'commander@safeyatra.in',
      role: 'ADMIN',
    };

    jest.spyOn(authService, 'login').mockResolvedValueOnce({
      user: mockAdminUser,
      tokens: {
        accessToken: 'mock_jwt_access',
        refreshToken: 'mock_jwt_refresh',
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'commander@safeyatra.in' },
    });
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'AdminPassword123!' },
    });

    fireEvent.click(screen.getByTestId('submit-login-btn'));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'commander@safeyatra.in',
        password: 'AdminPassword123!',
      });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('displays error alert when login fails with invalid credentials', async () => {
    jest.spyOn(authService, 'login').mockRejectedValueOnce(
      new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    );

    renderLoginPage();

    fireEvent.change(screen.getByTestId('email-input'), {
      target: { value: 'wrong@safeyatra.in' },
    });
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'WrongPassword123!' },
    });

    fireEvent.click(screen.getByTestId('submit-login-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('api-error-alert')).toBeInTheDocument();
      expect(screen.getByTestId('api-error-alert')).toHaveTextContent('Invalid email or password');
    });
  });
});

describe('2. Admin Dashboard Route AuthGuard Boundary', () => {
  beforeEach(() => {
    storage.clearStorage();
    jest.clearAllMocks();
  });

  it('renders login stage children without sidebar on /login for unauthenticated visitor', async () => {
    mockPathname = '/login';

    render(
      <AuthProvider>
        <AuthGuard>
          <div data-testid="login-content">Login Form Content</div>
        </AuthGuard>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authguard-login-stage')).toBeInTheDocument();
      expect(screen.getByTestId('login-content')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated visitor on protected route to /login', async () => {
    mockPathname = '/sos';

    render(
      <AuthProvider>
        <AuthGuard>
          <div data-testid="protected-content">Secret SOS Feed</div>
        </AuthGuard>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  it('redirects already-authenticated ADMIN visiting /login to /', async () => {
    mockPathname = '/login';

    storage.setAuthToken('valid_admin_token');
    storage.setStoredUser({
      id: 'admin_123',
      name: 'Commander',
      email: 'admin@safeyatra.in',
      role: 'ADMIN',
    });

    jest.spyOn(authService, 'getMe').mockResolvedValueOnce({
      id: 'admin_123',
      name: 'Commander',
      email: 'admin@safeyatra.in',
      role: 'ADMIN',
    });

    render(
      <AuthProvider>
        <AuthGuard>
          <div>Login Form</div>
        </AuthGuard>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('renders protected stage with Sidebar and children for authenticated ADMIN', async () => {
    mockPathname = '/heatmap';

    storage.setAuthToken('valid_admin_token');
    storage.setStoredUser({
      id: 'admin_123',
      name: 'Commander',
      email: 'admin@safeyatra.in',
      role: 'ADMIN',
    });

    jest.spyOn(authService, 'getMe').mockResolvedValueOnce({
      id: 'admin_123',
      name: 'Commander',
      email: 'admin@safeyatra.in',
      role: 'ADMIN',
    });

    render(
      <AuthProvider>
        <AuthGuard>
          <div data-testid="heatmap-content">Interactive Heatmap</div>
        </AuthGuard>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authguard-protected-stage')).toBeInTheDocument();
      expect(screen.getByTestId('heatmap-content')).toBeInTheDocument();
    });
  });
});
