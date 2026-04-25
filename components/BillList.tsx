
import React, { useState, useMemo, useEffect } from 'react';
import { BillModel, Tag, InitiatorType, FilterConfig, BlocType, PlatformAlignment } from '../types';

interface Props {
  bills: BillModel[];
  onSelectBill: (bill: BillModel) => void;
  initialFilters?: FilterConfig;
  favorites: Set<number>;
  onToggleFavorite: (id: number) => void;
  reminders: Set<number>;
  onToggleReminder: (id: number) => void;
  isLoading?: boolean;
}

const BillCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 animate-pulse h-full">
    <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
        <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
        <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
    </div>
    <div className="h-7 w-3/4 bg-gray-200 rounded mb-4"></div>
    <div className="h-24 w-full bg-gray-100 rounded-lg mb-4"></div>
    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
         <div className="h-4 w-12 bg-gray-200 rounded"></div>
         <div className="flex gap-2">
            <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
            <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
         </div>
    </div>
  </div>
);

export const BillList: React.FC<Props> = ({ 
    bills, 
    onSelectBill, 
    initialFilters, 
    favorites, 
    onToggleFavorite,
    reminders,
    onToggleReminder,
    isLoading = false 
}) => {
  const [searchText, setSearchText] = useState('');
  const [filterTag, setFilterTag] = useState<Tag | 'All'>('All');
  const [filterType, setFilterType] = useState<InitiatorType | 'All'>('All');
  const [filterBloc, setFilterBloc] = useState<BlocType | 'All'>('All');
  const [filterParty, setFilterParty] = useState<string>(''); // NEW
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyReminders, setOnlyReminders] = useState(false);

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (initialFilters) {
        if (initialFilters.tag !== undefined) setFilterTag(initialFilters.tag);
        if (initialFilters.initiatorType !== undefined) setFilterType(initialFilters.initiatorType);
        if (initialFilters.blocType !== undefined) setFilterBloc(initialFilters.blocType);
        if (initialFilters.startDate !== undefined) setStartDate(initialFilters.startDate);
        if (initialFilters.endDate !== undefined) setEndDate(initialFilters.endDate);
        if (initialFilters.partyName !== undefined) setFilterParty(initialFilters.partyName); // NEW
        
        setOnlyFavorites(!!initialFilters.onlyFavorites);
        setOnlyReminders(!!initialFilters.onlyReminders);
        
        setPage(1);
    }
  }, [initialFilters]);

  const normalize = (str: string) => {
    return str.replace(/[\u0591-\u05C7]/g, "").toLowerCase(); // Strip niqqud
  };

  // Extract all available party names for the filter dropdown
  const allParties = useMemo(() => {
    const parties = new Set<string>();
    bills.forEach(b => {
      b.initiators.forEach(i => {
        if (i.party) parties.add(i.party);
      });
    });
    return Array.from(parties).sort();
  }, [bills]);

  const filteredBills = useMemo(() => {
    if (isLoading) return [];
    
    const search = normalize(searchText);
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Infinity;

    return bills.filter(bill => {
      if (onlyFavorites && !favorites.has(bill.id)) return false;
      if (onlyReminders && !reminders.has(bill.id)) return false;

      const matchesText = !search || 
        normalize(bill.name).includes(search) || 
        normalize(bill.displaySummary).includes(search) ||
        bill.initiators.some(i => normalize(i.name).includes(search));
      
      const matchesTag = filterTag === 'All' || bill.tag === filterTag;
      const matchesType = filterType === 'All' || bill.initiatorType === filterType;
      const matchesParty = !filterParty || bill.initiators.some(i => i.party === filterParty); // NEW
      
      let matchesBloc = true;
      if (filterBloc === BlocType.Coalition) matchesBloc = bill.isCoalition;
      else if (filterBloc === BlocType.Opposition) matchesBloc = !bill.isCoalition;

      const billDateStr = bill.lastUpdatedDate || bill.publicationDate;
      let matchesDate = true;
      if (billDateStr) {
          const billTime = new Date(billDateStr).getTime();
          const endTime = end === Infinity ? Infinity : end + 86400000; 
          matchesDate = billTime >= start && billTime < endTime;
      }

      return matchesText && matchesTag && matchesType && matchesBloc && matchesDate && matchesParty;
    });
  }, [bills, searchText, filterTag, filterType, filterBloc, filterParty, startDate, endDate, onlyFavorites, onlyReminders, favorites, reminders, isLoading]);

  const paginatedBills = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredBills.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBills, page]);

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Info Banner */}
      {(onlyFavorites || onlyReminders || filterParty) && (
          <div className={`p-4 rounded-xl flex items-center justify-between border ${onlyFavorites ? 'bg-amber-50 border-amber-100 text-amber-900' : onlyReminders ? 'bg-indigo-50 border-indigo-100 text-indigo-900' : 'bg-blue-50 border-blue-100 text-blue-900'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${onlyFavorites ? 'bg-amber-200' : onlyReminders ? 'bg-indigo-200' : 'bg-blue-200'}`}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-bold">
                        {onlyFavorites ? 'המועדפים שלי' : onlyReminders ? 'תזכורות ועדכונים' : `חוקים של מפלגת ${filterParty}`}
                    </h2>
                    <p className="text-sm opacity-80">מציג {filteredBills.length} תוצאות מסוננות</p>
                </div>
              </div>
              <button onClick={() => { setOnlyFavorites(false); setOnlyReminders(false); setFilterParty(''); }} className="text-sm font-bold underline">בטל סינון</button>
          </div>
      )}

      {/* Filters */}
      <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4 transition-opacity duration-300 ${isLoading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block">חיפוש חופשי</label>
            <input 
                type="text" 
                placeholder="חיפוש..." 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            />
            </div>
            
            <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">מפלגה</label>
            <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={filterParty}
                onChange={(e) => { setFilterParty(e.target.value); setPage(1); }}
            >
                <option value="">כל המפלגות</option>
                {allParties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            </div>

            <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">סטטוס</label>
            <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={filterTag}
                onChange={(e) => { setFilterTag(e.target.value as any); setPage(1); }}
            >
                <option value="All">כל הסטטוסים</option>
                <option value={Tag.Proposed}>בהליכי חקיקה</option>
                <option value={Tag.Passed}>אושר כחוק</option>
                <option value={Tag.Removed}>הוסרה/נפלה</option>
            </select>
            </div>

            <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">סוג יוזמה</label>
            <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value as any); setPage(1); }}
            >
                <option value="All">הכל</option>
                <option value={InitiatorType.Government}>ממשלתית</option>
                <option value={InitiatorType.Private}>פרטית</option>
            </select>
            </div>
            
            <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">שיוך פוליטי</label>
            <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={filterBloc}
                onChange={(e) => { setFilterBloc(e.target.value as any); setPage(1); }}
            >
                <option value="All">הכל</option>
                <option value={BlocType.Coalition}>קואליציה</option>
                <option value={BlocType.Opposition}>אופוזיציה</option>
            </select>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end border-t border-gray-100 pt-4">
            <div className="w-full md:w-auto">
                <label className="text-xs font-bold text-gray-500 mb-1 block">מתאריך (עדכון)</label>
                <input 
                    type="date"
                    className="w-full md:w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-600"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                />
            </div>
            <div className="w-full md:w-auto">
                <label className="text-xs font-bold text-gray-500 mb-1 block">עד תאריך</label>
                <input 
                    type="date"
                    className="w-full md:w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-600"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                />
            </div>
             <div className="flex-1 flex justify-end">
                <button 
                    onClick={() => {
                        setSearchText('');
                        setFilterTag('All');
                        setFilterType('All');
                        setFilterBloc('All');
                        setFilterParty('');
                        setStartDate('');
                        setEndDate('');
                    }}
                    className="text-sm text-blue-600 hover:underline"
                >
                    נקה סינונים
                </button>
            </div>
        </div>
      </div>

      {/* Results Info */}
      {!isLoading && (
          <div className="text-sm text-gray-500 font-medium">
            נמצאו {filteredBills.length} הצעות
          </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <BillCardSkeleton key={i} />)
        ) : (
            <>
                {paginatedBills.map(bill => (
                <BillCard 
                    key={bill.id} 
                    bill={bill} 
                    onClick={() => onSelectBill(bill)} 
                    isFavorite={favorites.has(bill.id)}
                    onToggleFavorite={onToggleFavorite}
                    isReminded={reminders.has(bill.id)}
                    onToggleReminder={onToggleReminder}
                />
                ))}
                {paginatedBills.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="text-gray-400 mb-2 text-lg">לא נמצאו תוצאות</div>
                    <div className="text-gray-400 text-sm">נסה לשנות את מסנני החיפוש</div>
                </div>
                )}
            </>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center gap-2 py-4">
            <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 rounded bg-white border hover:bg-gray-50 disabled:opacity-50 text-sm">הקודם</button>
            <span className="px-4 py-2 text-sm text-gray-600 font-medium bg-white rounded border">עמוד {page} מתוך {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-4 py-2 rounded bg-white border hover:bg-gray-50 disabled:opacity-50 text-sm">הבא</button>
        </div>
      )}
    </div>
  );
};

