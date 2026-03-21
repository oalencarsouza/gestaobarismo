import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { WelcomeModal } from './components/WelcomeModal';
import { NotificationProvider } from './contexts/NotificationContext';
import { Login } from './components/views/Login';

// Importação Preguiçosa (Lazy Loading) para otimização de bundle
const OrderHistory = lazy(() => import('./components/views/OrderHistory').then(m => ({ default: m.OrderHistory })));
const Profile = lazy(() => import('./components/views/Profile').then(m => ({ default: m.Profile })));
const Dashboard = lazy(() => import('./components/views/Dashboard').then(m => ({ default: m.Dashboard })));
const Stock = lazy(() => import('./components/views/Stock').then(m => ({ default: m.Stock })));
const MenuView = lazy(() => import('./components/views/Menu').then(m => ({ default: m.MenuView })));
const Reports = lazy(() => import('./components/views/Reports').then(m => ({ default: m.Reports })));
const OrderView = lazy(() => import('./components/views/OrderView').then(m => ({ default: m.OrderView })));
const Settings = lazy(() => import('./components/views/Settings').then(m => ({ default: m.Settings })));

export type View = 'history' | 'profile' | 'dashboard' | 'stock' | 'reports' | 'menu' | 'orders' | 'settings';

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [view, setView] = useState<View>(() => {
        const savedView = localStorage.getItem('activeView') as View;
        return savedView || 'orders';
    });
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [triggerNewOrder, setTriggerNewOrder] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('activeView', view);
    }, [view]);

    useEffect(() => {
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (loggedIn) {
            setIsLoggedIn(true);
            const welcomeDismissed = sessionStorage.getItem('welcomeDismissed') === 'true';
            if (!welcomeDismissed) {
                setShowWelcomeModal(true);
                setView('orders');
            }
        }
    }, []);

    const handleLogin = () => {
        setIsLoggedIn(true);
        setShowWelcomeModal(true);
        setView('orders');
        sessionStorage.removeItem('welcomeDismissed');
    };

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        localStorage.removeItem('clientId');
        sessionStorage.removeItem('welcomeDismissed');
        setIsLoggedIn(false);
        setShowWelcomeModal(false);
    };

    useEffect(() => {
        const userRole = localStorage.getItem('userRole');
        const username = localStorage.getItem('username');

        const isViewer = userRole === 'viewer';
        const isMasterAdmin = username === 'danielalencarsouz@gmail.com';

        if (isViewer && ['dashboard', 'reports', 'settings'].includes(view)) {
            setView('orders');
        } else if (view === 'settings' && !isMasterAdmin) {
            setView('orders');
        }
    }, [view]);

    const handleWelcomeNewOrder = () => {
        setView('orders');
        setShowWelcomeModal(false);
        setTriggerNewOrder(true);
    };

    const handleWelcomeManagement = () => {
        setShowWelcomeModal(false);
        sessionStorage.setItem('welcomeDismissed', 'true');
    };

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard />;
            case 'history':
                return <OrderHistory />;
            case 'stock':
                return <Stock />;
            case 'menu':
                return <MenuView />;
            case 'reports':
                return <Reports />;
            case 'profile':
                return <Profile />;
            case 'settings':
                return <Settings />;
            /* case 'events':
                return <Events />; */
            case 'orders':
                return (
                    <OrderView
                        triggerNewOrder={triggerNewOrder}
                        onNewOrderTriggered={() => setTriggerNewOrder(false)}
                    />
                );
            default:
                return <Dashboard />;
        }
    };

    if (!isLoggedIn) {
        return (
            <NotificationProvider>
                <Login onLogin={handleLogin} />
            </NotificationProvider>
        );
    }

    return (
        <NotificationProvider>
            <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-dark">
                <WelcomeModal
                    isOpen={showWelcomeModal}
                    onNewOrder={handleWelcomeNewOrder}
                    onManagement={handleWelcomeManagement}
                />
                <Header onLogout={handleLogout} onMenuClick={() => setIsMobileMenuOpen(true)} />
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar
                        currentView={view}
                        setView={(v) => { setView(v); setIsMobileMenuOpen(false); }}
                        isMobileOpen={isMobileMenuOpen}
                        onClose={() => setIsMobileMenuOpen(false)}
                    />
                    <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
                        <Suspense fallback={
                            <div className="flex-1 flex items-center justify-center h-full bg-background-dark/50 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                    <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Carregando Módulo...</p>
                                </div>
                            </div>
                        }>
                            {renderView()}
                        </Suspense>
                    </div>
                </div>
            </div>
        </NotificationProvider>
    );
};

export default App;
