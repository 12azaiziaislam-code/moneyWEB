/** App shell + routing + session gating (splash → login → onboarding → app). */

import { Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './state/AuthContext';
import { ToastProvider } from './state/ToastContext';
import { AppShell } from './components/AppShell';
import { PageTransition } from './components/PageTransition';
import { Splash } from './components/Splash';
import { GuestUpgradeSheet } from './components/GuestUpgradeSheet';
import { LoginPage } from './pages/Login';
import { OnboardingPage, guestIntroSeen } from './pages/Onboarding';
import { HalalPage } from './pages/Halal';
import { ChatsPage } from './pages/Chats';
import { ChatDetailPage } from './pages/ChatDetail';
import { DoctorPage } from './pages/Doctor';
import { AccountantPage } from './pages/Accountant';
import { ProfilePage } from './pages/Profile';
import { LegalPage } from './pages/Legal';
import { NotFoundPage } from './pages/NotFound';

function Authenticated() {
  const location = useLocation();
  return (
    <AppShell>
      <PageTransition key={location.pathname}>
        <Routes>
          <Route path="/" element={<HalalPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/chats/:id" element={<ChatDetailPage />} />
          <Route path="/doctor" element={<DoctorPage />} />
          <Route path="/accountant" element={<AccountantPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/legal/:doc" element={<LegalPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </PageTransition>
      <GuestUpgradeSheet />
    </AppShell>
  );
}

function Gate() {
  const { status, role, user } = useAuth();

  if (status === 'loading') return <Splash />;
  if (status === 'signedOut' || !role) return <LoginPage />;
  if (role === 'user' && user && user.onboardingDone === false) return <OnboardingPage />;
  if (role === 'guest' && !guestIntroSeen()) return <OnboardingPage />;
  return <Authenticated />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  );
}
