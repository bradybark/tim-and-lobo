// src/hooks/useInventoryData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { createStore, get, promisifyRequest, set, setMany } from 'idb-keyval';
import { toast } from 'sonner';
import { getPoComponent } from '../utils/orgConfig';
import {
  COMPANY_LOGO_CHANGED_EVENT,
  hasDocumentStoragePermission,
  initializeDocumentStorageRoot,
  readCompanyProfile,
  storeCompanyProfile,
} from '../utils/documentStorage';
import {
  LOBO_SNAPSHOTS, LOBO_POS, LOBO_SETTINGS, LOBO_VENDORS,
  LOBO_CUSTOMERS, LOBO_COGS, LOBO_WEBSITE_PRICES, LOBO_OUTGOING, LOBO_INTERNAL, LOBO_INVOICES, LOBO_MY_COMPANY, LOBO_WEBSITE_ORDERS, LOBO_EXPENSES, LOBO_EXPENSE_CATEGORIES,
  TIMOTHY_SNAPSHOTS, TIMOTHY_POS, TIMOTHY_SETTINGS, TIMOTHY_VENDORS,
  TIMOTHY_CUSTOMERS, TIMOTHY_COGS, TIMOTHY_WEBSITE_PRICES, TIMOTHY_OUTGOING, TIMOTHY_INTERNAL, TIMOTHY_INVOICES, TIMOTHY_MY_COMPANY, TIMOTHY_WEBSITE_ORDERS, TIMOTHY_EXPENSES, TIMOTHY_EXPENSE_CATEGORIES
} from '../constants/seedData';

const inventoryStore = createStore('keyval-store', 'keyval');

const LEGACY_SEEDS = {
  lobo: {
    snapshots: LOBO_SNAPSHOTS,
    pos: LOBO_POS,
    settings: LOBO_SETTINGS,
    vendors: LOBO_VENDORS,
    customers: LOBO_CUSTOMERS,
    cogs: LOBO_COGS,
    websitePrices: LOBO_WEBSITE_PRICES,
    outgoing: LOBO_OUTGOING,
    internal: LOBO_INTERNAL,
    invoices: LOBO_INVOICES,
    websiteOrders: LOBO_WEBSITE_ORDERS,
    myCompany: LOBO_MY_COMPANY,
    expenses: LOBO_EXPENSES || [],
    expenseCategories: LOBO_EXPENSE_CATEGORIES || ['Freight', 'Inventory Samples', 'Software', 'Advertising', 'Taxes', 'Supplies', 'Bank Fees', 'Other'],
    cogsHistory: [],
    shipments: []
  },
  timothy: {
    snapshots: TIMOTHY_SNAPSHOTS,
    pos: TIMOTHY_POS,
    settings: TIMOTHY_SETTINGS,
    vendors: TIMOTHY_VENDORS,
    customers: TIMOTHY_CUSTOMERS,
    cogs: TIMOTHY_COGS,
    websitePrices: TIMOTHY_WEBSITE_PRICES,
    outgoing: TIMOTHY_OUTGOING,
    internal: TIMOTHY_INTERNAL,
    invoices: TIMOTHY_INVOICES,
    websiteOrders: TIMOTHY_WEBSITE_ORDERS,
    myCompany: TIMOTHY_MY_COMPANY,
    expenses: TIMOTHY_EXPENSES || [],
    expenseCategories: TIMOTHY_EXPENSE_CATEGORIES || ['Freight', 'Inventory Samples', 'Software', 'Advertising', 'Taxes', 'Supplies', 'Bank Fees', 'Other'],
    cogsHistory: [],
    shipments: []
  }
};

