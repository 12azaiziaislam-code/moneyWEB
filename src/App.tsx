/** App shell + routing + session gating (splash → login → onboarding → app). */

import { useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './state/AuthContext';
import { ToastProvider } from './state/ToastContext';
import { ScanProvider } from './state/ScanContext';
import { DoctorScanProvider } from './state/DoctorScanContext';
import { AppShell } from './components/AppShell';
import { PageTransition } from './components/PageTransition';
import { Splash } from './components/Splash';
import { GuestUpgradeSheet } from './components/GuestUpgradeSheet';
import { LoginPage } from './pages/Login';
import { OnboardingPage, guestIntroSeen } from './pages/Onboarding';
import { HomePage } from './pages/Home';
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
  const path = location.pathname;
  const isMainTab =
    path === '/' ||
    path === '/halal' ||
    path === '/chats' ||
    path === '/doctor' ||
    path === '/accountant' ||
    path === '/profile';

  return (
    <AppShell>
      {/* 
        KeepAlive Tab Shell:
        The primary tabs stay mounted in DOM across transitions.
        This guarantees instant 0ms switching, preserves input states,
        scroll positions, camera streams, and active scanning progress.
      */}
      <div className={path === '/' ? 'flex flex-1 flex-col' : 'hidden'} aria-hidden={path !== '/'}>
        <HomePage />
      </div>
      <div className={path === '/halal' ? 'flex flex-1 flex-col' : 'hidden'} aria-hidden={path !== '/halal'}>
        <HalalPage />
      </div>
      <div className={path === '/chats' ? 'flex flex-1 flex-col' : 'hidden'} aria-hidden={path !== '/chats'}>
        <ChatsPage />
      </div>
      <div className={path === '/doctor' ? 'flex flex-1 flex-col' : 'hidden'} aria-hidden={path !== '/doctor'}>
        <DoctorPage />
      </div>
      <div className={path === '/accountant' ? 'flex flex-1 flex-col' : 'hidden'} aria-hidden={path !== '/accountant'}>
        <AccountantPage />
      </div>
      <div className={path === '/profile' ? 'flex flex-1 flex-col' : 'hidden'} aria-hidden={path !== '/profile'}>
        <ProfilePage />
      </div>

      {/* Sub-routes (e.g. detailed chat threads, legal docs, 404) */}
      {!isMainTab && (
        <PageTransition key={path}>
          <Routes>
            <Route path="/chats/:id" element={<ChatDetailPage />} />
            <Route path="/legal/:doc" element={<LegalPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </PageTransition>
      )}

      <GuestUpgradeSheet />
    </AppShell>
  );
}

function Gate() {
  const { status, role, user } = useAuth();
  const [guestIntroDone, setGuestIntroDone] = useState(guestIntroSeen);

  if (status === 'loading') return <Splash />;
  if (status === 'signedOut' || !role) return <LoginPage />;
  if (role === 'user' && user && user.onboardingDone === false) return <OnboardingPage />;
  if (role === 'guest' && !guestIntroDone) return <OnboardingPage onGuestDone={() => setGuestIntroDone(true)} />;
  return <Authenticated />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ScanProvider>
          <DoctorScanProvider>
            <Gate />
          </DoctorScanProvider>
        </ScanProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
