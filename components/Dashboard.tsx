
import React, { useMemo, useState } from 'react';
import { BillModel, Tag, InitiatorType, FilterConfig, BlocType } from '../types';
import { calculateAllPartyStats } from '../services/partyAnalysis';
import { LeaderboardTable } from './LeaderboardTable';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';

interface Props {
  bills: BillModel[];
  onNavigateToList: (filters: FilterConfig) => void;
  onNavigateToPlatforms: () => void;
  knessetNum: number;
  onKnessetNumChange: (num: number) => void;
}

const COLORS = {
  [Tag.Proposed]: '#3B82F6', // Blue
  [Tag.Passed]: '#10B981',   // Green
  [Tag.Removed]: '#EF4444',  // Red
  Coalition: '#8b5cf6',      // Violet
  Opposition: '#f59e0b',     // Amber
};

type TimePeriod = 'all' | 'today' | 'week' | 'month' | 'custom';

export const Dashboard: React.FC<Props> = ({ bills, onNavigateToList, onNavigateToPlatforms, knessetNum, onKnessetNumChange }) => {
  // --- Filters State ---
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- Calculate Leaderboard Stats ---
  const partyStats = useMemo(() => calculateAllPartyStats(bills), [bills]);

  // --- Filter Logic ---
  const filteredBills = useMemo(() => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      
      return bills.filter(b => {
          const billDate = new Date(b.lastUpdatedDate); // Using Update Date for "Status" context
          const billTime = startOfDay(billDate);

          if (period === 'today') {
              return billTime === todayStart.getTime();
          }
          if (period === 'week') {
              const weekAgo = new Date(todayStart);
              weekAgo.setDate(weekAgo.getDate() - 7);
              return billTime >= weekAgo.getTime();
          }
          if (period === 'month') {
              const monthAgo = new Date(todayStart);
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              return billTime >= monthAgo.getTime();
          }
          if (period === 'custom') {
              if (!startDate && !endDate) return true;
              const s = startDate ? new Date(startDate).getTime() : -Infinity;
              const e = endDate ? new Date(endDate).getTime() : Infinity;
              return billTime >= s && billTime <= e;
          }
          return true; // 'all'
      });
  }, [bills, period, startDate, endDate]);

  
  // 1. KPI Stats (Calculated on Filtered Data)
  const kpi = useMemo(() => {
    return {
      total: filteredBills.length,
      proposed: filteredBills.filter(b => b.tag === Tag.Proposed).length,
      passed: filteredBills.filter(b => b.tag === Tag.Passed).length,
      removed: filteredBills.filter(b => b.tag === Tag.Removed).length,
      gov: filteredBills.filter(b => b.initiatorType === InitiatorType.Government).length,
      private: filteredBills.filter(b => b.initiatorType === InitiatorType.Private).length,
    };
  }, [filteredBills]);

  // 2. Status Distribution (Pie)
  const statusData = useMemo(() => [
    { name: 'בהליכי חקיקה', value: kpi.proposed, color: COLORS[Tag.Proposed] },
    { name: 'אושר כחוק', value: kpi.passed, color: COLORS[Tag.Passed] },
    { name: 'הוסרה/נפלה', value: kpi.removed, color: COLORS[Tag.Removed] },
  ].filter(d => d.value > 0), [kpi]);

  // 3. Private Bills Breakdown (Coalition vs Opposition)
  const privateBlocData = useMemo(() => {
      const privateBills = filteredBills.filter(b => b.initiatorType === InitiatorType.Private);
      const coalition = privateBills.filter(b => b.isCoalition).length;
      const opposition = privateBills.filter(b => !b.isCoalition).length;

      return [
          { name: 'קואליציה (פרטיות)', value: coalition, color: COLORS.Coalition },
          { name: 'אופוזיציה (פרטיות)', value: opposition, color: COLORS.Opposition },
      ].filter(d => d.value > 0);
  }, [filteredBills]);

  // 4. Monthly Activity (Stacked Bar)
  const monthlyData = useMemo(() => {
    const map = new Map<string, any>();
    const isAllTime = period === 'all';
    const last12Months = new Date();
    last12Months.setFullYear(last12Months.getFullYear() - 1);

    filteredBills.forEach(b => {
      if (!b.publicationDate && !b.lastUpdatedDate) return;
      const date = new Date(b.publicationDate || b.lastUpdatedDate);
      
      if (isAllTime && date < last12Months) return;
      
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, { name: key, [Tag.Proposed]: 0, [Tag.Passed]: 0, [Tag.Removed]: 0 });
      }
      const entry = map.get(key);
      entry[b.tag]++;
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredBills, period]);

  // 5. Cumulative Passed (Line)
  const cumulativeData = useMemo(() => {
    const passedBills = filteredBills
      .filter(b => b.tag === Tag.Passed && b.publicationDate)
      .sort((a, b) => new Date(a.publicationDate!).getTime() - new Date(b.publicationDate!).getTime());
    
    let count = 0;
    return passedBills.map(b => {
        count++;
        return {
            date: new Date(b.publicationDate!).toLocaleDateString('he-IL'),
            count
        }
    });
  }, [filteredBills]);

  // Handle Leaderboard Click: Go to bills list filtered by party
  const handlePartyLeaderboardClick = (partyId: number) => {
      const party = partyStats.find(s => s.party.id === partyId)?.party;
      if (party) {
          onNavigateToList({ partyName: party.name });
      }
  };


  return (
    <div className="space-y-8 animate-fade-in pb-8">
      
      {/* Top Bar: Knesset Selector & Period Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 w-full xl:w-auto">
              <span className="text-sm font-bold text-blue-900 whitespace-nowrap">בחר כנסת:</span>
              <select 
                value={knessetNum} 
                onChange={(e) => onKnessetNumChange(Number(e.target.value))}
                className="bg-white border border-blue-200 text-blue-900 text-sm rounded-md px-3 py-1 outline-none focus:ring-2 focus:ring-blue-400 font-bold"
              >
                  {[25, 24, 23, 22].map(n => (
                      <option key={n} value={n}>הכנסת ה-{n}</option>
                  ))}
              </select>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
            <div className="font-bold text-gray-700 text-sm whitespace-nowrap flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>סינון לפי תאריך:</span>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto w-full md:w-auto no-scrollbar">
                <FilterButton label="הכל" active={period === 'all'} onClick={() => setPeriod('all')} />
                <FilterButton label="היום" active={period === 'today'} onClick={() => setPeriod('today')} />
                <FilterButton label="שבוע אחרון" active={period === 'week'} onClick={() => setPeriod('week')} />
                <FilterButton label="חודש אחרון" active={period === 'month'} onClick={() => setPeriod('month')} />
                <FilterButton label="מותאם" active={period === 'custom'} onClick={() => setPeriod('custom')} />
            </div>
            {period === 'custom' && (
             <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 w-full md:w-auto animate-fade-in">
                 <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded px-2 py-1 outline-none" />
                 <span className="text-gray-400">-</span>
                 <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white border border-gray-300 text-gray-700 text-sm rounded px-2 py-1 outline-none" />
             </div>
            )}
          </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="סה״כ בטווח" value={kpi.total} color="bg-gray-600" onClick={() => onNavigateToList({})} />
        <KPICard label="בהליכי חקיקה" value={kpi.proposed} color="bg-blue-500" onClick={() => onNavigateToList({ tag: Tag.Proposed })} />
        <KPICard label="אושרו כחוק" value={kpi.passed} color="bg-green-500" onClick={() => onNavigateToList({ tag: Tag.Passed })} />
        <KPICard label="הוסרו מסדר היום" value={kpi.removed} color="bg-red-500" onClick={() => onNavigateToList({ tag: Tag.Removed })} />
        <KPICard label="ממשלתיות" value={kpi.gov} color="bg-purple-500" onClick={() => onNavigateToList({ initiatorType: InitiatorType.Government })} />
        <KPICard label="פרטיות" value={kpi.private} color="bg-amber-500" onClick={() => onNavigateToList({ initiatorType: InitiatorType.Private })} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">התפלגות סטטוסים</h3>
          <div className="h-64 w-full"><ResponsiveContainer><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{statusData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">הצעות פרטיות: קואליציה מול אופוזיציה</h3>
          {privateBlocData.length > 0 ? (
             <div className="h-64 w-full"><ResponsiveContainer><PieChart><Pie data={privateBlocData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} paddingAngle={2} dataKey="value">{privateBlocData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
          ) : <div className="h-64 flex items-center justify-center text-gray-400">אין נתונים להצגה</div>}
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">פעילות חקיקה לאורך זמן</h3>
          <div className="h-64 w-full text-xs"><ResponsiveContainer><BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey={Tag.Proposed} stackId="a" fill={COLORS[Tag.Proposed]} name="בהליכי חקיקה" /><Bar dataKey={Tag.Passed} stackId="a" fill={COLORS[Tag.Passed]} name="אושר כחוק" /><Bar dataKey={Tag.Removed} stackId="a" fill={COLORS[Tag.Removed]} name="הוסרה" /></BarChart></ResponsiveContainer></div>
        </div>
      </div>

      {/* Leaderboard Tables */}
      <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4 border-r-4 border-blue-500 pr-3">דירוגי מפלגות</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-80"><LeaderboardTable title="🏆 דירוג הנאמנות למצע" data={partyStats} valueKey="loyaltyScore" valueLabel="%" colorScale="traffic" onRowClick={handlePartyLeaderboardClick} onFooterClick={onNavigateToPlatforms} limit={5} /></div>
          <div className="h-80"><LeaderboardTable title="📝 שיאני הגשת הצעות" data={partyStats} valueKey="totalProposed" valueLabel="הצעות" colorScale="blue" onRowClick={handlePartyLeaderboardClick} onFooterClick={onNavigateToPlatforms} limit={5} /></div>
          <div className="h-80"><LeaderboardTable title="⚖️ שיאני חקיקה (עברו)" data={partyStats} valueKey="totalPassed" valueLabel="חוקים" colorScale="purple" onRowClick={handlePartyLeaderboardClick} onFooterClick={onNavigateToPlatforms} limit={5} /></div>
      </div>
    </div>
  );
};

const FilterButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}>{label}</button>
);

const KPICard = ({ label, value, color, onClick }: { label: string, value: number, color: string, onClick?: () => void }) => (
  <div onClick={onClick} className="bg-white rounded-xl shadow-sm p-4 border-b-4 border-gray-100 overflow-hidden relative cursor-pointer hover:shadow-md hover:bg-gray-50 transition-all group">
    <div className={`absolute top-0 left-0 right-0 h-1 ${color}`}></div>
    <div className="text-gray-500 text-sm font-medium">{label}</div>
    <div className="text-3xl font-bold text-gray-800 mt-1">{value}</div>
  </div>
);
