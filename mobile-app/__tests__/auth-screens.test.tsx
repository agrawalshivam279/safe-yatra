/**
 * Safe Yatra — Mobile App
 * Unit & Integration Tests for Auth Screens (Login, Register, RoleSelect).
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../app/(auth)/login';
import RegisterScreen from '../app/(auth)/register';
import RoleSelectScreen from '../app/(auth)/role-select';

// Mock AuthContext
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockSetRole = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    role: 'TOURIST',
    isLoading: false,
    isAuthenticated: false,
    isVolunteer: false,
    isTourist: true,
    login: mockLogin,
    register: mockRegister,
    logout: jest.fn(),
    setRole: mockSetRole,
    refreshProfile: jest.fn(),
  }),
}));

// Mock Expo Router
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
  }),
  useSegments: () => ['(auth)'],
  Slot: () => null,
  Stack: Object.assign(() => null, { Screen: () => null }),
}));

describe('Mobile App Auth Screens (Step 5.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginScreen (app/(auth)/login.tsx)', () => {
    it('should render brand header and login inputs', () => {
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      expect(getByText('Safe Yatra')).toBeTruthy();
      expect(getByPlaceholderText('tourist@safeyatra.in')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
    });

    it('should display validation error when fields are empty', async () => {
      const { getByText } = render(<LoginScreen />);
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(getByText(/Please enter both email and password/i)).toBeTruthy();
      });
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should call login on valid credentials', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('tourist@safeyatra.in'), 'aarav@safeyatra.in');
      fireEvent.changeText(getByPlaceholderText('••••••••'), 'Password123!');
      fireEvent.press(getByText('Sign In'));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'aarav@safeyatra.in',
          password: 'Password123!',
        });
      });
    });

    it('should navigate to register screen on link press', () => {
      const { getByText } = render(<LoginScreen />);
      fireEvent.press(getByText(/Register/i));
      expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
    });
  });

  describe('RegisterScreen (app/(auth)/register.tsx)', () => {
    it('should render all registration fields and role selector', () => {
      const { getByPlaceholderText, getByText, getAllByText } = render(<RegisterScreen />);
      expect(getAllByText('Create Account').length).toBeGreaterThan(0);
      expect(getByPlaceholderText('Aarav Sharma')).toBeTruthy();
      expect(getByPlaceholderText('+91 98765 43210')).toBeTruthy();
      expect(getByText('Tourist')).toBeTruthy();
      expect(getByText('Yaatri Mitra')).toBeTruthy();
    });

    it('should validate short names and short passwords', async () => {
      const { getByPlaceholderText, getByText, getByLabelText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Aarav Sharma'), 'A');
      fireEvent.changeText(getByPlaceholderText('+91 98765 43210'), '123');
      fireEvent.changeText(getByPlaceholderText('aarav@example.com'), 'invalid');
      fireEvent.changeText(getByPlaceholderText('Min. 6 characters'), '123');
      fireEvent.press(getByLabelText('Register account button'));

      await waitFor(() => {
        expect(getByText(/Name must be at least 2 characters long/i)).toBeTruthy();
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should submit registration with selected Yaatri Mitra role', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const { getByPlaceholderText, getByText, getByLabelText } = render(<RegisterScreen />);

      fireEvent.press(getByText('Yaatri Mitra'));
      fireEvent.changeText(getByPlaceholderText('Aarav Sharma'), 'Vikram Singh');
      fireEvent.changeText(getByPlaceholderText('+91 98765 43210'), '+919876543210');
      fireEvent.changeText(getByPlaceholderText('aarav@example.com'), 'vikram@safeyatra.in');
      fireEvent.changeText(getByPlaceholderText('Min. 6 characters'), 'SecurePass123!');
      fireEvent.press(getByLabelText('Register account button'));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          name: 'Vikram Singh',
          phone: '+919876543210',
          email: 'vikram@safeyatra.in',
          password: 'SecurePass123!',
          role: 'YAATRI_MITRA',
          emergencyContact: undefined,
        });
      });
    });
  });

  describe('RoleSelectScreen (app/(auth)/role-select.tsx)', () => {
    it('should render both persona selection cards', () => {
      const { getByText } = render(<RoleSelectScreen />);
      expect(getByText('Choose Your Mode')).toBeTruthy();
      expect(getByText('Tourist Mode')).toBeTruthy();
      expect(getByText('Yaatri Mitra Mode')).toBeTruthy();
    });

    it('should update role to YAATRI_MITRA and replace route to /(mitra)', async () => {
      const { getByText } = render(<RoleSelectScreen />);
      fireEvent.press(getByText('Yaatri Mitra Mode'));

      await waitFor(() => {
        expect(mockSetRole).toHaveBeenCalledWith('YAATRI_MITRA');
        expect(mockReplace).toHaveBeenCalledWith('/(mitra)');
      });
    });

    it('should update role to TOURIST and replace route to /(tourist)', async () => {
      const { getByText } = render(<RoleSelectScreen />);
      fireEvent.press(getByText('Tourist Mode'));

      await waitFor(() => {
        expect(mockSetRole).toHaveBeenCalledWith('TOURIST');
        expect(mockReplace).toHaveBeenCalledWith('/(tourist)');
      });
    });
  });
});
