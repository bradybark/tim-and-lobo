// src/views/CompanyDashboard.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { Package, ClipboardList, Truck, Sun, Moon, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { get, set } from 'idb-keyval'; // Requires: npm install idb-keyval

import PlannerView from './PlannerView';
import InventoryLogView from './InventoryLogView';
import POView from './POView';
import VendorManagerView from './VendorManagerView';
import SettingsView from './SettingsView';

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

// --- Helper: Convert Object URL (or Blob) back to Base64 for JSON Export ---
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
  initialCompanyName = 'Lobo Tool Company',
  isDarkMode,
  onToggleTheme,
  onBack,
}) => {
  const isTimothy = orgKey === 'timothy';
  const [companyName] = useState(initialCompanyName);
  const [activeTab, setActiveTab] = useState('inventory');
  
  // --- Data State (Initialized Empty, Loaded Async) ---
  const [snapshots, setSnapshots] = useState([]);
  const [pos, setPos] = useState([]);
  const [settings, setSettings] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [skuImages, setSkuImages] = useState({}); // Stores ObjectURLs (strings) for display
  const [dataLoaded, setDataLoaded] = useState(false);

  // --- Sales Rate Config State ---
  const [rateParams, setRateParams] = useState({
    timeframe: 'last-period', 
    customStart: '',
    customEnd: ''
  });

  // Cloud Sync State
  const [cloudFileHandle, setCloudFileHandle] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('');

  // --- 1. Load Data with Migration Logic (LocalStorage -> IndexedDB) ---
  useEffect(() => {
    async function loadAllData() {
      try {
        // Helper: Try IDB -> then LocalStorage (Migrate) -> then Fallback
        const load = async (key, fallback) => {
          // 1. Try IndexedDB
          let val = await get(key);
          
          // 2. If empty, try LocalStorage (Migration Step)
          if (!val) {
            const lsVal = localStorage.getItem(key);
            if (lsVal) {
              try {
                val = JSON.parse(lsVal);
                // Migrate it to IDB immediately
                await set(key, val); 
                console.log(`Migrated ${key} from LocalStorage to IndexedDB`);
              } catch (e) {
                console.error(`Error parsing LS key ${key}`, e);
              }
            }
          }

          // 3. If still empty, use fallback
          return val || fallback;
        };

        // Load Tables
        const savedSnaps = await load(`${orgKey}_snapshots`, isTimothy ? TIMOTHY_SNAPSHOTS : LOBO_SNAPSHOTS);
        setSnapshots(savedSnaps);

        const savedPos = await load(`${orgKey}_pos`, isTimothy ? TIMOTHY_POS : LOBO_POS);
        setPos(savedPos);

        const savedSettings = await load(`${orgKey}_settings`, isTimothy ? TIMOTHY_SETTINGS : LOBO_SETTINGS);
        setSettings(savedSettings);

        const savedVendors = await load(`${orgKey}_vendors`, isTimothy ? TIMOTHY_VENDORS : LOBO_VENDORS);
        setVendors(savedVendors);

        // Load Images (Special handling for migration)
        let savedImages = await get(`${orgKey}_images`);
        
        // Migration for images: Check LocalStorage if IDB is empty
        if (!savedImages) {
          const lsImages = localStorage.getItem(`${orgKey}_images`);
          if (lsImages) {
            try {
              savedImages = JSON.parse(lsImages);
              // Note: These are legacy Base64 strings. We save them as-is to IDB.
              await set(`${orgKey}_images`, savedImages);
              console.log(`Migrated images for ${orgKey} from LocalStorage to IndexedDB`);
            } catch (e) {
              console.error("Error migrating images", e);
            }
          }
        }

        // Convert stored images (Blobs or Base64) to Object URLs for Display
        if (savedImages && typeof savedImages === 'object') {
          const urlMap = {};
          for (const [sku, blobOrString] of Object.entries(savedImages)) {
            if (blobOrString instanceof Blob) {
              // New format: Blob -> Object URL
              urlMap[sku] = URL.createObjectURL(blobOrString);
            } else {
              // Legacy format: Base64 String -> Use as is
              urlMap[sku] = blobOrString;
            }
          }
          setSkuImages(urlMap);
        } else {
          setSkuImages({});
        }

        setDataLoaded(true);
      } catch (err) {
        console.error("Failed to load data", err);
        // Fallback to prevent white screen
        setDataLoaded(true);
      }
    }
    loadAllData();
  }, [orgKey, isTimothy]);

  // --- 2. Auto-Save to IndexedDB (Immediate for small data) ---
  useEffect(() => {
    if (!dataLoaded) return;
    set(`${orgKey}_snapshots`, snapshots);
    set(`${orgKey}_pos`, pos);
    set(`${orgKey}_settings`, settings);
    set(`${orgKey}_vendors`, vendors);
    // Note: skuImages are saved individually in handleImageUpload to avoid overhead
  }, [snapshots, pos, settings, vendors, orgKey, dataLoaded]);

  // --- 3. Calculations Hook ---
  const { plannerData, leadTimeStats } = useDashboardMetrics({ 
    snapshots, 
    pos, 
    settings, 
    rateParams 
  });

  // --- 4. Handlers ---
  
  // UPDATED: Handle Blob upload
  const handleImageUpload = useCallback(async (sku, blob) => {
    // 1. Update Display State (Revoke old URL to free memory)
    setSkuImages((prev) => {
      const oldUrl = prev[sku];
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
      return { ...prev, [sku]: URL.createObjectURL(blob) };
    });

    // 2. Save the actual Blob to IndexedDB
    try {
      const currentImages = (await get(`${orgKey}_images`)) || {};
      const updatedImages = { ...currentImages, [sku]: blob };
      await set(`${orgKey}_images`, updatedImages);
    } catch (err) {
      console.error("Failed to save image to IDB", err);
    }
  }, [orgKey]);

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

  // --- Helper to Prepare Full Data for Export/Sync (Converts Blobs to Base64) ---
  const prepareExportPayload = async () => {
    const imagesBase64 = {};
    for (const [sku, url] of Object.entries(skuImages)) {
      if (url) {
        imagesBase64[sku] = await urlToBase64(url);
      }
    }

    return { 
      version: 1, 
      orgKey, 
      companyName, 
      exportedAt: new Date().toISOString(), 
      snapshots, 
      pos, 
      settings, 
      vendors, 
      skuImages: imagesBase64 // Export as Base64 strings for JSON compatibility
    };
  };

  // --- 5. Export Handlers ---
  const getFileName = (suffix) => `${orgKey === 'timothy' ? 'timothy' : 'lobo'}_${suffix}`;
  
  const handleExportExcelAction = () => exportPlannerExcel(plannerData, getFileName('reorder_planner.xlsx'));
  const handleExportAllAction = () => exportFullWorkbook({ plannerData, snapshots, pos }, getFileName('inventory_workbook.xlsx'));
  const handleExportLeadTimeAction = () => exportLeadTimeReport({ pos, settings }, getFileName(`lead_time_${new Date().toISOString().slice(0,10)}.xlsx`));
  
  const handleExportBackup = async () => {
    const payload = await prepareExportPayload();
    exportJsonBackup(payload, getFileName(`backup_${new Date().toISOString().slice(0,10)}.json`));
  };

  const handleImportBackup = async (data) => {
    if (!data || typeof data !== 'object') return alert('Invalid backup file');
    if (data.snapshots) setSnapshots(data.snapshots);
    if (data.pos) setPos(data.pos);
    if (data.settings) setSettings(data.settings);
    if (data.vendors) setVendors(data.vendors);
    
    // Convert Base64 strings back to Blobs for IDB
    if (data.skuImages) {
      const newUrlMap = {};
      const newBlobMap = {};
      
      for (const [sku, base64] of Object.entries(data.skuImages)) {
        try {
          const res = await fetch(base64);
          const blob = await res.blob();
          newBlobMap[sku] = blob;
          newUrlMap[sku] = URL.createObjectURL(blob);
        } catch (e) {
          console.error("Error processing imported image", sku, e);
        }
      }
      
      setSkuImages(newUrlMap);
      await set(`${orgKey}_images`, newBlobMap);
    }
    alert('Backup imported successfully.');
  };

  // --- 6. Cloud Sync Logic (Debounced + Safety) ---
  const handleLinkCloudFile = async () => {
    if (!window.showSaveFilePicker) return alert('Cloud sync requires Chrome/Edge/Opera.');
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: getFileName('cloud.json'), types: [{ accept: { 'application/json': ['.json'] } }] });
      setCloudFileHandle(handle);
      setCloudStatus(`Linked to ${handle.name}`);
    } catch (err) { /* cancelled */ }
  };

  // Debounced Sync Effect with "Close Protection"
  useEffect(() => {
    if (!cloudFileHandle || !dataLoaded) return;

    // 1. Notify user & Prevent Close
    setCloudStatus('Waiting to sync...');
    
    // Safety Listener: Prevents closing tab while "Waiting"
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Data is syncing. Are you sure you want to exit?';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 2. Wait 2 seconds after the last change
    const timeoutId = setTimeout(async () => {
      try {
        setCloudStatus('Syncing...');
        const payload = await prepareExportPayload();
        const writable = await cloudFileHandle.createWritable();
        await writable.write(JSON.stringify(payload, null, 2));
        await writable.close();
        
        setCloudStatus(`Linked to ${cloudFileHandle.name} · Synced ${new Date().toLocaleTimeString()}`);
        
        // 3. Sync Done: Safe to close
        window.removeEventListener('beforeunload', handleBeforeUnload);
      } catch (err) { 
        console.error(err);
        setCloudStatus('Sync error'); 
      }
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      // Clean up listener if component unmounts or effect re-runs
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cloudFileHandle, snapshots, pos, settings, vendors, skuImages, orgKey, companyName, dataLoaded]);

  // --- 7. Render ---
  if (!dataLoaded) return <div className="p-10 text-center text-gray-500">Loading database...</div>;

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
              rateParams={rateParams}
              setRateParams={setRateParams}
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
              snapshots={snapshots}
              pos={pos}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default CompanyDashboard;