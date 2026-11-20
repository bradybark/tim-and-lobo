// src/hooks/useInventoryData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { get, set, setMany } from 'idb-keyval';
import {
  COMPANY_LOGO_CHANGED_EVENT,
  readCompanyProfile,
  storeCompanyProfile,
} from '../utils/documentStorage';
import {
  LOBO_SNAPSHOTS, LOBO_POS, LOBO_SETTINGS, LOBO_VENDORS,
  LOBO_CUSTOMERS, LOBO_COGS, LOBO_WEBSITE_PRICES, LOBO_OUTGOING, LOBO_INTERNAL, LOBO_INVOICES, LOBO_MY_COMPANY, LOBO_WEBSITE_ORDERS, LOBO_EXPENSES, LOBO_EXPENSE_CATEGORIES,
  TIMOTHY_SNAPSHOTS, TIMOTHY_POS, TIMOTHY_SETTINGS, TIMOTHY_VENDORS,
  TIMOTHY_CUSTOMERS, TIMOTHY_COGS, TIMOTHY_WEBSITE_PRICES, TIMOTHY_OUTGOING, TIMOTHY_INTERNAL, TIMOTHY_INVOICES, TIMOTHY_MY_COMPANY, TIMOTHY_WEBSITE_ORDERS, TIMOTHY_EXPENSES, TIMOTHY_EXPENSE_CATEGORIES
} from '../constants/seedData';

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
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataLoadError, setDataLoadError] = useState(null);

  const [snapshots, setSnapshots] = useState([]);
  const [pos, setPos] = useState([]);
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
        setPos(savedPos || []);
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
      if (current()) setCompanyProfileStorageStatus('reconnect-required');
    }, 20000);
    async function loadSharedProfile() {
      try {
        setCompanyProfileStorageStatus('checking');
        const rootHandle = await get('documentStorageRootHandle');
        if (!current()) return;
        if (!rootHandle) {
          setCompanyProfileStorageStatus('browser-only');
          return;
        }
        setDocumentStorageRootHandle(rootHandle);
        const stored = await readCompanyProfile({ rootHandle, orgKey });
        if (!current()) return;
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
        if (current()) {
          console.warn('Shared company profile is unavailable', error);
          setCompanyProfileStorageStatus('reconnect-required');
        }
      } finally {
        clearTimeout(timer);
      }
    }
    loadSharedProfile();
    return () => { active = false; clearTimeout(timer); };
  }, [dataLoaded, orgKey]);

  // 2. Auto-Save Data
  useEffect(() => {
    if (!dataLoaded) return;

    const values = {
      snapshots, pos, settings, vendors, customers, cogs, websitePrices, skuDescriptions,
      outgoing: outgoingOrders, internal: internalOrders, invoices, websiteOrders, myCompany,
      expenses, expenseCategories, cogsHistory, shipments, quotes,
    };
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
  }, [snapshots, pos, settings, vendors, customers, cogs, websitePrices, skuDescriptions, outgoingOrders, internalOrders, invoices, websiteOrders, myCompany, expenses, expenseCategories, cogsHistory, shipments, quotes, orgKey, dataLoaded]);

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
    documentStorageRevisionRef.current += 1;
    setCompanyProfileStorageStatus('saving');
    await set('documentStorageRootHandle', handle);
    const permanentProfile = await readCompanyProfile({ rootHandle: handle, orgKey });
    setProfileStorageReady(true);
    setDocumentStorageRootHandle(handle);
    if (permanentProfile) {
      setMyCompany(permanentProfile.profile);
      setCompanyLogo(permanentProfile.logo || null);
      await set(`${orgKey}_myCompany`, permanentProfile.profile);
      if (permanentProfile.logo) await set(`${orgKey}_logo`, permanentProfile.logo);
    } else {
      await storeCompanyProfile({ rootHandle: handle, orgKey, profile: myCompany, logo: companyLogo });
    }
    setCompanyProfileStorageStatus('saved');
  }, [companyLogo, myCompany, orgKey]);

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
    myCompany, setMyCompany: editCompany,
    companyLogo, handleLogoUpload,
    documentStorageRootHandle, updateDocumentStorageRootHandle,
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
