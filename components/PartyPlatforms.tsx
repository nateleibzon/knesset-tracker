
import React, { useState, useMemo } from 'react';
import { BillModel, Party, PartyStats, FilterConfig } from '../types';
import { PARTIES_DATA } from '../services/partyData';
import { calculateAllPartyStats } from '../services/partyAnalysis';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { LeaderboardTable } from './LeaderboardTable';

interface Props {
  bills: BillModel[];
  onSelectBill: (bill: BillModel) => void;
  onNavigateToList: (filters: FilterConfig) => void;
}

export const PartyPlatforms: React.FC<Props> = ({ bills, onSelectBill, onNavigateToList }) => {
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  
  const [drillFilter, setDrillFilter] = useState<{
      vote: 'for' | 'against',
      alignment: 'aligned' | 'conflicting'
  } | null>(null);

  const partyStats = useMemo(() => calculateAllPartyStats(bills), [bills]);
  const partyStatsMap = useMemo(() => {
      const map = new Map<number, PartyStats>();
      partyStats.forEach(s => map.set(s.party.id, s));
      return map;
  }, [partyStats]);

  const activeParty = selectedPartyId ? PARTIES_DATA.find(p => p.id === selectedPartyId) : null;
  const activeData = selectedPartyId ? partyStatsMap.get(selectedPartyId) : null;

  const getDrillDownBills = () => {
      if (!activeData || !drillFilter) return [];
      if (drillFilter.vote === 'for' && drillFilter.alignment === 'aligned') return activeData.billsForAligned;
      if (drillFilter.vote === 'against' && drillFilter.alignment === 'aligned') return activeData.billsAgainstAligned;
      if (drillFilter.vote === 'for' && drillFilter.alignment === 'conflicting') return activeData.billsForConflicting;
      if (drillFilter.vote === 'against' && drillFilter.alignment === 'conflicting') return activeData.billsAgainstConflicting;
      return [];
  };

  const drillList = getDrillDownBills();

  const handleStatClick = (partyId: number, vote: 'for' | 'against', alignment: 'aligned' | 'conflicting') => {
      setSelectedPartyId(partyId);
      setDrillFilter({ vote, alignment });
  };

  const scrollToPartyOrNavigate = (partyId: number) => {
    const element = document.getElementById(`party-card-${partyId}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-blue-300', 'transition-shadow', 'duration-500');
        setTimeout(() => element.classList.remove('ring-4', 'ring-blue-300'), 1500);
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-8 rounded-2xl shadow-lg text-white">
          <h1 className="text-3xl font-bold mb-2">מצעי מפלגות והצבעות</h1>
          <p className="text-slate-200 text-lg opacity-90 max-w-4xl leading-relaxed">
              המערכת מנתחת את נאמנות המפלגות למצע שלהן אל מול הצבעות בפועל. <br/>
              לחץ על מפלגה בטבלאות כדי לצפות בכרטיס המורחב שלה או לעבור לרשימת החוקים המלאה.
          </p>
      </div>

      {/* Top Stats Tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LeaderboardTable title="🏆 נאמנות למצע/גוש" data={partyStats} valueKey="loyaltyScore" valueLabel="%" colorScale="traffic" onRowClick={scrollToPartyOrNavigate} />
          <LeaderboardTable title="📝 הצעות חוק שהוגשו" data={partyStats} valueKey="totalProposed" valueLabel="הצעות" colorScale="blue" onRowClick={scrollToPartyOrNavigate} />
          <LeaderboardTable title="⚖️ חוקים שעברו" data={partyStats} valueKey="totalPassed" valueLabel="חוקים" colorScale="purple" onRowClick={scrollToPartyOrNavigate} />
      </div>

      {/* Grid Cards Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {PARTIES_DATA.map(party => {
              const stats = partyStatsMap.get(party.id);
              if (!stats) return null;

              const matchPercentage = stats.loyaltyScore;
              const consistentCount = stats.billsForAligned.length + stats.billsAgainstConflicting.length;
              const inconsistentCount = stats.billsForConflicting.length + stats.billsAgainstAligned.length;
              const pieData = [{ name: 'תואם', value: consistentCount, color: '#10b981' }, { name: 'סותר', value: inconsistentCount, color: '#ef4444' }];

              return (
                <div id={`party-card-${party.id}`} key={party.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col h-full ring-1 ring-black/5 scroll-mt-24">
                    <div className="h-2" style={{ backgroundColor: party.color }}></div>
                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{ backgroundColor: party.color }}>{party.logoChar}</div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{party.name}</h2>
                                    <div className="text-xs text-gray-500">עקרונות ומצע</div>
                                </div>
                            </div>
                            <button onClick={() => onNavigateToList({ partyName: party.name })} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg text-xs font-bold border border-blue-100 transition-colors">צפה בחוקים &larr;</button>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3">{party.description}</p>
                        
                        {consistentCount + inconsistentCount > 0 ? (
                            <div className="flex items-center gap-4 mb-6 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                                <div className="h-16 w-16 relative flex-shrink-0">
                                    <ResponsiveContainer><PieChart><Pie data={pieData} innerRadius={18} outerRadius={28} paddingAngle={0} dataKey="value" stroke="none">{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-bold text-gray-700">{matchPercentage}%</span></div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-gray-700 mb-1">מדד נאמנות</div>
                                    <div className="text-[10px] text-gray-500 leading-tight">ב-{matchPercentage}% מהמקרים, המפלגה הצביעה בהתאם לעקרונותיה.</div>
                                </div>
                            </div>
                        ) : <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center text-xs text-gray-400">לא נמצאו הצבעות רלוונטיות</div>}

                        <div className="border-t border-gray-100 pt-4 mt-auto">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 text-center tracking-wider">פירוט הצבעות (צפייה בחוקים)</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleStatClick(party.id, 'for', 'aligned')} className="relative p-2 rounded-lg border bg-white border-green-100 hover:border-green-300">
                                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-bl font-bold">תואם</div>
                                    <div className="text-xl font-bold text-gray-800 mt-2">{stats.billsForAligned.length}</div>
                                    <div className="text-[10px] text-gray-500">הישג</div>
                                </button>
                                <button onClick={() => handleStatClick(party.id, 'against', 'aligned')} className="relative p-2 rounded-lg border bg-white border-amber-100 hover:border-amber-300">
                                    <div className="absolute top-0 right-0 bg-amber-400 text-white text-[9px] px-1.5 py-0.5 rounded-bl font-bold">תואם</div>
                                    <div className="text-xl font-bold text-gray-800 mt-2">{stats.billsAgainstAligned.length}</div>
                                    <div className="text-[10px] text-gray-500">אילוץ</div>
                                </button>
                                <button onClick={() => handleStatClick(party.id, 'for', 'conflicting')} className="relative p-2 rounded-lg border bg-white border-red-100 hover:border-red-300">
                                     <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-bl font-bold">סותר</div>
                                    <div className="text-xl font-bold text-gray-800 mt-2">{stats.billsForConflicting.length}</div>
                                    <div className="text-[10px] text-gray-500">פשרה</div>
                                </button>
                                <button onClick={() => handleStatClick(party.id, 'against', 'conflicting')} className="relative p-2 rounded-lg border bg-white border-blue-100 hover:border-blue-300">
                                    <div className="absolute top-0 right-0 bg-red-400 text-white text-[9px] px-1.5 py-0.5 rounded-bl font-bold">סותר</div>
                                    <div className="text-xl font-bold text-gray-800 mt-2">{stats.billsAgainstConflicting.length}</div>
                                    <div className="text-[10px] text-gray-500">בלימה</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
              );
          })}
      </div>

      {selectedPartyId && drillFilter && activeParty && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPartyId(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                              <span className="w-3 h-3 rounded-full" style={{ background: activeParty.color }}></span>
                              {activeParty.name}: פירוט הצבעות
                          </h3>
                      </div>
                      <button onClick={() => setSelectedPartyId(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-1">
                      {drillList.length > 0 ? drillList.map(bill => (
                          <div key={bill.id} onClick={() => { onSelectBill(bill); setSelectedPartyId(null); }} className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md cursor-pointer transition-all bg-white group">
                              <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-gray-800 text-sm leading-snug group-hover:text-blue-700">{bill.name}</h4><span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-500">{bill.statusDesc}</span></div>
                              <p className="text-xs text-gray-600 line-clamp-2">{bill.displaySummary}</p>
                          </div>
                      )) : <div className="text-center py-12 text-gray-400">לא נמצאו חוקים בקטגוריה זו.</div>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
