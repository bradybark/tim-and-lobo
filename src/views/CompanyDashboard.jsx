// src/views/CompanyDashboard.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Package, ClipboardList, Truck, Sun, Moon, ArrowLeft, Settings as SettingsIcon, AlertTriangle, BarChart3
} from 'lucide-react';
import { toast } from 'sonner'; 
import { get, set } from 'idb-keyval';

import PlannerView from './PlannerView';
import InventoryLogView from './InventoryLogView';
import POView from './POView';
import VendorManagerView from './VendorManagerView';
import SettingsView from './SettingsView';
import ReportsView from './ReportsView';

import { useInventory } from '../context/InventoryContext';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import {
  exportPlannerExcel,
  exportFullWorkbook,
  exportLeadTimeReport,
  exportJsonBackup
} from '../utils/export';
import { optimizeImageLibrary } from '../utils/imageOptimizer';
import { createSnapshotUrl, parseSnapshotFromUrl, shortenUrl } from '../utils/share';

// Helper to convert Blob -> Base64 for JSON storage
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

  // --- Restore File Handle on Boot ---
  useEffect(() => {
    const restoreHandle = async () => {
      try {
        const handle = await get('db_file_handle');
        if (handle) {
          // Check permissions on load
          const opts = { mode: 'readwrite' };
          if ((await handle.queryPermission(opts)) === 'granted') {
             setCloudFileHandle(handle);
             setCloudStatus(`Restored connection to ${handle.name}`);
          } else {
             setCloudFileHandle(handle);
             setCloudStatus('⚠️ Permission verification needed'); 
          }
        }
      } catch (err) {
        console.error('Could not restore file handle:', err);
      }
    };
    restoreHandle();
  }, []);

  // --- Inventory Log Handlers ---
  const handleAddSnapshot = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const sku = formData.get('sku').trim();
    const qty = parseInt(formData.get('qty'), 10);
    const date = formData.get('date');

    if (!sku || isNaN(qty)) return;

    setSnapshots((prev) => [
      ...prev,
      {
        id: Date.now(),
        sku,
        qty,
        date,
      },
    ]);
    e.target.reset();
    toast.success(`Logged ${qty} units for ${sku}`);
  };

  const deleteSnapshot = (id) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    toast.error('Snapshot deleted');
  };

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
  const getFileName = (suffix) => `${orgKey === 'timothy' ? 'timothy' : 'lobo'}_${suffix}`;

  const prepareDataPayload = () => {
    return { 
      version: 1, 
      orgKey, 
      companyName, 
      exportedAt: new Date().toISOString(), 
      snapshots, 
      pos, 
      settings, 
      vendors,
    };
  };

  const prepareImagesPayload = async () => {
    const imagesBase64 = {};
    for (const [sku, blob] of Object.entries(skuImages)) {
      if (blob) {
         if (typeof blob === 'string') {
            imagesBase64[sku] = blob;
         } else {
            const url = URL.createObjectURL(blob);
            imagesBase64[sku] = await urlToBase64(url);
            URL.revokeObjectURL(url);
         }
      }
    }
    return {
      version: 1,
      orgKey,
      type: 'image_archive',
      exportedAt: new Date().toISOString(),
      skuImages: imagesBase64
    };
  };

  // --- Handlers for Buttons ---
  const handleExportDataOnly = () => {
    const payload = prepareDataPayload();
    exportJsonBackup(payload, getFileName(`database_${new Date().toISOString().slice(0,10)}.json`));
    toast.success('Database exported (Images excluded)');
  };

  const handleExportImagesOnly = async () => {
    toast.promise(async () => {
      const payload = await prepareImagesPayload();
      exportJsonBackup(payload, getFileName(`images_${new Date().toISOString().slice(0,10)}.json`));
    }, {
      loading: 'Packaging images...',
      success: 'Images exported successfully',
      error: 'Failed to export images'
    });
  };

  const handleExportFullBackup = async () => {
    const data = prepareDataPayload();
    const images = await prepareImagesPayload();
    const fullPayload = { ...data, skuImages: images.skuImages };
    exportJsonBackup(fullPayload, getFileName(`full_backup_${new Date().toISOString().slice(0,10)}.json`));
    return true;
  };

  const handleImportBackup = async (data) => {
    if (!data || typeof data !== 'object') {
        toast.error('Invalid backup file');
        return;
    }
    
    if (data.snapshots || data.pos || data.settings) {
      if (data.snapshots) setSnapshots(data.snapshots);
      if (data.pos) setPos(data.pos);
      if (data.settings) setSettings(data.settings);
      if (data.vendors) setVendors(data.vendors);
      toast.success('Database imported successfully');
    }

    if (data.skuImages) {
      setSkuImages(prev => ({ ...prev, ...data.skuImages }));
      toast.success(`Imported ${Object.keys(data.skuImages).length} images`);
    }
  };

  // --- Optimization Handler ---
  const handleOptimizeImages = async () => {
    const count = Object.keys(skuImages).length;
    if (count === 0) {
      toast.error("No images to optimize.");
      return;
    }

    toast.promise(async () => {
      const optimizedImages = await optimizeImageLibrary(skuImages);
      setSkuImages(optimizedImages); 
    }, {
      loading: `Optimizing ${count} images...`,
      success: 'Optimization complete! Library size reduced.',
      error: 'Failed to optimize images'
    });
  };

  // --- Excel Exports ---
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

  // --- Cloud Sync: OPEN + LINK (Unified) ---
  const handleLinkCloudFile = async () => {
    if (!window.showOpenFilePicker) {
        toast.error('Cloud sync requires Chrome, Edge, or Opera.');
        return;
    }

    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ accept: { 'application/json': ['.json'] } }],
        multiple: false,
      });

      const file = await handle.getFile();
      const text = await file.text();
      try {
        const json = JSON.parse(text);
        await handleImportBackup(json);
        toast.success('Database loaded from file');
      } catch (parseErr) {
        console.error("File parse error", parseErr);
        toast.error("Linked file is empty or invalid JSON. Starting fresh.");
      }
      
      await set('db_file_handle', handle);
      setCloudFileHandle(handle);
      setCloudStatus(`Linked to ${handle.name}`);
      toast.success('Sync connection established');

    } catch (err) { 
      console.log('Link cancelled', err);
    }
  };

  // --- Auto-Sync Logic ---
  useEffect(() => {
    if (!cloudFileHandle || !dataLoaded) return;
    const syncData = async () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      setCloudStatus('Syncing...');
      try {
        const data = prepareDataPayload();
        const images = await prepareImagesPayload();
        const fullPayload = { ...data, skuImages: images.skuImages };
        
        const opts = { mode: 'readwrite' };
        if ((await cloudFileHandle.queryPermission(opts)) !== 'granted') {
           await cloudFileHandle.requestPermission(opts);
        }

        const writable = await cloudFileHandle.createWritable();
        await writable.write(JSON.stringify(fullPayload, null, 2));
        await writable.close();
        setCloudStatus(`Linked to ${cloudFileHandle.name} · Synced ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        console.error("Sync failed", err);
        setCloudStatus('Sync paused. Re-link file in Settings if needed.');
      } finally {
        isSyncing.current = false;
      }
    };
    const timer = setTimeout(syncData, 2000);
    const handleBeforeUnload = (e) => { if (isSyncing.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { clearTimeout(timer); window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [cloudFileHandle, snapshots, pos, settings, vendors, skuImages, orgKey, companyName, dataLoaded]);

  // --- Prune Data ---
  const handlePruneData = (monthsToKeep) => {
    toast(`Delete data older than ${monthsToKeep} months?`, {
      description: "This action cannot be undone. A backup will be created automatically.",
      action: {
        label: "Backup & Delete",
        onClick: async () => {
          try {
             await handleExportFullBackup(); 
             toast.success("Safety backup created");
          } catch (err) {
             toast.error("Backup failed. Aborting cleanup.");
             return; 
          }
          const cutoffDate = new Date();
          cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
          const cutoffStr = cutoffDate.toISOString().split('T')[0];
          setSnapshots((prev) => prev.filter(s => s.date >= cutoffStr));
          setPos((prev) => prev.filter(p => !p.received || p.receivedDate >= cutoffStr));
          toast.success(`Cleanup Complete.`);
        },
      },
      duration: 8000,
    });
  };

  // --- SNAPSHOT URL LOGIC ---
  const handleCreateShareLink = async (isShortenEnabled) => {
    const payload = prepareDataPayload(); 
    try {
      let url = createSnapshotUrl(payload);
      
      if (isShortenEnabled) {
          const short = await shortenUrl(url);
          if (short) {
              url = short;
              toast.success("Short link generated!");
          } else {
              toast.warning("Shortener unavailable. Copied full link instead.");
          }
      }

      navigator.clipboard.writeText(url);
      if (!isShortenEnabled) toast.success("Snapshot URL copied to clipboard!");
    } catch (err) {
      console.error(err);
      toast.error("Data too large to create a URL link.");
    }
  };

  // Check for shared data on load
  useEffect(() => {
    if (!dataLoaded) return;
    
    const sharedData = parseSnapshotFromUrl();
    if (sharedData) {
      toast("Shared Snapshot Detected", {
        description: `Found inventory data. Load it?`,
        action: {
          label: "Load Snapshot",
          onClick: async () => {
            await handleImportBackup(sharedData); 
            // Clear hash
            window.history.replaceState(null, null, ' '); 
          }
        },
        duration: 10000,
      });
    }
  }, [dataLoaded]); 

  if (!dataLoaded) return <div className="p-10 text-center text-gray-500">Loading database...</div>;

  const tabs = [
    { id: 'inventory', label: 'Inventory Log', icon: Package },
    { id: 'pos', label: 'Purchase Orders', icon: Truck },
    { id: 'planner', label: 'Reorder Planner', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
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
            <InventoryLogView 
              snapshots={snapshots}
              pos={pos}
              skuImages={skuImages}
              handleAddSnapshot={handleAddSnapshot}
              deleteSnapshot={deleteSnapshot}
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
          {activeTab === 'reports' && (
            <ReportsView
              leadTimeStats={leadTimeStats}
              onExportLeadTimeReport={handleExportLeadTimeAction}
              snapshots={snapshots}
              pos={pos}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              onOpenVendors={() => setActiveTab('vendors')}
              onLinkCloudFile={handleLinkCloudFile}
              onExportData={handleExportDataOnly}
              onExportImages={handleExportImagesOnly}
              onImportBackup={handleImportBackup}
              cloudStatus={cloudStatus}
              onPruneData={handlePruneData}
              onOptimizeImages={handleOptimizeImages}
              onCreateShareLink={handleCreateShareLink}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default CompanyDashboard;