interface BillCardProps { 
  bill: BillModel; 
  onClick: () => void; 
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  isReminded: boolean;
  onToggleReminder: (id: number) => void;
}

const BillCard: React.FC<BillCardProps> = ({ bill, onClick, isFavorite, onToggleFavorite, isReminded, onToggleReminder }) => {
  const tagColor = {
    [Tag.Proposed]: 'bg-blue-100 text-blue-700 border-blue-200',
    [Tag.Passed]: 'bg-green-100 text-green-700 border-green-200',
    [Tag.Removed]: 'bg-red-50 text-red-600 border-red-100',
  }[bill.tag];

  const typeColor = bill.initiatorType === InitiatorType.Government 
    ? 'bg-purple-50 text-purple-700 border-purple-100' 
    : 'bg-amber-50 text-amber-700 border-amber-100';

  const visibleInitiators = bill.initiators.slice(0, 3);
  const remaining = bill.initiators.length - 3;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group relative" onClick={onClick}>
      <div className="absolute top-4 left-4 flex items-center gap-1 z-10">
          <button onClick={(e) => { e.stopPropagation(); onToggleReminder(bill.id); }} className={`p-2 rounded-full transition-all ${isReminded ? 'text-indigo-500 bg-indigo-50' : 'text-gray-300 hover:text-indigo-500 hover:bg-gray-50'}`}><svg className="w-5 h-5" fill={isReminded ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg></button>
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(bill.id); }} className={`p-2 rounded-full transition-all ${isFavorite ? 'text-yellow-400 bg-yellow-50' : 'text-gray-300 hover:text-yellow-400 hover:bg-gray-50'}`}><svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.545.044.76.742.34 1.108l-4.186 3.638a.563.563 0 00-.17.538l1.153 5.41c.12.563-.494.998-.95.728L12 17.654a.563.563 0 00-.524 0l-4.816 2.732c-.456.259-1.07-.165-.95-.729l1.153-5.41a.563.563 0 00-.17-.538l-4.186-3.638c-.42-.366-.205-1.064.34-1.108l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg></button>
      </div>

      <div className="pr-0 md:pr-2">
          <div className="flex items-center gap-2 mb-3 flex-wrap pl-20">
             <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${tagColor}`}>{bill.statusDesc}</span>
             <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${typeColor}`}>{bill.initiatorType === InitiatorType.Government ? 'ממשלתית' : 'פרטית'}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors mb-3 leading-snug pl-10">{bill.name}</h3>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-4 group-hover:bg-blue-50/30 group-hover:border-blue-100 transition-colors">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">תקציר החוק</h4>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{bill.displaySummary}</p>
          </div>
          {bill.initiators.length > 0 && (
            <div className="text-xs text-gray-600 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
              <span className="font-semibold text-gray-500">יוזמים:</span>
              {visibleInitiators.map((init, idx) => (
                 <div key={init.id} className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded-full">
                    <span className="font-medium">{init.name}</span>
                    {init.party && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] border border-blue-100 font-bold">{init.party}</span>}
                 </div>
              ))}
              {remaining > 0 && <span className="text-gray-400 text-[10px]">+{remaining} נוספים</span>}
            </div>
          )}
      </div>
      <div className="absolute bottom-4 left-5"><span className="text-xs text-gray-400">עודכן: {new Date(bill.lastUpdatedDate).toLocaleDateString('he-IL')}</span></div>
    </div>
  );
};
