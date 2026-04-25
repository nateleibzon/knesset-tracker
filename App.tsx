
import React, { useEffect, useState, useCallback } from 'react';
import { fetchMetadata, fetchBills } from './services/knessetApi';
import { BillModel, KNS_Status, FilterConfig, User } from './types';
import { Dashboard } from './components/Dashboard';
import { BillList } from './components/BillList';
import { BillDetails } from './components/BillDetails';
import { PartyPlatforms } from './components/PartyPlatforms';
import { Spinner } from './components/Spinner';
import { AuthModal } from './components/AuthModal';

type View = 'dashboard' | 'list' | 'details' | 'platforms' | 'about';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedBill, setSelectedBill] = useState<BillModel | null>(null);
  const [bills, setBills] = useState<BillModel[]>([]);
  const [knessetNum, setKnessetNum] = useState<number>(25);
  const [statuses, setStatuses] = useState<KNS_Status[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [reminders, setReminders] = useState<Set<number>>(new Set());
  const [listFilters, setListFilters] = useState<FilterConfig | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);

  const loadData = useCallback(async (targetKnessetNum?: number) => {
    setLoading(true);
    try {
      const meta = await fetchMetadata();
      const currentKnesset = targetKnessetNum || meta.latestKnessetNum;
      setKnessetNum(currentKnesset);
      setStatuses(meta.statuses);
      const data = await fetchBills(currentKnesset, meta.statuses);
      setBills(data.bills);
      setIsMockData(data.isMock);
      localStorage.setItem('knesset_last_fetch', new Date().toISOString());
    } catch (err) {
      console.error("Critical App Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('knesset_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    const savedFavs = localStorage.getItem('knesset_favorites');
    if (savedFavs) setFavorites(new Set(JSON.parse(savedFavs)));
    const savedReminders = localStorage.getItem('knesset_reminders');
    if (savedReminders) setReminders(new Set(JSON.parse(savedReminders)));
    loadData();
  }, [loadData]);

  const toggleFavorite = (id: number) => {
      setFavorites(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          localStorage.setItem('knesset_favorites', JSON.stringify(Array.from(next)));
          return next;
      });
  };

  const toggleReminder = (id: number) => {
      setReminders(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          localStorage.setItem('knesset_reminders', JSON.stringify(Array.from(next)));
          return next;
      });
  };

  const handleLogin = (newUser: User) => {
      setUser(newUser);
      localStorage.setItem('knesset_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('knesset_user');
      setView('dashboard');
  };

  const handleBillSelect = (bill: BillModel) => {
    setSelectedBill(bill);
    setView('details');
    window.scrollTo(0, 0);
  };

  const handleDashboardNavigate = (filters: FilterConfig) => {
    setListFilters(filters);
    setView('list');
    window.scrollTo(0, 0);
  };

  const handleNavClick = (newView: View, filters?: FilterConfig) => {
      setView(newView);
      if (newView === 'list') {
          setListFilters(filters || { tag: 'All', initiatorType: 'All' });
      }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={handleLogin} />
      <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => handleNavClick('dashboard')}>
                <div className="bg-blue-600 text-white p-1.5 rounded-lg"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg></div>
                <span className="font-bold text-xl tracking-tight text-blue-900 hidden md:block">מעקב חוקי הכנסת</span>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8 sm:space-x-reverse">
                <NavButton active={view === 'dashboard'} onClick={() => handleNavClick('dashboard')}>סטטוס חוקים</NavButton>
                <NavButton active={view === 'list' && !listFilters?.onlyFavorites} onClick={() => handleNavClick('list')}>רשימה</NavButton>
                <NavButton active={view === 'platforms'} onClick={() => handleNavClick('platforms')}>מצעי מפלגות</NavButton>
                <NavButton active={view === 'list' && !!listFilters?.onlyFavorites} onClick={() => handleNavClick('list', { onlyFavorites: true })}>מועדפים</NavButton>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user ? <button onClick={handleLogout} className="text-sm font-bold text-red-500">התנתק</button> : <button onClick={() => setIsAuthModalOpen(true)} className="text-sm font-bold text-blue-600">התחבר</button>}
              <button onClick={() => loadData(knessetNum)} className={`p-2 rounded-full border ${loading ? 'animate-spin' : ''}`}><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' && <Dashboard bills={bills} onNavigateToList={handleDashboardNavigate} onNavigateToPlatforms={() => setView('platforms')} knessetNum={knessetNum} onKnessetNumChange={num => loadData(num)} />}
        {view === 'list' && <BillList bills={bills} onSelectBill={handleBillSelect} initialFilters={listFilters} favorites={favorites} onToggleFavorite={toggleFavorite} reminders={reminders} onToggleReminder={toggleReminder} isLoading={loading && bills.length === 0} />}
        {view === 'details' && selectedBill && <BillDetails bill={selectedBill} onBack={() => setView('list')} isFavorite={favorites.has(selectedBill.id)} onToggleFavorite={toggleFavorite} isReminded={reminders.has(selectedBill.id)} onToggleReminder={toggleReminder} />}
        {view === 'platforms' && <PartyPlatforms bills={bills} onSelectBill={handleBillSelect} onNavigateToList={handleDashboardNavigate} />}
        {view === 'about' && <div className="text-center py-20">עמוד אודות</div>}
      </main>
    </div>
  );
}

const NavButton = ({ children, active, onClick }: any) => (
  <button onClick={onClick} className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${active ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{children}</button>
);
