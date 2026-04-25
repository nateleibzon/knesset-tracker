
import React from 'react';
import { PartyStats } from '../types';

interface Props {
  title: string;
  data: PartyStats[];
  valueKey: 'loyaltyScore' | 'totalProposed' | 'totalPassed';
  valueLabel: string; // e.g., "%" or "חוקים"
  onRowClick?: (partyId: number) => void;
  onFooterClick?: () => void;
  colorScale?: 'traffic' | 'blue' | 'purple'; // Different color themes
  limit?: number; // Optional limit for rows
}

export const LeaderboardTable: React.FC<Props> = ({ title, data, valueKey, valueLabel, onRowClick, onFooterClick, colorScale = 'traffic', limit }) => {
  // Sort data desc
  let sortedData = [...data].sort((a, b) => b[valueKey] - a[valueKey]);
  
  // Apply limit if provided
  if (limit) {
      sortedData = sortedData.slice(0, limit);
  }

  const getColor = (score: number, max: number) => {
      if (colorScale === 'blue') return 'bg-blue-500';
      if (colorScale === 'purple') return 'bg-purple-500';
      
      // Traffic light logic (assumes score out of 100 usually, or relative)
      if (valueKey === 'loyaltyScore') {
          if (score >= 80) return 'bg-green-500';
          if (score >= 50) return 'bg-yellow-500';
          return 'bg-red-500';
      }
      return 'bg-indigo-500';
  };

  const getTextColor = (score: number) => {
      if (colorScale !== 'traffic') return 'text-gray-800';
      if (valueKey === 'loyaltyScore') {
        if (score >= 80) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
      }
      return 'text-gray-800';
  }

  const maxVal = Math.max(...data.map(d => d[valueKey])) || 1;

  return (
    <div 
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group h-full flex flex-col"
    >
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm md:text-base">{title}</h3>
             <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-right text-xs md:text-sm">
                <tbody className="divide-y divide-gray-50">
                    {sortedData.map((stat, idx) => (
                        <tr 
                            key={stat.party.id} 
                            className="hover:bg-blue-50/50 transition-colors"
                            onClick={() => onRowClick && onRowClick(stat.party.id)}
                        >
                            <td className="px-4 py-3 font-bold text-gray-400 w-8">#{idx + 1}</td>
                            <td className="px-2 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: stat.party.color }}>
                                        {stat.party.logoChar}
                                    </div>
                                    <span className="font-medium text-gray-700 truncate max-w-[100px]">{stat.party.name}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-left">
                                <span className={`font-bold ${getTextColor(stat[valueKey])}`}>
                                    {stat[valueKey]} <span className="text-[10px] font-normal text-gray-400">{valueLabel}</span>
                                </span>
                                {/* Mini Bar */}
                                <div className="h-1 bg-gray-100 rounded-full mt-1 w-20 ml-auto">
                                    <div 
                                        className={`h-full rounded-full ${getColor(stat[valueKey], maxVal)}`} 
                                        style={{ width: `${(stat[valueKey] / maxVal) * 100}%` }}
                                    ></div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {onFooterClick && (
            <div 
                className="p-3 text-center border-t border-gray-100 bg-gray-50/30 hover:bg-blue-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); onFooterClick(); }}
            >
                <span className="text-xs text-blue-600 font-bold flex items-center justify-center gap-1">
                    לצפייה בנתונים מלאים 
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </span>
            </div>
        )}
    </div>
  );
};