export function useInventoryData(orgKey) {
  const immediatePOWrites = getPoComponent(orgKey) === 'PurchaseOrderSystem';
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataLoadError, setDataLoadError] = useState(null);

  const [snapshots, setSnapshots] = useState([]);
  const [pos, setPos] = useState([]);
  const initialPOs = useRef([]);
  const [settings, setSettings] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [skuImages, setSkuImages] = useState({});
  const [customers, setCustomers] = useState([]);
  const [cogs, setCogs] = useState({});
  const [websitePrices, setWebsitePrices] = useState({});
  const [skuDescriptions, setSkuDescriptions] = useState({});
  const [outgoingOrders, setOutgoingOrders] = useState([]);
  const outgoingOrdersRef = useRef([]);
  const [internalOrders, setInternalOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [websiteOrders, setWebsiteOrders] = useState([]);
  const [myCompany, setMyCompany] = useState({});
  const [companyLogo, setCompanyLogo] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [cogsHistory, setCogsHistory] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [lastModifiedAt, setLastModifiedAt] = useState(null);

  // File System Handles (Not part of JSON export)
  const [documentStorageRootHandle, setDocumentStorageRootHandle] = useState(null);
  const [documentFolderStatus, setDocumentFolderStatus] = useState('checking');
  const [documentStorageLocationLabel, setDocumentStorageLocationLabel] = useState('');
  const [companyProfileStorageStatus, setCompanyProfileStorageStatus] = useState('browser-only');
  const [profileStorageReady, setProfileStorageReady] = useState(false);
  const lastInventory = useRef(null);
  const saveQueue = useRef(Promise.resolve());
  const needsInitialProfile = useRef(false);
  const profileEdits = useRef({ company: false, logo: false });
  const editCompany = useCallback((update) => {
    profileEdits.current.company = true;
    setMyCompany(update);
  }, []);
  // A reconnect can complete while the initial IndexedDB load is still reading an
  // older folder handle. Keep that older async work from replacing the newly
  // selected handle and incorrectly putting the UI back into reconnect-required.
  const documentStorageRevisionRef = useRef(0);
  useEffect(() => () => { documentStorageRevisionRef.current++; }, []);

  useEffect(() => {
    outgoingOrdersRef.current = outgoingOrders;
  }, [outgoingOrders]);

  // 1. Load Data
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setDataLoadError('Chrome is still reading the local inventory. You can keep waiting or retry the read.');
    }, 20000);
    async function loadAllData() {
      setDataLoaded(false);
      setDataLoadError(null);
      try {
        const seeds = LEGACY_SEEDS[orgKey] || LEGACY_SEEDS.lobo;

        const load = async (key, fallback) => {
          let val = await get(key);
          return val === undefined ? fallback : val;
        };

        const [
          savedSnaps, savedPos, savedSettings, savedVendors, savedImages,
          savedCustomers, savedCogs, savedWebsitePrices, savedSkuDescriptions, savedOutgoing,
          savedInternal, savedInvoices, savedWebsiteOrders,
          savedMyCompany, savedLogo,
          savedDocumentStorageLocationLabel,
          savedExpenses, savedExpenseCategories, savedCogsHistory, savedShipments, savedQuotes, savedLastModifiedAt
        ] = await Promise.all([
          load(`${orgKey}_snapshots`, seeds.snapshots),
          load(`${orgKey}_pos`, seeds.pos),
          load(`${orgKey}_settings`, seeds.settings),
          load(`${orgKey}_vendors`, seeds.vendors),
          get(`${orgKey}_images`),
          load(`${orgKey}_customers`, seeds.customers),
          load(`${orgKey}_cogs`, seeds.cogs),
          load(`${orgKey}_websitePrices`, seeds.websitePrices),
          load(`${orgKey}_skuDescriptions`, {}),
          load(`${orgKey}_outgoing`, seeds.outgoing),
          load(`${orgKey}_internal`, seeds.internal),
          load(`${orgKey}_invoices`, seeds.invoices),
          load(`${orgKey}_websiteOrders`, seeds.websiteOrders),
          load(`${orgKey}_myCompany`, seeds.myCompany),
          get(`${orgKey}_logo`),
          load('documentStorageLocationLabel', ''),
          load(`${orgKey}_expenses`, seeds.expenses),
          load(`${orgKey}_expenseCategories`, seeds.expenseCategories),
          load(`${orgKey}_cogsHistory`, seeds.cogsHistory),
          load(`${orgKey}_shipments`, seeds.shipments),
          load(`${orgKey}_quotes`, []),
          get(`${orgKey}_lastModifiedAt`)
        ]);
        if (!active) return;

        let hydratedCogsHistory = savedCogsHistory || [];
        if (orgKey === 'lobo') {
            const hasSeeded = hydratedCogsHistory.some(h => h.poNumber === 'Initial Seed' && h.sku === 'TSB8');
            if (!hasSeeded) {
                const seedData = [
                    { id: 'seed-1', sku: 'TSB8', date: '2025-06-01T12:00:00Z', poNumber: 'Initial Seed', oldAvgCogs: 0, receivedCogs: 6.606, newAvgCogs: 6.606, receivedQty: 0, previousQty: 0 },
                    { id: 'seed-2', sku: 'MST22', date: '2025-06-01T12:00:00Z', poNumber: 'Initial Seed', oldAvgCogs: 0, receivedCogs: 6.262, newAvgCogs: 6.262, receivedQty: 0, previousQty: 0 },
                    { id: 'seed-3', sku: 'MST18', date: '2025-06-01T12:00:00Z', poNumber: 'Initial Seed', oldAvgCogs: 0, receivedCogs: 6.062, newAvgCogs: 6.062, receivedQty: 0, previousQty: 0 },
                    { id: 'seed-4', sku: 'MST12', date: '2025-06-01T12:00:00Z', poNumber: 'Initial Seed', oldAvgCogs: 0, receivedCogs: 5.562, newAvgCogs: 5.562, receivedQty: 0, previousQty: 0 },
                    { id: 'seed-5', sku: 'TTSB85', date: '2025-06-01T12:00:00Z', poNumber: 'Initial Seed', oldAvgCogs: 0, receivedCogs: 6.137, newAvgCogs: 6.137, receivedQty: 0, previousQty: 0 },
                    { id: 'seed-6', sku: 'ACT', date: '2025-06-01T12:00:00Z', poNumber: 'Initial Seed', oldAvgCogs: 0, receivedCogs: 5.15, newAvgCogs: 5.15, receivedQty: 0, previousQty: 0 }
                ];
                hydratedCogsHistory = [...hydratedCogsHistory, ...seedData];
            }
        }

        setSnapshots(savedSnaps || []);
        initialPOs.current = savedPos || [];
        setPos(initialPOs.current);
        setSettings(savedSettings || []);
        setVendors(savedVendors || []);
        setCustomers(savedCustomers || []);
        setCogs(savedCogs || {});
        setWebsitePrices(savedWebsitePrices || {});
        setSkuDescriptions(savedSkuDescriptions || {});
        setOutgoingOrders(savedOutgoing || []);
        setInternalOrders(savedInternal || []);
        setInvoices(savedInvoices || []);
        setWebsiteOrders(savedWebsiteOrders || []);
        setMyCompany(savedMyCompany || {});
        setCompanyLogo(savedLogo || null);
        setDocumentStorageLocationLabel(savedDocumentStorageLocationLabel || '');
        setExpenses(savedExpenses || []);
        setExpenseCategories(savedExpenseCategories || seeds.expenseCategories || []);
        setCogsHistory(hydratedCogsHistory);
        setShipments(savedShipments || []);
        setQuotes(savedQuotes || []);
        setLastModifiedAt(savedLastModifiedAt || null);

        if (savedImages && typeof savedImages === 'object') {
          setSkuImages(savedImages);
        } else {
          setSkuImages({});
        }

        setDataLoadError(null);
        setDataLoaded(true);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load data", err);
        setDataLoadError(err?.message || 'The saved application data could not be loaded.');
      } finally {
        clearTimeout(timer);
      }
    }
    loadAllData();
    return () => { active = false; clearTimeout(timer); };
  }, [orgKey]);

  // Folder handles and file-backed logos can stall independently of inventory.
  useEffect(() => {
    if (!dataLoaded) return;
    const revision = documentStorageRevisionRef.current;
    let active = true;
    const current = () => active && revision === documentStorageRevisionRef.current;
    const timer = setTimeout(() => {
      if (current()) setDocumentFolderStatus('reconnect-required');
    }, 20000);
    async function restoreFolder() {
      try {
        const rootHandle = await get('documentStorageRootHandle');
        if (!current()) return;
        if (!rootHandle) {
          setDocumentFolderStatus('disconnected');
          return;
        }
        setDocumentStorageRootHandle(rootHandle);
        const granted = await hasDocumentStoragePermission(rootHandle, 'readwrite');
        if (current()) setDocumentFolderStatus(granted ? 'connected' : 'reconnect-required');
      } catch {
        if (current()) setDocumentFolderStatus('reconnect-required');
      } finally {
        clearTimeout(timer);
      }
    }
    restoreFolder();
    return () => { active = false; clearTimeout(timer); };
  }, [dataLoaded]);

  useEffect(() => {
    const rootHandle = documentStorageRootHandle;
    if (!rootHandle) return;
    let active = true;
    const timer = setTimeout(() => {
      if (active) setCompanyProfileStorageStatus('error');
    }, 20000);
    async function loadSharedProfile() {
      try {
        setCompanyProfileStorageStatus('checking');
        const stored = await readCompanyProfile({ rootHandle, orgKey });
        if (!active) return;
        if (stored) {
          if (!profileEdits.current.company) setMyCompany(stored.profile);
          if (stored.logo && !profileEdits.current.logo) {
            setCompanyLogo(stored.logo);
            set(`${orgKey}_logo`, stored.logo).catch(error => console.warn('Could not cache company logo', error));
          }
        }
        needsInitialProfile.current = !stored;
        setProfileStorageReady(true);
        setCompanyProfileStorageStatus(stored ? 'saved' : 'browser-only');
      } catch (error) {
        if (active) {
          console.warn('Shared company profile is unavailable', error);
          setCompanyProfileStorageStatus('reconnect-required');
        }
      } finally {
        clearTimeout(timer);
      }
    }
    loadSharedProfile();
    return () => { active = false; clearTimeout(timer); };
  }, [documentStorageRootHandle, orgKey]);

  // 2. Auto-Save Data
  useEffect(() => {
    if (!dataLoaded) return;

    const values = {
      snapshots, settings, vendors, customers, cogs, websitePrices, skuDescriptions,
      outgoing: outgoingOrders, internal: internalOrders, invoices, websiteOrders, myCompany,
      expenses, expenseCategories, cogsHistory, shipments, quotes,
    };
    if (!immediatePOWrites) values.pos = pos;
    // Opening a dashboard establishes a baseline. Only persist subsequent edits.
    if (!lastInventory.current) {
      lastInventory.current = values;
      return;
    }
    const persist = async () => {
      const changes = Object.entries(values)
        .filter(([key, value]) => value !== lastInventory.current[key])
        .map(([key, value]) => [`${orgKey}_${key}`, value]);
      if (!changes.length) return;
      const now = new Date().toISOString();
      try {
        await setMany([...changes, [`${orgKey}_lastModifiedAt`, now]]);
        lastInventory.current = values;
        setLastModifiedAt(now);
      } catch (error) {
        console.error('Inventory autosave failed', error);
      }
    };
    const handler = setTimeout(() => {
      saveQueue.current = saveQueue.current.then(persist);
    }, 1000);

    return () => clearTimeout(handler);
  }, [snapshots, pos, immediatePOWrites, settings, vendors, customers, cogs, websitePrices, skuDescriptions, outgoingOrders, internalOrders, invoices, websiteOrders, myCompany, expenses, expenseCategories, cogsHistory, shipments, quotes, orgKey, dataLoaded]);

  // Commit POs immediately. A delayed document attachment must merge into the
  // latest orders, including writes from another dashboard or browser window.
  const updatePurchaseOrders = useCallback((change) => {
    const committed = inventoryStore('readwrite', async store => {
      const key = `${orgKey}_pos`;
      const stored = await promisifyRequest(store.get(key));
      const next = typeof change === 'function' ? change(stored ?? initialPOs.current) : change;
      const now = new Date().toISOString();
      store.put(next, key);
      store.put(now, `${orgKey}_lastModifiedAt`);
      await promisifyRequest(store.transaction);
      setPos(next);
      setLastModifiedAt(now);
    });
    committed.catch(() => toast.error('Chrome could not save the purchase order changes.'));
    return committed;
  }, [orgKey]);

  // Keep the organization profile mirrored in the shared OneDrive document root.
  useEffect(() => {
    if (!dataLoaded || !documentStorageRootHandle || !profileStorageReady) return;
    if (!needsInitialProfile.current && !profileEdits.current.company && !profileEdits.current.logo) return;
    const handler = setTimeout(async () => {
      setCompanyProfileStorageStatus('saving');
      try {
        await storeCompanyProfile({
          rootHandle: documentStorageRootHandle,
          orgKey,
          profile: myCompany,
          logo: companyLogo,
        });
        needsInitialProfile.current = false;
        setCompanyProfileStorageStatus('saved');
      } catch (error) {
        console.error('Failed to save permanent company profile', error);
        setCompanyProfileStorageStatus(
          /permission|reconnect/i.test(error?.message || '') ? 'reconnect-required' : 'error',
        );
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [companyLogo, dataLoaded, documentStorageRootHandle, myCompany, orgKey, profileStorageReady]);

  // Handle Updates
  const updateDocumentStorageRootHandle = useCallback(async (handle) => {
    const revision = ++documentStorageRevisionRef.current;
    const current = () => revision === documentStorageRevisionRef.current;
    setDocumentFolderStatus('connecting');
    let timer;
    try {
      const connect = async () => {
        await initializeDocumentStorageRoot(handle);
        if (!current()) return;
        await set('documentStorageRootHandle', handle);
        if (!current()) return;
        if (handle !== documentStorageRootHandle) setProfileStorageReady(false);
        setDocumentStorageRootHandle(handle);
        setDocumentFolderStatus('connected');
      };
      await Promise.race([
        connect(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('The folder did not respond. Check that it opens in OneDrive, then choose it again.')), 20000);
        }),
      ]);
    } catch (error) {
      if (current()) {
        documentStorageRevisionRef.current++;
        setDocumentFolderStatus('reconnect-required');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }, [documentStorageRootHandle]);

  const updateDocumentStorageLocationLabel = useCallback(async (label) => {
    const normalizedLabel = String(label || '').trim();
    setDocumentStorageLocationLabel(normalizedLabel);
    await set('documentStorageLocationLabel', normalizedLabel);
  }, []);

  // 3. Image Handlers
  const handleImageUpload = useCallback(async (sku, blob) => {
    setSkuImages((prev) => ({ ...prev, [sku]: blob }));
    try {
      const currentImages = (await get(`${orgKey}_images`)) || {};
      const updatedImages = { ...currentImages, [sku]: blob };
      await set(`${orgKey}_images`, updatedImages);
    } catch (err) {
      console.error("Failed to save image to IDB", err);
    }
  }, [orgKey]);

  const handleLogoUpload = useCallback(async (blob) => {
    profileEdits.current.logo = true;
    setCompanyLogo(blob);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(COMPANY_LOGO_CHANGED_EVENT, {
        detail: { orgKey, logo: blob },
      }));
    }
    try {
      await set(`${orgKey}_logo`, blob);
    } catch (err) {
      console.error("Failed to save logo", err);
    }
  }, [orgKey]);

  // 4. Helper Functions for Orders
  const saveOutgoingOrder = useCallback(async (order) => {
    const currentOrders = outgoingOrdersRef.current;
    const exists = currentOrders.some(existingOrder => existingOrder.id === order.id);
    const updatedOrders = exists
      ? currentOrders.map(existingOrder => existingOrder.id === order.id ? order : existingOrder)
      : [...currentOrders, order];

    outgoingOrdersRef.current = updatedOrders;
    setOutgoingOrders(updatedOrders);
    await set(`${orgKey}_outgoing`, updatedOrders);
  }, [orgKey]);

  const deleteOutgoingOrder = useCallback((id) => {
    setOutgoingOrders(prev => prev.filter(o => o.id !== id));
  }, []);

  return {
    orgKey,
    dataLoaded,
    dataLoadError,
    snapshots, setSnapshots,
    pos, setPos: immediatePOWrites ? updatePurchaseOrders : setPos,
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
    myCompany, setMyCompany: editCompany,
    companyLogo, handleLogoUpload,
    documentStorageRootHandle, updateDocumentStorageRootHandle, documentFolderStatus,
    documentStorageLocationLabel, updateDocumentStorageLocationLabel,
    companyProfileStorageStatus,
    saveOutgoingOrder, deleteOutgoingOrder,
    expenses, setExpenses,
    expenseCategories, setExpenseCategories,
    cogsHistory, setCogsHistory,
    shipments, setShipments,
    quotes, setQuotes,
    lastModifiedAt
  };
}
