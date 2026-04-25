
import React, { useEffect, useState } from 'react';
import { BillModel, Tag, InitiatorType, AIAnalysis } from '../types';
import { generateBillAnalysis } from '../services/aiService';

interface Props {
  bill: BillModel;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
  isReminded: boolean;
  onToggleReminder: (id: number) => void;
}

export const BillDetails: React.FC<Props> = ({ bill, onBack, isFavorite, onToggleFavorite, isReminded, onToggleReminder }) => {
  const [aiData, setAiData] = useState<AIAnalysis | null>(bill.aiAnalysis || null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    // If we don't have AI data yet, fetch it
    if (!aiData && !bill.aiAnalysis) {
      const fetchAi = async () => {
        setLoadingAi(true);
        const combinedText = (bill.summary || '') + ' ' + (bill.explanation || '');
        // If text is too short, don't bother, or mock it
        if (combinedText.length < 10) {
             setAiData({
                 currentSituation: "אין מספיק מידע לניתוח אוטומטי.",
                 proposedChange: "חסר טקסט מקור בהצעת החוק.",
                 beneficiaryPopulation: "לא ידוע"
             });
             setLoadingAi(false);
             return;
        }
        
        const result = await generateBillAnalysis(bill.name, combinedText);
        setAiData(result);
        setLoadingAi(false);
      };
      fetchAi();
    }
  }, [bill]);

  const tagColor = {
    [Tag.Proposed]: 'bg-blue-100 text-blue-700',
    [Tag.Passed]: 'bg-green-100 text-green-700',
    [Tag.Removed]: 'bg-red-100 text-red-700',
  }[bill.tag];

  return (
    <div className="animate-fade-in pb-12">
      <button 
        onClick={onBack}
        className="mb-4 flex items-center text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium"
      >
        <svg className="w-4 h-4 ml-1 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        חזרה לרשימה
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${tagColor}`}>
                {bill.statusDesc}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
                כנסת {bill.knessetNum}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${bill.initiatorType === InitiatorType.Government ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                {bill.initiatorType === InitiatorType.Government ? 'הצעת חוק ממשלתית' : 'הצעת חוק פרטית'}
                </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                {bill.name}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 mr-4">
              {/* Reminder Button */}
              <button 
                  onClick={() => onToggleReminder(bill.id)}
                  className={`p-3 rounded-full border transition-all ${isReminded ? 'bg-indigo-50 border-indigo-200 text-indigo-500' : 'bg-white border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-400'}`}
                  title={isReminded ? "בטל תזכורת" : "הוסף תזכורת"}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isReminded ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
              </button>

              {/* Favorite Button */}
              <button 
                  onClick={() => onToggleFavorite(bill.id)}
                  className={`p-3 rounded-full border transition-all ${isFavorite ? 'bg-yellow-50 border-yellow-200 text-yellow-500' : 'bg-white border-gray-200 text-gray-300 hover:border-yellow-300 hover:text-yellow-400'}`}
                  title={isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.545.044.76.742.34 1.108l-4.186 3.638a.563.563 0 00-.17.538l1.153 5.41c.12.563-.494.998-.95.728L12 17.654a.563.563 0 00-.524 0l-4.816 2.732c-.456.259-1.07-.165-.95-.729l1.153-5.41a.563.563 0 00-.17-.538l-4.186-3.638c-.42-.366-.205-1.064.34-1.108l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
              </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* AI Insight Card */}
            <section className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden ring-1 ring-indigo-50">
                
                <div className="bg-indigo-600 p-4 flex items-center gap-3 text-white">
                     <div className="bg-white/20 p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">ניתוח חכם</h2>
                        <p className="text-indigo-100 text-xs opacity-90">הסבר פשוט (באמצעות AI)</p>
                    </div>
                </div>

                {loadingAi ? (
                    <div className="p-6 space-y-4 animate-pulse">
                        <div className="h-12 bg-gray-100 rounded w-3/4"></div>
                        <div className="h-12 bg-gray-100 rounded w-full"></div>
                        <div className="h-12 bg-gray-100 rounded w-2/3"></div>
                    </div>
                ) : aiData ? (
                    <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-indigo-50">
                        
                         {/* 1. Beneficiaries */}
                         <div className="p-5 flex-1 bg-indigo-50/30">
                            <div className="flex items-center gap-2 mb-2 text-indigo-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <h3 className="font-bold text-sm uppercase">למי זה עוזר?</h3>
                            </div>
                            <p className="text-indigo-900 font-bold text-lg leading-snug">
                                {aiData.beneficiaryPopulation}
                            </p>
                        </div>

                        {/* 2. The Change */}
                        <div className="p-5 flex-[1.5]">
                             <h3 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                השינוי המוצע
                             </h3>
                             <p className="text-gray-800 text-sm leading-relaxed font-medium">
                                {aiData.proposedChange}
                             </p>
                             
                             <div className="mt-4 pt-4 border-t border-gray-100">
                                 <h3 className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                    המצב כיום
                                 </h3>
                                 <p className="text-gray-500 text-sm leading-relaxed">
                                    {aiData.currentSituation}
                                 </p>
                             </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 italic p-5 text-center">ניתוח לא זמין כרגע.</p>
                )}
            </section>

            {/* Original Summary */}
            <section>
              <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">תקציר רשמי</h2>
              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                {bill.displaySummary}
              </p>
              {bill.explanation && bill.explanation !== bill.displaySummary && (
                 <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h3 className="font-bold text-sm text-gray-700 mb-2">דברי הסבר מלאים</h3>
                    <div className="text-xs text-gray-600 max-h-40 overflow-y-auto leading-relaxed pr-2 custom-scrollbar">
                        {bill.explanation}
                    </div>
                 </div>
              )}
            </section>

            {bill.initiators.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">יוזמים ({bill.initiators.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bill.initiators.map((init) => (
                    <div key={init.id} className="flex items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-200">
                       <div className="bg-gray-100 text-gray-500 rounded-full p-2 ml-3 shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                       </div>
                       <div>
                          <div className="font-bold text-gray-900 text-sm">{init.name}</div>
                          <div className="text-xs flex flex-wrap gap-2 mt-1">
                             {init.role && (
                               <span className="text-gray-500">
                                 {init.role}
                               </span>
                             )}
                             {init.party && (
                               <span className="text-blue-600 font-medium">
                                 • {init.party}
                               </span>
                             )}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar Metadata */}
          <div className="bg-blue-50 p-5 rounded-xl h-fit space-y-5 border border-blue-100">
            <div>
              <label className="text-xs font-bold text-blue-800 uppercase">מזהה הצעה</label>
              <div className="text-gray-800 font-mono bg-white/50 px-2 py-1 rounded inline-block mt-1 text-sm">{bill.id}</div>
            </div>
            
            <div>
               <label className="text-xs font-bold text-blue-800 uppercase">תאריך עדכון אחרון</label>
               <div className="text-gray-800 text-sm">
                 {new Date(bill.lastUpdatedDate).toLocaleString('he-IL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
               </div>
            </div>

            {bill.publicationDate && (
                <div>
                <label className="text-xs font-bold text-blue-800 uppercase">תאריך פרסום</label>
                <div className="text-gray-800 text-sm">
                    {new Date(bill.publicationDate).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                </div>
            )}

            <div className="pt-4">
              <a 
                href={bill.officialUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm text-sm"
              >
                לצפייה באתר הכנסת
                <span className="mr-2">↗</span>
              </a>
              <p className="text-xs text-blue-400 text-center mt-2">נפתח בחלון חדש</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
