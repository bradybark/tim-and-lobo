// src/views/CompanyDashboard.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Package, ClipboardList, Truck, Sun, Moon, ArrowLeft, Settings as SettingsIcon, AlertTriangle, BarChart3,
  Box, TrendingUp, RefreshCw, Globe, DollarSign, Link2, X
} from 'lucide-react';
import { toast } from 'sonner';
import { get, set } from 'idb-keyval';

import PlannerView from './PlannerView';
import InventoryLogView from './InventoryLogView';
import POView from './POView';
import PurchaseOrderSystem from './PurchaseOrderSystem';
import VendorManagerView from './VendorManagerView';
import SettingsView from './SettingsView';
import ReportsView from './ReportsView';
import OutgoingOrdersView from './OutgoingOrdersView';
import OutgoingReportsView from './OutgoingReportsView';
import CustomerManagerView from './CustomerManagerView';
import CogsManagerView from './CogsManagerView';
import InternalOrdersView from './InternalOrdersView';
import WebsiteOrdersView from './WebsiteOrdersView';
import ExpenseTrackingView from './ExpenseTrackingView';

import { useInventory } from '../context/InventoryContext';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import {
  exportPlannerExcel, exportFullWorkbook, exportLeadTimeReport, exportJsonBackup
} from '../utils/export';
import { hasFeature, getPoComponent } from '../utils/orgConfig';
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

  // Feature checks based on org config
  const has = (feature) => hasFeature(orgKey, feature);
  const poComponentType = getPoComponent(orgKey);

  // Check if any outgoing features are enabled
  const hasOutgoingSection = has('outgoingOrders') || has('internalOrders') || has('websiteOrders');

  // Helper to get initial tab
  const getInitialTab = () => {
    if (has('inventoryLog')) return 'inventory';
    if (has('purchaseOrders')) return 'pos';
    return 'settings';
  };

  // PARENT TABS: 'inventory' | 'outgoing'
  const [parentTab, setParentTab] = useState('inventory');

  // SUB TABS
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync state if orgKey changes while mounted (unlikely but safe)
  useEffect(() => {
    if (!has('inventoryLog') && activeTab === 'inventory') {
      setActiveTab(has('purchaseOrders') ? 'pos' : 'settings');
    }
  }, [orgKey]);

  // Consume Context
  const {
    dataLoaded,
    snapshots, setSnapshots,
    pos, setPos,
    settings, setSettings,
    vendors, setVendors,
    skuImages, setSkuImages,
    handleImageUpload,
    customers, setCustomers,
    cogs, setCogs,
    websitePrices, setWebsitePrices,
    skuDescriptions, setSkuDescriptions,
    outgoingOrders, setOutgoingOrders,
    internalOrders, setInternalOrders,
    invoices, setInvoices,
    websiteOrders, setWebsiteOrders,
    poBackupHandle, updatePoBackupHandle,
    invoiceBackupHandle, updateInvoiceBackupHandle,
    myCompany, companyLogo,
    expenses, setExpenses,
    expenseCategories, setExpenseCategories
  } = useInventory();

  // Rate/Metrics/Cloud Logic
  const [rateParams, setRateParams] = useState({ timeframe: 'last-period', customStart: '', customEnd: '' });
  const [cloudFileHandle, setCloudFileHandle] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('');
  const isSyncing = useRef(false);

  // Reconnect prompt state
  const [pendingReconnectHandle, setPendingReconnectHandle] = useState(null);
  const [pendingReconnectName, setPendingReconnectName] = useState('');
  const [reconnectDismissed, setReconnectDismissed] = useState(false);

  // Auto-backup state
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState(null);
  const [autoBackupFolderHandle, setAutoBackupFolderHandle] = useState(null);
  const autoBackupLoadedRef = useRef(false);
  const { plannerData, leadTimeStats } = useDashboardMetrics({ snapshots, pos, settings, rateParams });

  // Handlers
  const handleAddSnapshot = (e) => { e.preventDefault(); const formData = new FormData(e.target); const sku = formData.get('sku').trim(); const qty = parseInt(formData.get('qty'), 10); const date = formData.get('date'); if (!sku || isNaN(qty)) return; setSnapshots((prev) => [...prev, { id: Date.now(), sku, qty, date }]); e.target.reset(); toast.success(`Logged ${qty} units for ${sku}`); };
  const deleteSnapshot = (id) => { setSnapshots((prev) => prev.filter((s) => s.id !== id)); toast.error('Snapshot deleted'); };
  const updateSkuSetting = useCallback((sku, field, value) => { const val = Number.isNaN(Number(value)) ? 0 : Number(value); setSettings((prev) => { const exists = prev.find((s) => s.sku === sku); if (!exists) return [...prev, { sku, leadTime: 90, minDays: 60, targetMonths: 6, [field]: val }]; return prev.map((s) => (s.sku === sku ? { ...s, [field]: val } : s)); }); }, [setSettings]);
  const handleAddPO = (e) => { e.preventDefault(); const formData = new FormData(e.target); const poNumber = formData.get('poNumber').trim(); const sku = formData.get('sku').trim(); if (!poNumber || !sku) return; setPos((prev) => [...prev, { id: Date.now(), poNumber, sku, orderDate: formData.get('orderDate'), qty: Number(formData.get('qty')) || 0, eta: formData.get('eta'), received: false, receivedDate: '', vendor: '' }]); e.target.reset(); toast.success(`PO ${poNumber} created`); };
  const toggleReceivePO = (id) => { const today = new Date().toISOString().split('T')[0]; setPos((prev) => prev.map((p) => p.id === id ? { ...p, received: !p.received, receivedDate: !p.received ? today : '' } : p)); };
  const updateReceivedDate = (id, date) => setPos((prev) => prev.map((p) => p.id === id ? { ...p, receivedDate: date } : p));
  const deletePO = (id) => setPos((prev) => prev.filter((p) => p.id !== id));
  const updatePOVendor = (id, v) => setPos((prev) => prev.map((p) => p.id === id ? { ...p, vendor: v } : p));
  const addVendor = (name) => { const trimmed = name.trim(); if (!trimmed) return; setVendors((prev) => prev.some(v => v.name === trimmed) ? prev : [...prev, { id: Date.now(), name: trimmed }]); toast.success(`Vendor "${trimmed}" added`); };

  const handleClearPartnerShipping = () => {
    if (confirm("Clear all Partner Shipping amounts (Reset to $0)? This cannot be undone.")) {
      setOutgoingOrders(prev => prev.map(o => o.isPartnerShipping ? { ...o, isPartnerShipping: false } : o));
      toast.success("Partner shipping cleared");
    }
  };

  const prepareDataPayload = () => ({
    version: 2, orgKey, companyName, exportedAt: new Date().toISOString(),
    snapshots, pos, settings, vendors, customers, cogs, websitePrices, skuDescriptions, outgoingOrders,
    internalOrders, invoices, websiteOrders, expenses, expenseCategories
  });
  const prepareImagesPayload = async () => { const imagesBase64 = {}; for (const [sku, blob] of Object.entries(skuImages)) { if (blob) { if (typeof blob === 'string') { imagesBase64[sku] = blob; } else { const url = URL.createObjectURL(blob); imagesBase64[sku] = await urlToBase64(url); URL.revokeObjectURL(url); } } } return { version: 1, orgKey, type: 'image_archive', exportedAt: new Date().toISOString(), skuImages: imagesBase64 }; };

  const handleExportDataOnly = () => { exportJsonBackup(prepareDataPayload(), `${orgKey}_data.json`); toast.success('Exported'); };
  const handleExportImagesOnly = async () => { toast.promise(async () => { const p = await prepareImagesPayload(); exportJsonBackup(p, `${orgKey}_images.json`); }, { loading: 'Packaging...', success: 'Done', error: 'Failed' }); };
  const handleImportBackup = async (data) => {
    if (data.snapshots) setSnapshots(data.snapshots);
    if (data.pos) setPos(data.pos);
    if (data.settings) setSettings(data.settings);
    if (data.vendors) setVendors(data.vendors);
    if (data.customers) setCustomers(data.customers);
    if (data.cogs) setCogs(data.cogs);
    if (data.websitePrices) setWebsitePrices(data.websitePrices); // NEW
    if (data.outgoingOrders) setOutgoingOrders(data.outgoingOrders);
    if (data.internalOrders) setInternalOrders(data.internalOrders);
    if (data.invoices) setInvoices(data.invoices);
    if (data.websiteOrders) setWebsiteOrders(data.websiteOrders);
    if (data.expenses) setExpenses(data.expenses);
    if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
    if (data.skuDescriptions) setSkuDescriptions(data.skuDescriptions);
    if (data.skuImages) { setSkuImages(prev => ({ ...prev, ...data.skuImages })); }
    toast.success('Imported successfully');
  };

  const handleExportExcelAction = () => exportPlannerExcel(plannerData, 'planner.xlsx');
  const handleExportAllAction = () => exportFullWorkbook({ plannerData, snapshots, pos }, 'full.xlsx');
  const handleExportLeadTimeAction = () => exportLeadTimeReport({ pos, settings }, 'leadtime.xlsx');
  const handleLinkCloudFile = async () => { if (!window.showOpenFilePicker) return; try { const [handle] = await window.showOpenFilePicker({ types: [{ accept: { 'application/json': ['.json'] } }], multiple: false }); const file = await handle.getFile(); const text = await file.text(); try { const json = JSON.parse(text); handleImportBackup(json); } catch (e) { } await set(`${orgKey}_cloudFileHandle`, handle); setCloudFileHandle(handle); setCloudStatus(`Linked ${handle.name}`); setPendingReconnectHandle(null); setReconnectDismissed(false); } catch (e) { } };
  const handleCreateShareLink = async (shorten) => { try { let url = createSnapshotUrl(prepareDataPayload()); if (shorten) { const s = await shortenUrl(url); if (s) url = s; } navigator.clipboard.writeText(url); toast.success("Copied"); } catch (e) { toast.error("Too large"); } };
  const handleOptimizeImages = async () => { const opt = await optimizeImageLibrary(skuImages); setSkuImages(opt); };
  const handlePruneData = (m) => { /* existing logic */ };

  // --- Feature 1: Startup Reconnect (auto if permission persisted, else banner) ---
  useEffect(() => {
    if (!dataLoaded || cloudFileHandle) return;
    const checkSavedHandle = async () => {
      try {
        const savedHandle = await get(`${orgKey}_cloudFileHandle`);
        if (!savedHandle || !savedHandle.name) return;

        // queryPermission does NOT require a user gesture (unlike requestPermission)
        try {
          const status = await savedHandle.queryPermission({ mode: 'readwrite' });
          if (status === 'granted') {
            // Permission already persisted — reconnect silently
            const file = await savedHandle.getFile();
            const text = await file.text();
            try { const json = JSON.parse(text); handleImportBackup(json); } catch (e) { }
            setCloudFileHandle(savedHandle);
            setCloudStatus(`Linked ${savedHandle.name}`);
            return;
          }
        } catch (e) {
          // queryPermission not supported or failed, fall through to banner
        }

        // Permission not persisted — show reconnect banner for one-click reconnect
        setPendingReconnectHandle(savedHandle);
        setPendingReconnectName(savedHandle.name);
      } catch (e) {
        console.log('No saved file handle found');
      }
    };
    checkSavedHandle();
  }, [dataLoaded, orgKey, cloudFileHandle]);

  const handleReconnect = async () => {
    if (!pendingReconnectHandle) return;
    try {
      const permission = await pendingReconnectHandle.requestPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        const file = await pendingReconnectHandle.getFile();
        const text = await file.text();
        try { const json = JSON.parse(text); handleImportBackup(json); } catch (e) { }
        setCloudFileHandle(pendingReconnectHandle);
        setCloudStatus(`Linked ${pendingReconnectHandle.name}`);
        setPendingReconnectHandle(null);
        toast.success('Reconnected to backup file');
      } else {
        toast.error('Permission denied. Please link manually.');
        setPendingReconnectHandle(null);
      }
    } catch (e) {
      console.error('Reconnect failed', e);
      toast.error('Could not reconnect. Please link manually.');
      setPendingReconnectHandle(null);
    }
  };

  // --- Feature 2: Auto-Backup (every 30 minutes) ---
  useEffect(() => {
    if (!dataLoaded) return;
    const loadPref = async () => {
      const saved = await get(`${orgKey}_autoBackupEnabled`);
      if (saved !== undefined) setAutoBackupEnabled(saved);
      const savedFolder = await get(`${orgKey}_autoBackupFolderHandle`);
      if (savedFolder) setAutoBackupFolderHandle(savedFolder);
      autoBackupLoadedRef.current = true;
    };
    loadPref();
  }, [dataLoaded, orgKey]);

  const handleToggleAutoBackup = useCallback(async (enabled) => {
    setAutoBackupEnabled(enabled);
    await set(`${orgKey}_autoBackupEnabled`, enabled);
  }, [orgKey]);

  const handleSetAutoBackupFolder = useCallback(async () => {
    if (!window.showDirectoryPicker) return;
    try {
      const handle = await window.showDirectoryPicker();
      setAutoBackupFolderHandle(handle);
      await set(`${orgKey}_autoBackupFolderHandle`, handle);
      toast.success(`Auto-backup folder set: ${handle.name}`);
    } catch (e) {
      console.log('Folder picker cancelled');
    }
  }, [orgKey]);

  useEffect(() => {
    if (!dataLoaded || !autoBackupEnabled || !autoBackupLoadedRef.current) return;
    const runBackup = async () => {
      try {
        const data = prepareDataPayload();
        const json = JSON.stringify(data, null, 2);

        if (autoBackupFolderHandle) {
          // Write directly to the chosen folder
          try {
            const permission = await autoBackupFolderHandle.requestPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
              const fileHandle = await autoBackupFolderHandle.getFileHandle(`${orgKey}_autobackup.json`, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(json);
              await writable.close();
              setLastAutoBackupTime(new Date().toLocaleTimeString());
              return;
            }
          } catch (folderErr) {
            console.error('Folder write failed, falling back to download', folderErr);
          }
        }

        // Fallback: download to Downloads folder
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${orgKey}_autobackup.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setLastAutoBackupTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Auto-backup failed', err);
      }
    };
    const intervalId = setInterval(runBackup, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(intervalId);
  }, [dataLoaded, autoBackupEnabled, orgKey, autoBackupFolderHandle]);

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
        const writable = await cloudFileHandle.createWritable();
        await writable.write(JSON.stringify(fullPayload, null, 2));
        await writable.close();
        setCloudStatus(`Synced ${new Date().toLocaleTimeString()}`);
      } catch (err) { setCloudStatus('Sync paused'); }
      finally { isSyncing.current = false; }
    };
    const timer = setTimeout(syncData, 2000);
    return () => clearTimeout(timer);
  }, [cloudFileHandle, snapshots, pos, settings, vendors, customers, cogs, websitePrices, skuDescriptions, outgoingOrders, internalOrders, invoices, websiteOrders, expenses, expenseCategories, skuImages, dataLoaded]);



  if (!dataLoaded) return <div className="p-10 text-center text-gray-500">Loading database...</div>;

  // Build inventory tabs dynamically based on features
  const inventoryTabs = [
    has('inventoryLog') && { id: 'inventory', label: 'Inventory Log', icon: Package },
    has('purchaseOrders') && { id: 'pos', label: 'Purchase Orders', icon: Truck },
    has('reorderPlanner') && { id: 'planner', label: 'Reorder Planner', icon: ClipboardList },
    has('reports') && { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ].filter(Boolean);

  // Build outgoing tabs dynamically based on features
  const outgoingTabs = [
    has('outgoingOrders') && { id: 'outgoing', label: 'Outgoing Orders', icon: Box },
    has('internalOrders') && { id: 'internal', label: 'Internal Orders', icon: RefreshCw },
    has('websiteOrders') && { id: 'website', label: 'Website Orders', icon: Globe },
    hasOutgoingSection && { id: 'outgoing-reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ].filter(Boolean);

  // Build expenses tabs
  const expensesTabs = [
    { id: 'expenses-dashboard', label: 'Expense Tracking', icon: DollarSign },
  ];

  // Select current tabs based on parent tab
  const currentTabs = parentTab === 'outgoing' && hasOutgoingSection ? outgoingTabs
    : parentTab === 'expenses' ? expensesTabs
      : inventoryTabs;

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
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">Manager</span>
              </h1>
            </div>
          </div>
          <button onClick={onToggleTheme} className="self-start inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {isDarkMode ? 'Light' : 'Dark'}
          </button>
        </header>

        {hasOutgoingSection && (
          <div className="flex p-1 space-x-1 bg-gray-200 dark:bg-gray-800 rounded-xl w-fit">
            <button onClick={() => { setParentTab('inventory'); setActiveTab(has('inventoryLog') ? 'inventory' : 'pos'); }} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${parentTab === 'inventory' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Inventory</button>
            <button onClick={() => { setParentTab('outgoing'); setActiveTab(has('outgoingOrders') ? 'outgoing' : 'internal'); }} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${parentTab === 'outgoing' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Outgoing Orders</button>
            <button onClick={() => { setParentTab('expenses'); setActiveTab('expenses-dashboard'); }} className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${parentTab === 'expenses' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}><DollarSign className="w-4 h-4" /> Expenses</button>
          </div>
        )}

        <nav className="border-b border-gray-200 dark:border-gray-700 flex gap-4 overflow-x-auto custom-scroll">
          {currentTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap px-3 pb-2 pt-1 border-b-2 text-sm font-medium flex items-center gap-2 -mb-px transition-colors ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Reconnect Prompt Banner */}
        {!cloudFileHandle && pendingReconnectHandle && !reconnectDismissed && (
          <div className="mt-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/50 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400"><Link2 className="w-5 h-5" /></div>
              <div className="text-sm">
                <p className="font-semibold text-indigo-900 dark:text-indigo-100">Reconnect to Backup?</p>
                <p className="text-indigo-700 dark:text-indigo-300/80">Previously linked to <strong>{pendingReconnectName}</strong>. Click to resume live syncing.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleReconnect} className="whitespace-nowrap px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors shadow-sm">Reconnect</button>
              <button onClick={() => setReconnectDismissed(true)} className="p-2 rounded-lg text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {!cloudFileHandle && (!pendingReconnectHandle || reconnectDismissed) && (
          <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-800/50 text-amber-600 dark:text-amber-400"><AlertTriangle className="w-5 h-5" /></div>
              <div className="text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-100">Sync Not Active</p>
                <p className="text-amber-700 dark:text-amber-300/80">Data stored in browser. Link file to backup.</p>
              </div>
            </div>
            <button onClick={handleLinkCloudFile} className="whitespace-nowrap px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 text-sm font-semibold text-amber-900 dark:text-amber-100 transition-colors shadow-sm">Link File</button>
          </div>
        )}

        <main className="mt-4 relative z-0">
          {parentTab === 'inventory' && activeTab === 'planner' && has('reorderPlanner') && <PlannerView plannerData={plannerData} skuImages={skuImages} handleImageUpload={handleImageUpload} updateSkuSetting={updateSkuSetting} handleExportExcel={handleExportExcelAction} handleExportAll={handleExportAllAction} rateParams={rateParams} setRateParams={setRateParams} />}
          {parentTab === 'inventory' && activeTab === 'inventory' && has('inventoryLog') && <InventoryLogView snapshots={snapshots} pos={pos} skuImages={skuImages} handleAddSnapshot={handleAddSnapshot} deleteSnapshot={deleteSnapshot} />}
          {activeTab === 'pos' && has('purchaseOrders') && (
            poComponentType === 'PurchaseOrderSystem'
              ? <PurchaseOrderSystem pos={pos} updatePOs={setPos} vendors={vendors} skuImages={skuImages} poBackupHandle={poBackupHandle} invoiceBackupHandle={invoiceBackupHandle} myCompany={myCompany} companyLogo={companyLogo} />
              : <POView pos={pos} handleAddPO={handleAddPO} toggleReceivePO={toggleReceivePO} updateReceivedDate={updateReceivedDate} deletePO={deletePO} skuImages={skuImages} vendors={vendors} updatePOVendor={updatePOVendor} addVendor={addVendor} />
          )}
          {parentTab === 'inventory' && activeTab === 'vendors' && <VendorManagerView vendors={vendors} updateVendors={setVendors} onBack={() => setActiveTab('settings')} />}
          {parentTab === 'inventory' && activeTab === 'reports' && has('reports') && <ReportsView leadTimeStats={leadTimeStats} onExportLeadTimeReport={handleExportLeadTimeAction} snapshots={snapshots} pos={pos} />}

          {parentTab === 'outgoing' && activeTab === 'outgoing' && has('outgoingOrders') && <OutgoingOrdersView outgoingOrders={outgoingOrders} setOutgoingOrders={setOutgoingOrders} customers={customers} cogs={cogs} settings={settings} companyLogo={companyLogo} />}
          {parentTab === 'outgoing' && activeTab === 'internal' && has('internalOrders') && <InternalOrdersView internalOrders={internalOrders} setInternalOrders={setInternalOrders} invoices={invoices} setInvoices={setInvoices} customers={customers} cogs={cogs} settings={settings} />}
          {parentTab === 'outgoing' && activeTab === 'website' && has('websiteOrders') && <WebsiteOrdersView websiteOrders={websiteOrders} setWebsiteOrders={setWebsiteOrders} cogs={cogs} websitePrices={websitePrices} settings={settings} />}
          {parentTab === 'outgoing' && activeTab === 'outgoing-reports' && hasOutgoingSection && <OutgoingReportsView outgoingOrders={outgoingOrders} internalOrders={internalOrders} websiteOrders={websiteOrders} customers={customers} settings={settings} />}

          {parentTab === 'expenses' && activeTab === 'expenses-dashboard' && <ExpenseTrackingView expenses={expenses} setExpenses={setExpenses} expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories} />}


          {activeTab === 'settings' && (
            <SettingsView
              onOpenVendors={() => { setParentTab('inventory'); setActiveTab('vendors'); }}
              onOpenCustomers={() => setActiveTab('customers')}
              onOpenCogs={() => setActiveTab('cogs')}
              onLinkCloudFile={handleLinkCloudFile}
              onExportData={handleExportDataOnly}
              onExportImages={handleExportImagesOnly}
              onImportBackup={handleImportBackup}
              cloudStatus={cloudStatus}
              onPruneData={handlePruneData}
              onOptimizeImages={handleOptimizeImages}
              onCreateShareLink={handleCreateShareLink}
              onClearPartnerShipping={handleClearPartnerShipping}
              poBackupHandle={poBackupHandle}
              invoiceBackupHandle={invoiceBackupHandle}
              onSetPoHandle={updatePoBackupHandle}
              onSetInvoiceHandle={updateInvoiceBackupHandle}
              autoBackupEnabled={autoBackupEnabled}
              onToggleAutoBackup={handleToggleAutoBackup}
              lastAutoBackupTime={lastAutoBackupTime}
              autoBackupFolderHandle={autoBackupFolderHandle}
              onSetAutoBackupFolder={handleSetAutoBackupFolder}
            />
          )}
          {activeTab === 'customers' && <CustomerManagerView customers={customers} setCustomers={setCustomers} cogs={cogs} settings={settings} onBack={() => setActiveTab('settings')} />}
          {activeTab === 'cogs' && <CogsManagerView cogs={cogs} setCogs={setCogs} websitePrices={websitePrices} setWebsitePrices={setWebsitePrices} skuDescriptions={skuDescriptions} setSkuDescriptions={setSkuDescriptions} settings={settings} setSettings={setSettings} skuImages={skuImages} handleImageUpload={handleImageUpload} onBack={() => setActiveTab('settings')} />}
        </main>
      </div>
    </div>
  );
};

export default CompanyDashboard;