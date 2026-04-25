
import React, { useState } from 'react';
import { User } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Mock Authentication Logic
    setTimeout(() => {
      if (!email || !password) {
        setError('נא למלא את כל השדות');
        setLoading(false);
        return;
      }
      
      if (password.length < 6) {
         setError('הסיסמה חייבת להכיל לפחות 6 תווים');
         setLoading(false);
         return;
      }

      // Simulate success
      const mockUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: isLogin ? (name || email.split('@')[0]) : name,
        email: email
      };
      
      onLogin(mockUser);
      setLoading(false);
      onClose();
      // Reset form
      setEmail('');
      setPassword('');
      setName('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      
      {/* Modal Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-fade-in transform transition-all">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header / Tabs */}
        <div className="flex text-center border-b border-gray-100">
           <button 
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-4 font-bold text-sm transition-colors ${isLogin ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              התחברות
           </button>
           <button 
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-4 font-bold text-sm transition-colors ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              הרשמה
           </button>
        </div>

        {/* Form Body */}
        <div className="p-8">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {isLogin ? 'ברוכים השבים!' : 'יצירת חשבון חדש'}
                </h2>
                <p className="text-gray-500 text-sm">
                    {isLogin ? 'שמחים לראות אותך שוב במעקב חוקי הכנסת' : 'הצטרף וקבל עדכונים חמים על החוקים שמעניינים אותך'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">שם מלא</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                            placeholder="ישראל ישראלי"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required={!isLogin}
                        />
                    </div>
                )}
                
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">כתובת מייל</label>
                    <input 
                        type="email" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">סיסמה</label>
                    <input 
                        type="password" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                
                {error && (
                    <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                         </svg>
                         {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex justify-center items-center"
                >
                    {loading ? (
                         <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        isLogin ? 'כניסה' : 'הרשמה'
                    )}
                </button>
            </form>
            
            <div className="mt-6 text-center">
                <p className="text-xs text-gray-400">
                    בלחיצה על {isLogin ? 'כניסה' : 'הרשמה'}, אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות של האתר.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
