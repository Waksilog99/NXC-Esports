import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import Roster from './components/Roster';
import LoginModal from './components/LoginModal';
import AdminPanel from './components/AdminPanel';
import ManagerDashboard from './components/ManagerDashboard';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Achievements from './components/Achievements';
import Events from './components/Events';
import Sponsors from './components/Sponsors';
import TeamManagement from './components/TeamManagement';
import PlayerConsole from './components/PlayerConsole';
import SponsorZone from './components/SponsorZone';
import StoreModal from './components/StoreModal';
import { useUser } from './services/authService';
import { useTheme } from './hooks/useTheme';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './hooks/useNotification';

const App: React.FC = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isStoreBtnVisible, setIsStoreBtnVisible] = useState(true);
  const { user, loading } = useUser();
  useTheme(); // Initialize theme
  const [userRole, setUserRole] = useState<string>('member');
  const [dbUserId, setDbUserId] = useState<number | undefined>(undefined);
  const [sponsorTier, setSponsorTier] = useState<string | undefined>(undefined);
  const [isRoleLoading, setIsRoleLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'profile' | 'settings' | 'roster' | 'achievements' | 'events' | 'sponsors' | 'admin' | 'manager' | 'team-management' | 'tournament-management' | 'sponsor-zone'>('home');
  const [previousView, setPreviousView] = useState<typeof currentView>('home');
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);

  const handleNavigate = (view: typeof currentView, userId?: number) => {
    // Only track history if we are moving TO a "sub-view" like profile or settings
    // Or just track everything that isn't the same as current
    if (view !== currentView) {
      setPreviousView(currentView);
    }
    setSelectedUserId(userId);
    setCurrentView(view);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView]);

  // Global Escape key handler for back navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If we are in a sub-view, go back to previous or home
        const subViews = ['profile', 'settings', 'admin', 'manager', 'team-management', 'tournament-management', 'operations', 'sponsor-zone'];
        if (subViews.includes(currentView)) {
          console.log(`[ESC] Navigating back from ${currentView}`);
          const backTo = (previousView === currentView || !previousView) ? 'home' : previousView;
          handleNavigate(backTo);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, previousView]);

  useEffect(() => {
    const fetchRole = async () => {
      if (user?.role) {
        setUserRole(user.role);
      }

      if (!user?.email) {
        setUserRole('member');
        setDbUserId(undefined);
        setIsRoleLoading(false);
        return;
      }
      setIsRoleLoading(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

        // Fetch User Data
        const response = await fetch(`${API_BASE_URL}/api/users`);
        const data = await response.json();
        const me = data.find((u: any) => u.email?.toLowerCase() === user.email?.toLowerCase());
        if (me) {
          setUserRole(me.role);
          setDbUserId(me.id);

          // Fetch Sponsor Tier if applicable
          if (me.role?.includes('sponsor')) {
            const sponsorsRes = await fetch(`${API_BASE_URL}/api/sponsors`);
            const sponsorsData = await sponsorsRes.json();
            if (sponsorsData.success) {
              const mySponsor = sponsorsData.data.find((s: any) => s.userId === me.id);
              if (mySponsor) {
                setSponsorTier(mySponsor.tier);
              }
            }
          }
        } else {
          setUserRole('member');
          setDbUserId(undefined);
          setSponsorTier(undefined);
        }
      } catch (e) {
        console.error("Failed to fetch role");
      } finally {
        setIsRoleLoading(false);
      }
    };

    fetchRole();

    window.addEventListener('storage', fetchRole);
    window.addEventListener('nxc-auth-changed', fetchRole);
    return () => {
      window.removeEventListener('storage', fetchRole);
      window.removeEventListener('nxc-auth-changed', fetchRole);
    };
  }, [user]);

  // Redirect to home when logged out from restricted views
  useEffect(() => {
    const protectedViews = ['profile', 'settings', 'admin', 'manager', 'team-management', 'tournament-management', 'sponsor-zone'];
    if (!loading && !user && protectedViews.includes(currentView)) {
      handleNavigate('home');
      setIsLoginOpen(true); // Auto-open login modal after logout/account deletion
    }
  }, [user, loading, currentView]);

  const isAuthorized = (view: string) => {
    const roles = userRole?.split(',') || [];
    if (view === 'admin') return roles.includes('admin') || roles.includes('ceo');
    if (view === 'manager') return roles.includes('manager') || roles.includes('admin') || roles.includes('ceo');
    if (view === 'team-management' || view === 'tournament-management') return roles.includes('manager') || roles.includes('admin') || roles.includes('ceo');
    if (view === 'operations') return roles.includes('player') || roles.includes('manager') || roles.includes('admin') || roles.includes('ceo');
    if (view === 'sponsor-zone') return roles.includes('sponsor') || roles.includes('admin') || roles.includes('ceo');
    return true;
  };

  const AccessDenied = () => (
    <div className="min-h-[60vh] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
      <div className="max-w-md w-full bg-[#020617]/80 backdrop-blur-2xl border border-amber-500/30 rounded-[32px] p-10 text-center shadow-2xl shadow-amber-500/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-amber-400 to-purple-600" />
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-500/20 shadow-[0_0_30px_rgba(251,191,36,0.1)]">
          <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6V9m4.938 4h1.062a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2h1.062M9 11V9a3 3 0 016 0v2" />
          </svg>
        </div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Access Restricted</h2>
        <p className="text-slate-400 mb-10 text-sm leading-relaxed font-medium">
          The high council has restricted access to this terminal. Only CEOs and authorized Administrators may proceed.
        </p>
        <button
          onClick={() => handleNavigate('home')}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98]"
        >
          Return to Citadel
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen glow-mesh flex flex-col items-center justify-center space-y-8">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-20 h-20 border-4 border-purple-500/10 border-b-purple-500 rounded-full animate-spin-slow" />
        </div>
        <div className="text-center">
          <p className="text-amber-500 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Establishing Secure Signal...</p>
          <p className="text-[10px] text-slate-500 uppercase font-bold mt-2 tracking-widest">Waks Corporation Command Center</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <div className="min-h-screen glow-mesh selection:bg-amber-500/30">
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-amber-500/[0.03] blur-[140px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-purple-900/[0.08] blur-[140px] rounded-full animate-pulse-slow" />
            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-white/[0.02] blur-[120px] rounded-full" />
          </div>

          <Header
            onLoginClick={() => setIsLoginOpen(true)}
            onProfileClick={() => handleNavigate('profile')}
            onSettingsClick={() => handleNavigate('settings')}
            onNavigate={(view) => handleNavigate(view)}
            currentView={currentView}
            userRole={userRole}
            sponsorTier={sponsorTier}
          />

          <main className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-24">

            {currentView === 'profile' ? (
              <Profile
                onBack={() => {
                  const backTo = previousView === 'profile' ? 'home' : previousView;
                  handleNavigate(backTo);
                }}
                targetUserId={selectedUserId}
                userRole={userRole}
                backTitle={previousView === 'admin' ? 'Return to Command' : 'Return to Citadel'}
              />
            ) : currentView === 'settings' ? (
              <Settings onBack={() => {
                const backTo = previousView === 'settings' ? 'home' : previousView;
                handleNavigate(backTo);
              }} userRole={userRole} />
            ) : (
              <>
                {currentView === 'home' && (
                  <>
                    <Hero />
                    <section id="dashboard" className="scroll-mt-32">
                      <Dashboard onProfileClick={() => handleNavigate('profile')} userId={dbUserId} userRole={userRole} />
                    </section>
                  </>
                )}

                {currentView === 'admin' && (
                  !isAuthorized('admin') ? <AccessDenied /> : (
                    <section id="admin-panel" className="scroll-mt-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <AdminPanel onViewProfile={(id) => handleNavigate('profile', id)} />
                    </section>
                  )
                )}

                {currentView === 'manager' && (
                  !isAuthorized('manager') ? <AccessDenied /> : (
                    <section id="manager-dashboard" className="scroll-mt-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <ManagerDashboard
                        userId={dbUserId}
                        userRole={userRole}
                        onNavigate={(view) => handleNavigate(view as any)}
                      />
                    </section>
                  )
                )}

                {currentView === 'roster' && (
                  <section id="roster" className="scroll-mt-32">
                    <Roster />
                  </section>
                )}

                {currentView === 'achievements' && <Achievements />}
                {currentView === 'events' && <Events />}
                {currentView === 'sponsors' && <Sponsors />}

                {currentView === 'team-management' && (
                  !isAuthorized('team-management') ? <AccessDenied /> : (
                    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <TeamManagement userId={dbUserId} userRole={userRole} mode="scrim" onBack={() => handleNavigate('manager')} />
                    </section>
                  )
                )}

                {currentView === 'tournament-management' && (
                  !isAuthorized('tournament-management') ? <AccessDenied /> : (
                    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <TeamManagement userId={dbUserId} userRole={userRole} mode="tournament" onBack={() => handleNavigate('manager')} />
                    </section>
                  )
                )}

                {currentView === 'operations' && (
                  !isAuthorized('operations') ? <AccessDenied /> : (
                    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <PlayerConsole userId={dbUserId} userRole={userRole} onBack={() => handleNavigate('home')} />
                    </section>
                  )
                )}

                {currentView === 'sponsor-zone' && (
                  !isAuthorized('sponsor-zone') ? <AccessDenied /> : (
                    <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                      <SponsorZone />
                    </section>
                  )
                )}
              </>
            )}

            <footer className="pt-20 border-t border-white/5 text-center text-slate-500 text-sm">
              <div className="flex justify-center space-x-6 mb-8">
                <a href="https://discord.gg/ykUVzNUK2U" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">Discord</a>
                <a href="https://www.facebook.com/WaksCorporation" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">Facebook</a>
                <a href="https://www.tiktok.com/@nxcesports" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">TikTok</a>
              </div>
              <p>© 2025 Waks Corporation. All signals encrypted.</p>
            </footer>
          </main>

          {/* Floating Store Button */}
          {isStoreBtnVisible && !isStoreOpen && (
            <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2 animate-in slide-in-from-right-8 fade-in duration-500">
              <button
                onClick={() => setIsStoreBtnVisible(false)}
                className="bg-black/80 text-slate-400 hover:text-white p-1 rounded-full border border-white/10 hover:border-white/30 transition-colors backdrop-blur-md self-end mb-1"
                title="Hide Store Button"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button
                onClick={() => setIsStoreOpen(true)}
                className="group relative flex items-center justify-center p-4 bg-gradient-to-r from-purple-600 to-amber-500 rounded-full shadow-[0_10px_30px_rgba(168,85,247,0.4)] hover:shadow-[0_10px_40px_rgba(251,191,36,0.6)] hover:scale-105 active:scale-95 transition-all outline-none"
              >
                <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </button>
            </div>
          )}

          <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
          <StoreModal
            isOpen={isStoreOpen}
            onClose={() => setIsStoreOpen(false)}
            onNeedLogin={() => {
              setIsStoreOpen(false);
              setIsLoginOpen(true);
            }}
          />
        </div>
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;
