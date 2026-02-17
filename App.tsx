
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OrderHistory } from './components/views/OrderHistory';
import { Profile } from './components/views/Profile';
import { Events } from './components/views/Events';
import { Dashboard } from './components/views/Dashboard';
import { Stock } from './components/views/Stock';
import { MenuView } from './components/views/Menu';
import { Reports } from './components/views/Reports';
import { OrderView } from './components/views/OrderView';
import { Login } from './components/views/Login';
import { Sidebar } from './components/Sidebar';
import { WelcomeModal } from './components/WelcomeModal';

import { NotificationProvider } from './contexts/NotificationContext';

export type View = 'history' | 'profile' | 'events' | 'dashboard' | 'stock' | 'reports' | 'menu' | 'orders';

const App: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [view, setView] = useState<View>('dashboard');
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [triggerNewOrder, setTriggerNewOrder] = useState(false);

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
        sessionStorage.removeItem('welcomeDismissed');
        setIsLoggedIn(false);
        setShowWelcomeModal(false);
    };

    const handleWelcomeNewOrder = () => {
        setView('orders');
        setTriggerNewOrder(true);
    };

    const handleWelcomeManagement = () => {
        setShowWelcomeModal(false);
        sessionStorage.setItem('welcomeDismissed', 'true');
    };

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard setView={setView} />;
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
            case 'events':
                return <Events />;
            case 'orders':
                return (
                    <OrderView
                        triggerNewOrder={triggerNewOrder}
                        onNewOrderTriggered={() => setTriggerNewOrder(false)}
                    />
                );
            default:
                return <Dashboard setView={setView} />;
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
                <Header onLogout={handleLogout} />
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar currentView={view} setView={setView} />
                    <div className="flex-1 overflow-y-auto">
                        {renderView()}
                    </div>
                </div>
            </div>
        </NotificationProvider>
    );
};

export default App;
