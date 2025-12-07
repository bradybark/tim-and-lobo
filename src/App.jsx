// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Briefcase, Sun, Moon, Package } from 'lucide-react';
import CompanyDashboard from './views/CompanyDashboard';

// --- Configuration ---
// access the variable from the .env file
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD; 
// ---------------------

const OrgCard = ({ name, description, primary, onClick }) => {
  return (
    <div className="rounded-3xl bg-slate-900/70 border border-slate-800/70 shadow-xl flex flex-col items-center px-10 py-8 max-w-sm w-full">
      <div className="w-32 h-20 rounded-2xl border border-dashed border-slate-600/70 flex items-center justify-center mb-6 bg-slate-900/60">
        <Package className="w-7 h-7 text-slate-300" />
      </div>
      <h2 className="text-lg font-semibold text-slate-50 mb-1 text-center">
        {name}
      </h2>
      <p className="text-xs text-slate-400 mb-6 text-center leading-relaxed">
        {description}
      </p>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center justify-center gap-2 text-xs font-medium px-5 py-2.5 rounded-xl transition-colors ${
          primary
            ? 'bg-emerald-500 text-white hover:bg-emerald-400'
            : 'bg-slate-100 text-slate-900 hover:bg-white dark:bg-slate-100 dark:text-slate-900'
        }`}
      >
        Open Dashboard
        <Briefcase className="w-4 h-4" />
      </button>
    </div>
  );
};

function App() {
  const [selectedOrg, setSelectedOrg] = useState(null); // 'lobo' | 'timothy' | null
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  // Tailwind dark mode via class on <html>
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  // When an org is chosen, show that org's dashboard
  if (selectedOrg) {
    const companyName =
      selectedOrg === 'lobo' ? 'Lobo Tool Company' : "Timothy's Toolbox";

    return (
      <CompanyDashboard
        orgKey={selectedOrg}
        initialCompanyName={companyName}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onBack={() => setSelectedOrg(null)}
      />
    );
  }

  // Org selection screen
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 flex items-center justify-center px-4">
      {/* Theme toggle in top-right */}
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

        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <OrgCard
            name="Lobo Tool Company"
            description="Manage inventory, tracking, and POs for Lobo Tools."
            primary={false}
            onClick={() => setSelectedOrg('lobo')}
          />
          <OrgCard
            name="Timothy's Toolbox"
            description="Manage inventory, tracking, and POs for Timothy's Toolbox."
            primary
            onClick={() => setSelectedOrg('timothy')}
          />
        </div>

        <p className="mt-10 text-[11px] text-center text-slate-500">
          v2.0 • Secure Local Storage • Auto-Save Enabled
        </p>
      </div>
    </div>
  );
}

export default App;
