# 📄 Technical Specification: Mobile Auth Screens & Navigation Routing

> **Step ID**: `5.3`  
> **Target Module**: `mobile-app`  
> **Git Feature Branch**: `feat/step-5-3-mobile-auth-screens`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 5.3 delivers the user-facing entry point and identity onboarding for the Safe Yatra Mobile Application:
1. **Root Layout & Navigation Router (`app/_layout.tsx`)**: Global Expo Router layout with authentication route protection, loading splash state, and persona redirecting (`(tourist)` vs `(mitra)`).
2. **Auth Stack Layout (`app/(auth)/_layout.tsx`)**: Seamless headerless transition stack for onboarding and authentication screens.
3. **Login Screen (`app/(auth)/login.tsx`)**: Accessible, validated email/password login form with real-time feedback and error handling.
4. **Register Screen (`app/(auth)/register.tsx`)**: Registration form capturing tourist and volunteer profile data (name, phone, email, password, emergency contact).
5. **Role Select Screen (`app/(auth)/role-select.tsx`)**: Interactive visual persona selection cards for Tourist vs Yaatri Mitra modes.

---

## 2. Dependencies & Prerequisites

- **Prerequisites**: Step 5.1 & 5.2 (Merged to `main`).
- **Dependencies**: `expo-router` (~3.5.0), `@expo/vector-icons` (^14.0.0), `react-native-safe-area-context` (4.10.0), `context/AuthContext.tsx`.

---

## 3. ♿ Mobile Accessibility & UI Invariants

- **Minimum Touch Targets**: All interactive buttons, inputs, and persona cards have minimum dimensions of $48\times 48$ dp.
- **Accessibility Attributes**:
  - All buttons include `accessible={true}`, `accessibilityRole="button"`, and descriptive `accessibilityLabel`.
  - Input fields include `accessibilityLabel` and `accessibilityHint`.
- **Color Contrast**: Dark slate background (`#0F172A`), high-contrast white text (`#F8FAFC`), emerald brand accents (`#10B981`), and amber warning badges (`#F59E0B`).

---

## 4. Step-by-Step Implementation Sequence

1. **Phase A: Root & Auth Layouts (`app/_layout.tsx`, `app/(auth)/_layout.tsx`)**
   - [ ] Implement `RootLayout` observing `AuthContext` and routing between `(auth)`, `(tourist)`, and `(mitra)`.
   - [ ] Implement `AuthLayout` Stack navigator.

2. **Phase B: Persona Selection (`app/(auth)/role-select.tsx`)**
   - [ ] Implement interactive visual cards for Tourist and Yaatri Mitra personas.

3. **Phase C: Login Screen (`app/(auth)/login.tsx`)**
   - [ ] Implement email and password inputs with validation, loading indicator, and error banners.

4. **Phase D: Register Screen (`app/(auth)/register.tsx`)**
   - [ ] Implement registration form with name, phone, email, password, and emergency contact.

5. **Phase E: Component Tests (`__tests__/auth-screens.test.ts`)**
   - [ ] Test form submission, field validation, role switching, and error handling.

---

## 5. Verification & Acceptance Criteria

### Automated Tests
```bash
cd mobile-app && npm test -- __tests__/auth-screens.test.ts
```

### Acceptance Checklist
- [ ] Unauthenticated users are redirected to `/(auth)/login`.
- [ ] Authenticated tourists are redirected to `/(tourist)`.
- [ ] Authenticated volunteers are redirected to `/(mitra)`.
- [ ] Form validation prevents submission with empty or invalid fields.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
