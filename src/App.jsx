// src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Briefcase, Sun, Moon, Package } from 'lucide-react';
import { Toaster } from 'sonner'; 
import CompanyDashboard from './views/CompanyDashboard';
import { getOrganizationConfig } from './utils/orgConfig';
import { InventoryProvider } from './context/InventoryContext'; 

const OrgCard = ({ name, description, themeColor, onClick }) => {
  const hasColor = Boolean(themeColor);

  return (
    <div className="h-full w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/70 shadow-xl flex flex-col items-center px-10 py-8 transition-transform hover:scale-[1.02] duration-300">
      <div className="shrink-0 w-32 h-20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-600/70 flex items-center justify-center mb-6 bg-slate-50 dark:bg-slate-900/60">
        <Package 
          className={`w-7 h-7 ${!hasColor ? 'text-slate-400 dark:text-slate-300' : ''}`} 
          style={hasColor ? { color: themeColor } : {}} 
        />
      </div>
      <h2 className="shrink-0 text-lg font-semibold text-slate-900 dark:text-slate-50 mb-1 text-center">
        {name}
      </h2>
      <p className="flex-grow text-xs text-slate-500 dark:text-slate-400 mb-6 text-center leading-relaxed flex items-center justify-center">
        {description}
      </p>
      <button
        type="button"
        onClick={onClick}
        style={hasColor ? { backgroundColor: themeColor } : {}}
        className={`shrink-0 inline-flex items-center justify-center gap-2 text-xs font-medium px-5 py-2.5 rounded-xl transition-all duration-200 ${
          hasColor
            ? 'text-white hover:brightness-110 hover:shadow-lg shadow-md'
            : 'bg-slate-900 text-slate-50 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
        }`}
      >
        Open Dashboard
        <Briefcase className="w-4 h-4" />
      </button>
    </div>
  );
};

function App() {
  const organizations = useMemo(() => getOrganizationConfig(), []);
  const [selectedOrg, setSelectedOrg] = useState(null); 

  // --- Theme Management ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  // --- DASHBOARD SCREEN ---
  if (selectedOrg) {
    return (
      <InventoryProvider orgKey={selectedOrg.id}>
        <Toaster position="top-center" richColors />
        <CompanyDashboard
          initialCompanyName={selectedOrg.name}
          orgKey={selectedOrg.id}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onBack={() => setSelectedOrg(null)}
        />
      </InventoryProvider>
    );
  }

  // --- ORG SELECTION SCREEN (Default) ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 flex items-center justify-center px-4">
      <Toaster position="top-center" richColors />

      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 p-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm"
      >
        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="max-w-4xl w-full">
        <h1 className="text-3xl md:text-4xl font-semibold text-center mb-10">
          Select Organization
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
          {organizations.map((org) => (
            <OrgCard
              key={org.id}
              name={org.name}
              description={org.description}
              themeColor={org.themeColor}
              onClick={() => setSelectedOrg(org)}
            />
          ))}
        </div>

        <p className="mt-10 text-[11px] text-center text-slate-500">
          v2.4 • Modular & Scalable • Local Storage
        </p>
      </div>
    </div>
  );
}

export default App;