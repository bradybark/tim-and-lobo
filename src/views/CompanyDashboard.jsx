// views/CompanyDashboard.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { Package, ClipboardList, Truck, Sun, Moon, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import PlannerView from './PlannerView';
import InventoryLogView from './InventoryLogView';
import POView from './POView';
import VendorManagerView from './VendorManagerView';
import SettingsView from './SettingsView';

// Imports from our new refactored structure
import { getDaysDiff } from '../utils/date';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import {
  exportPlannerExcel,
  exportFullWorkbook,
  exportLeadTimeReport,
  exportJsonBackup
} from '../utils/export';
import {
  LOBO_SNAPSHOTS, LOBO_POS, LOBO_SETTINGS, LOBO_VENDORS,
  TIMOTHY_SNAPSHOTS, TIMOTHY_POS, TIMOTHY_SETTINGS, TIMOTHY_VENDORS
} from '../constants/seedData';

const CompanyDashboard = ({
  orgKey = 'lobo',
  initialCompanyName = 'Lobo Tool Company',
  isDarkMode,
  onToggleTheme,
  onBack,
}) => {
  const isTimothy = orgKey === 'timothy';
  const [companyName] = useState(initialCompanyName);
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Data State
  const [snapshots, setSnapshots] = useState(() => isTimothy ? TIMOTHY_SNAPSHOTS : LOBO_SNAPSHOTS);
  const [pos, setPos] = useState(() => isTimothy ? TIMOTHY_POS : LOBO_POS);
  const [settings, setSettings] = useState(() => isTimothy ? TIMOTHY_SETTINGS : LOBO_SETTINGS);
  const [vendors, setVendors] = useState(() => isTimothy ? TIMOTHY_VENDORS : LOBO_VENDORS);
  const [skuImages, setSkuImages] = useState({});

  // Cloud Sync State
  const [cloudFileHandle, setCloudFileHandle] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('');

  // 1. Calculations Hook
  const { plannerData, leadTimeStats } = useDashboardMetrics({ snapshots, pos, settings });

  // 2. Handlers
  const handleImageUpload = useCallback((sku, dataUrl) => {
    setSkuImages((prev) => ({ ...prev, [sku]: dataUrl }));
  }, []);

  const updateSkuSetting = useCallback((sku, field, value) => {
    const val = Number.isNaN(Number(value)) ? 0 : Number(value);
    setSettings((prev) => {
      const exists = prev.find((s) => s.sku === sku);
      if (!exists) return [...prev, { sku, leadTime: 90, minDays: 60, targetMonths: 6, [field]: val }];
      return prev.map((s) => (s.sku === sku ? { ...s, [field]: val } : s));
    });
  }, []);

  const handleAddSnapshot = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const sku = formData.get('sku').trim();
    if (!sku) return;
    setSnapshots((prev) => [...prev, {
      id: Date.now(),
      date: formData.get('date'),
      sku,
      qty: Number(formData.get('qty')) || 0
    }]);
    e.target.reset();
  };

  const deleteSnapshot = (id) => setSnapshots((prev) => prev.filter((s) => s.id !== id));

  const handleAddPO = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const poNumber = formData.get('poNumber').trim();
    const sku = formData.get('sku').trim();
    if (!poNumber || !sku) return;
    setPos((prev) => [...prev, {
      id: Date.now(),
      poNumber,
      sku,
      orderDate: formData.get('orderDate'),
      qty: Number(formData.get('qty')) || 0,
      eta: formData.get('eta'),
      received: false,
      receivedDate: '',
      vendor: ''
    }]);
    e.target.reset();
  };

  const toggleReceivePO = (id) => {
    const today = new Date().toISOString().split('T')[0];
    setPos((prev) => prev.map((p) => p.id === id ? { ...p, received: !p.received, receivedDate: !p.received ? today : '' } : p));
  };

  const updateReceivedDate = (id, date) => setPos((prev) => prev.map((p) => p.id === id ? { ...p, receivedDate: date } : p));
  const deletePO = (id) => setPos((prev) => prev.filter((p) => p.id !== id));
  const updatePOVendor = (id, v) => setPos((prev) => prev.map((p) => p.id === id ? { ...p, vendor: v } : p));

  const addVendor = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setVendors((prev) => prev.some(v => v.name === trimmed) ? prev : [...prev, { id: Date.now(), name: trimmed }]);
  };

  // 3. Export Handlers
  const getFileName = (suffix) => `${orgKey === 'timothy' ? 'timothy' : 'lobo'}_${suffix}`;
  
  const handleExportExcelAction = () => exportPlannerExcel(plannerData, getFileName('reorder_planner.xlsx'));
  
  const handleExportAllAction = () => exportFullWorkbook({ plannerData, snapshots, pos }, getFileName('inventory_workbook.xlsx'));
  
  const handleExportLeadTimeAction = () => exportLeadTimeReport({ pos, settings }, getFileName(`lead_time_${new Date().toISOString().slice(0,10)}.xlsx`));
  
  const handleExportBackup = () => {
    const payload = { version: 1, orgKey, companyName, exportedAt: new Date().toISOString(), snapshots, pos, settings, vendors, skuImages };
    exportJsonBackup(payload, getFileName(`backup_${new Date().toISOString().slice(0,10)}.json`));
  };

  const handleImportBackup = (data) => {
    if (!data || typeof data !== 'object') return alert('Invalid backup file');
    if (data.snapshots) setSnapshots(data.snapshots);
    if (data.pos) setPos(data.pos);
    if (data.settings) setSettings(data.settings);
    if (data.vendors) setVendors(data.vendors);
    if (data.skuImages) setSkuImages(data.skuImages);
    alert('Backup imported successfully.');
  };

  // 4. Cloud Sync Logic
  const handleLinkCloudFile = async () => {
    if (!window.showSaveFilePicker) return alert('Cloud sync requires Chrome/Edge/Opera.');
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: getFileName('cloud.json'), types: [{ accept: { 'application/json': ['.json'] } }] });
      setCloudFileHandle(handle);
      setCloudStatus(`Linked to ${handle.name}`);
    } catch (err) { /* cancelled */ }
  };

  useEffect(() => {
    if (!cloudFileHandle) return;
    const sync = async () => {
      try {
        const payload = { version: 1, orgKey, companyName, exportedAt: new Date().toISOString(), snapshots, pos, settings, vendors, skuImages };
        const writable = await cloudFileHandle.createWritable();
        await writable.write(JSON.stringify(payload, null, 2));
        await writable.close();
        setCloudStatus(`Linked to ${cloudFileHandle.name} · Synced ${new Date().toLocaleTimeString()}`);
      } catch (err) { setCloudStatus('Sync error'); }
    };
    sync();
  }, [cloudFileHandle, snapshots, pos, settings, vendors, skuImages, orgKey, companyName]);

  // 5. Render
  const tabs = [
    { id: 'inventory', label: 'Inventory Log', icon: Package },
    { id: 'pos', label: 'Purchase Orders', icon: Truck },
    { id: 'planner', label: 'Reorder Planner', icon: ClipboardList },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <span>{companyName}</span>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Inventory Manager</span>
              </h1>
            </div>
          </div>
          <button onClick={onToggleTheme} className="self-start inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {isDarkMode ? 'Light' : 'Dark'} mode
          </button>
        </header>

        <nav className="border-b border-gray-200 dark:border-gray-700 flex gap-4 overflow-x-auto custom-scroll">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 pb-2 pt-1 border-b-2 text-sm font-medium flex items-center gap-2 -mb-px transition-colors ${
                  activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        <main className="mt-4">
          {activeTab === 'planner' && (
            <PlannerView
              plannerData={plannerData}
              skuImages={skuImages}
              handleImageUpload={handleImageUpload}
              updateSkuSetting={updateSkuSetting}
              handleExportExcel={handleExportExcelAction}
              handleExportAll={handleExportAllAction}
            />
          )}
          {activeTab === 'inventory' && (
            <InventoryLogView
              snapshots={snapshots}
              handleAddSnapshot={handleAddSnapshot}
              deleteSnapshot={deleteSnapshot}
              skuImages={skuImages}
              pos={pos}
              getDaysDiff={getDaysDiff}
            />
          )}
          {activeTab === 'pos' && (
            <POView
              pos={pos}
              handleAddPO={handleAddPO}
              toggleReceivePO={toggleReceivePO}
              updateReceivedDate={updateReceivedDate}
              deletePO={deletePO}
              skuImages={skuImages}
              vendors={vendors}
              updatePOVendor={updatePOVendor}
              addVendor={addVendor}
            />
          )}
          {activeTab === 'vendors' && (
            <VendorManagerView vendors={vendors} updateVendors={setVendors} onBack={() => setActiveTab('settings')} />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              onOpenVendors={() => setActiveTab('vendors')}
              onLinkCloudFile={handleLinkCloudFile}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              cloudStatus={cloudStatus}
              leadTimeStats={leadTimeStats}
              onExportLeadTimeReport={handleExportLeadTimeAction}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default CompanyDashboard;