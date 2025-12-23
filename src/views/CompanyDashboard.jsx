// src/views/CompanyDashboard.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Package, ClipboardList, Truck, Sun, Moon, ArrowLeft, Settings as SettingsIcon, AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner'; 

import PlannerView from './PlannerView';
import InventoryLogView from './InventoryLogView';
import POView from './POView';
import VendorManagerView from './VendorManagerView';
import SettingsView from './SettingsView';

import { useInventory } from '../context/InventoryContext';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import {
  exportPlannerExcel,
  exportFullWorkbook,
  exportLeadTimeReport,
  exportJsonBackup
} from '../utils/export';

const urlToBase64 = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error converting image to base64', e);
    return null;
  }
};

const CompanyDashboard = ({
  orgKey = 'lobo',
  initialCompanyName,
  isDarkMode,
  onToggleTheme,
  onBack,
}) => {
  const [companyName] = useState(initialCompanyName);
  const [activeTab, setActiveTab] = useState('inventory');
  
  // --- Consume Context ---
  const {
    dataLoaded,
    snapshots, setSnapshots,
    pos, setPos,
    settings, setSettings,
    vendors, setVendors,
    skuImages, setSkuImages,
    handleImageUpload
  } = useInventory();

  // --- Sales Rate Config ---
  const [rateParams, setRateParams] = useState({
    timeframe: 'last-period', 
    customStart: '',
    customEnd: ''
  });

  const [cloudFileHandle, setCloudFileHandle] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('');
  const isSyncing = useRef(false);

  // --- Metrics ---
  const { plannerData, leadTimeStats } = useDashboardMetrics({ 
    snapshots, 
    pos, 
    settings, 
    rateParams 
  });

  // --- Legacy Handlers ---
  const updateSkuSetting = useCallback((sku, field, value) => {
    const val = Number.isNaN(Number(value)) ? 0 : Number(value);
    setSettings((prev) => {
      const exists = prev.find((s) => s.sku === sku);
      if (!exists) return [...prev, { sku, leadTime: 90, minDays: 60, targetMonths: 6, [field]: val }];
      return prev.map((s) => (s.sku === sku ? { ...s, [field]: val } : s));
    });
  }, [setSettings]);

  const handleAddPO = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const poNumber = formData.get('poNumber').trim();
    const sku = formData.get('sku').trim();
    if (!poNumber || !sku) return;
    setPos((prev) => [...prev, {
      id: Date.now(),
      poNumber, sku, orderDate: formData.get('orderDate'),
      qty: Number(formData.get('qty')) || 0,
      eta: formData.get('eta'), received: false, receivedDate: '', vendor: ''
    }]);
    e.target.reset();
    toast.success(`PO ${poNumber} created`);
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
    toast.success(`Vendor "${trimmed}" added`);
  };

  // --- Export/Sync Logic ---
  const prepareExportPayload = async () => {
    const imagesBase64 = {};
    for (const [sku, blob] of Object.entries(skuImages)) {
      if (blob) {
         const url = blob instanceof Blob ? URL.createObjectURL(blob) : blob;
         imagesBase64[sku] = await urlToBase64(url);
         if (blob instanceof Blob) URL.revokeObjectURL(url);
      }
    }

    return { 
      version: 1, orgKey, companyName, exportedAt: new Date().toISOString(), 
      snapshots, pos, settings, vendors, skuImages: imagesBase64 
    };
  };

  const getFileName = (suffix) => `${orgKey === 'timothy' ? 'timothy' : 'lobo'}_${suffix}`;
  
  const handleExportExcelAction = () => {
    exportPlannerExcel(plannerData, getFileName('reorder_planner.xlsx'));
    toast.success('Planner exported to Excel');
  };

  const handleExportAllAction = () => {
    exportFullWorkbook({ plannerData, snapshots, pos }, getFileName('inventory_workbook.xlsx'));
    toast.success('Full workbook exported');
  };

  const handleExportLeadTimeAction = () => {
    exportLeadTimeReport({ pos, settings }, getFileName(`lead_time_${new Date().toISOString().slice(0,10)}.xlsx`));
    toast.success('Lead time report exported');
  };
  
  const handleExportBackup = async () => {
    const payload = await prepareExportPayload();
    exportJsonBackup(payload, getFileName(`backup_${new Date().toISOString().slice(0,10)}.json`));
    // Note: We don't toast success here because it's used internally by prune, 
    // but the caller can toast if needed.
    return true; 
  };

  // Wrapper for manual button click
  const onManualExportBackup = async () => {
    await handleExportBackup();
    toast.success('Backup file created');
  };

  const handleImportBackup = async (data) => {
    if (!data || typeof data !== 'object') {
        toast.error('Invalid backup file');
        return;
    }
    if (data.snapshots) setSnapshots(data.snapshots);
    if (data.pos) setPos(data.pos);
    if (data.settings) setSettings(data.settings);
    if (data.vendors) setVendors(data.vendors);
    
    if (data.skuImages) {
      setSkuImages(data.skuImages); 
    }
    toast.success('Backup imported successfully');
  };

  const handleLinkCloudFile = async () => {
    if (!window.showSaveFilePicker) {
        toast.error('Cloud sync requires Chrome, Edge, or Opera.');
        return;
    }
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: getFileName('cloud.json'), types: [{ accept: { 'application/json': ['.json'] } }] });
      setCloudFileHandle(handle);
      setCloudStatus(`Linked to ${handle.name}`);
      toast.success('Successfully linked to cloud file');
    } catch (err) { /* cancelled */ }
  };

  useEffect(() => {
    if (!cloudFileHandle || !dataLoaded) return;
    const syncData = async () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      setCloudStatus('Syncing...');
      try {
        const payload = await prepareExportPayload();
        const writable = await cloudFileHandle.createWritable();
        await writable.write(JSON.stringify(payload, null, 2));
        await writable.close();
        setCloudStatus(`Linked to ${cloudFileHandle.name} · Synced ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        console.error("Sync failed", err);
        setCloudStatus('Sync error - Retry?');
        toast.error('Cloud sync failed');
      } finally {
        isSyncing.current = false;
      }
    };
    const timer = setTimeout(syncData, 2000);
    const handleBeforeUnload = (e) => { if (isSyncing.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { clearTimeout(timer); window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [cloudFileHandle, snapshots, pos, settings, vendors, skuImages, orgKey, companyName, dataLoaded]);

  // --- UPDATED: Safe Prune Data ---
  const handlePruneData = (monthsToKeep) => {
    toast(`Delete data older than ${monthsToKeep} months?`, {
      description: "This action cannot be undone. A backup will be created automatically.",
      action: {
        label: "Backup & Delete",
        onClick: async () => {
          // 1. SAFETY FIRST: Force a backup export before deleting
          try {
             // We use the internal handler logic
             await handleExportBackup(); 
             toast.success("Safety backup created");
          } catch (err) {
             console.error("Backup failed", err);
             toast.error("Backup failed. Aborting cleanup to protect data.");
             return; 
          }

          // 2. Proceed with deletion
          const cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
          const cutoffStr = cutoffDate.toISOString().split('T')[0];
          
          setSnapshots((prev) => prev.filter(s => s.date >= cutoffStr));
          setPos((prev) => prev.filter(p => !p.received || p.receivedDate >= cutoffStr));
          
          toast.success(`Cleanup Complete. Kept data from last ${monthsToKeep} months.`);
        },
      },
      cancel: {
        label: "Cancel",
      },
      duration: 8000, // Give them time to read and decide
    });
  };

  if (!dataLoaded) return <div className="p-10 text-center text-gray-500">Loading database...</div>;

  const tabs = [
    { id: 'inventory', label: 'Inventory Log', icon: Package },
    { id: 'pos', label: 'Purchase Orders', icon: Truck },
    { id: 'planner', label: 'Reorder Planner', icon: ClipboardList },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="w-full mx-auto px-6 py-6 space-y-6">
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

        {!cloudFileHandle && (
          <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
               <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-800/50 text-amber-600 dark:text-amber-400">
                 <AlertTriangle className="w-5 h-5" />
               </div>
               <div className="text-sm">
                 <p className="font-semibold text-amber-900 dark:text-amber-100">Sync Not Active</p>
                 <p className="text-amber-700 dark:text-amber-300/80">Your data is stored locally. Link a file to enable cloud backup.</p>
               </div>
            </div>
            <button onClick={handleLinkCloudFile} className="whitespace-nowrap px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 text-sm font-semibold text-amber-900 dark:text-amber-100 transition-colors shadow-sm">
              Link File
            </button>
          </div>
        )}

        <main className="mt-4">
          {activeTab === 'planner' && (
            <PlannerView
              plannerData={plannerData}
              skuImages={skuImages}
              handleImageUpload={handleImageUpload}
              updateSkuSetting={updateSkuSetting}
              handleExportExcel={handleExportExcelAction}
              handleExportAll={handleExportAllAction}
              rateParams={rateParams}
              setRateParams={setRateParams}
            />
          )}
          {activeTab === 'inventory' && (
            <InventoryLogView />
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
              onExportBackup={onManualExportBackup} // Use wrapper here
              onImportBackup={handleImportBackup}
              cloudStatus={cloudStatus}
              leadTimeStats={leadTimeStats}
              onExportLeadTimeReport={handleExportLeadTimeAction}
              snapshots={snapshots}
              pos={pos}
              onPruneData={handlePruneData}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default CompanyDashboard;