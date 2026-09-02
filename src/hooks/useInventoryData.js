// src/hooks/useInventoryData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { get, set } from 'idb-keyval';
import { readCompanyProfile, storeCompanyProfile } from '../utils/documentStorage';
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
  const [companyProfileStorageStatus, setCompanyProfileStorageStatus] = useState('browser-only');
  const profileStorageHydratedRef = useRef(false);

  useEffect(() => {
    outgoingOrdersRef.current = outgoingOrders;
  }, [outgoingOrders]);

  // 1. Load Data
  useEffect(() => {
    async function loadAllData() {
      setDataLoaded(false);
      setDataLoadError(null);
      profileStorageHydratedRef.current = false;
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
          savedDocumentStorageRootHandle,
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
          get('documentStorageRootHandle'),
          load(`${orgKey}_expenses`, seeds.expenses),
          load(`${orgKey}_expenseCategories`, seeds.expenseCategories),
          load(`${orgKey}_cogsHistory`, seeds.cogsHistory),
          load(`${orgKey}_shipments`, seeds.shipments),
          load(`${orgKey}_quotes`, []),
          get(`${orgKey}_lastModifiedAt`)
        ]);

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
                await set(`${orgKey}_cogsHistory`, hydratedCogsHistory);
            }
        }

        let hydratedCompany = savedMyCompany || {};
        let hydratedLogo = savedLogo || null;
        if (savedDocumentStorageRootHandle) {
          try {
            const permanentProfile = await readCompanyProfile({
              rootHandle: savedDocumentStorageRootHandle,
              orgKey,
            });
            profileStorageHydratedRef.current = true;
            if (permanentProfile) {
              hydratedCompany = permanentProfile.profile;
              hydratedLogo = permanentProfile.logo || null;
              await set(`${orgKey}_myCompany`, hydratedCompany);
              if (hydratedLogo) await set(`${orgKey}_logo`, hydratedLogo);
              setCompanyProfileStorageStatus('saved');
            } else {
              setCompanyProfileStorageStatus('browser-only');
            }
          } catch (profileError) {
            console.warn('Permanent company profile is not currently accessible', profileError);
            setCompanyProfileStorageStatus('reconnect-required');
          }
        } else {
          setCompanyProfileStorageStatus('browser-only');
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
        setMyCompany(hydratedCompany);
        setCompanyLogo(hydratedLogo);
        setDocumentStorageRootHandle(savedDocumentStorageRootHandle || null);
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

        setDataLoaded(true);
      } catch (err) {
        console.error("Failed to load data", err);
        setDataLoadError(err?.message || 'The saved application data could not be loaded.');
      }
    }
    loadAllData();
  }, [orgKey]);

  // 2. Auto-Save Data
  useEffect(() => {
    if (!dataLoaded) return;

    const handler = setTimeout(() => {
      const now = new Date().toISOString();
      set(`${orgKey}_snapshots`, snapshots);
      set(`${orgKey}_pos`, pos);
      set(`${orgKey}_settings`, settings);
      set(`${orgKey}_vendors`, vendors);
      set(`${orgKey}_customers`, customers);
      set(`${orgKey}_cogs`, cogs);
      set(`${orgKey}_websitePrices`, websitePrices);
      set(`${orgKey}_skuDescriptions`, skuDescriptions);
      set(`${orgKey}_outgoing`, outgoingOrders);
      set(`${orgKey}_internal`, internalOrders);
      set(`${orgKey}_invoices`, invoices);
      set(`${orgKey}_websiteOrders`, websiteOrders);
      set(`${orgKey}_myCompany`, myCompany);
      set(`${orgKey}_expenses`, expenses);
      set(`${orgKey}_expenseCategories`, expenseCategories);
      set(`${orgKey}_cogsHistory`, cogsHistory);
      set(`${orgKey}_shipments`, shipments);
      set(`${orgKey}_quotes`, quotes);
      set(`${orgKey}_lastModifiedAt`, now);
      setLastModifiedAt(now);

      console.log('Auto-saved data to IDB');
    }, 1000);

    return () => clearTimeout(handler);
  }, [snapshots, pos, settings, vendors, customers, cogs, websitePrices, skuDescriptions, outgoingOrders, internalOrders, invoices, websiteOrders, myCompany, expenses, expenseCategories, cogsHistory, shipments, quotes, orgKey, dataLoaded]);

  // Keep the organization profile mirrored in the shared OneDrive document root.
  useEffect(() => {
    if (!dataLoaded || !documentStorageRootHandle || !profileStorageHydratedRef.current) return;
    const handler = setTimeout(async () => {
      setCompanyProfileStorageStatus('saving');
      try {
        await storeCompanyProfile({
          rootHandle: documentStorageRootHandle,
          orgKey,
          profile: myCompany,
          logo: companyLogo,
        });
        setCompanyProfileStorageStatus('saved');
      } catch (error) {
        console.error('Failed to save permanent company profile', error);
        setCompanyProfileStorageStatus(
          /permission|reconnect/i.test(error?.message || '') ? 'reconnect-required' : 'error',
        );
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [companyLogo, dataLoaded, documentStorageRootHandle, myCompany, orgKey]);

  // Handle Updates
  const updateDocumentStorageRootHandle = useCallback(async (handle) => {
    await set('documentStorageRootHandle', handle);
    const permanentProfile = await readCompanyProfile({ rootHandle: handle, orgKey });
    profileStorageHydratedRef.current = true;
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
    setCompanyLogo(blob);
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
    myCompany, setMyCompany,
    companyLogo, handleLogoUpload,
    documentStorageRootHandle, updateDocumentStorageRootHandle,
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
