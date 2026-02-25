// src/hooks/useInventoryData.js
import { useState, useEffect, useCallback } from 'react';
import { get, set } from 'idb-keyval';
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
    expenseCategories: LOBO_EXPENSE_CATEGORIES || ['Freight', 'Inventory Samples', 'Software', 'Advertising', 'Taxes', 'Supplies', 'Bank Fees', 'Other']
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
    expenseCategories: TIMOTHY_EXPENSE_CATEGORIES || ['Freight', 'Inventory Samples', 'Software', 'Advertising', 'Taxes', 'Supplies', 'Bank Fees', 'Other']
  }
};

export function useInventoryData(orgKey) {
  const [dataLoaded, setDataLoaded] = useState(false);

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
  const [internalOrders, setInternalOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [websiteOrders, setWebsiteOrders] = useState([]);
  const [myCompany, setMyCompany] = useState({});
  const [companyLogo, setCompanyLogo] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);

  // File System Handles (Not part of JSON export)
  const [poBackupHandle, setPoBackupHandle] = useState(null);
  const [invoiceBackupHandle, setInvoiceBackupHandle] = useState(null);

  // 1. Load Data
  useEffect(() => {
    async function loadAllData() {
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
          savedPoHandle, savedInvHandle,
          savedExpenses, savedExpenseCategories
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
          get(`${orgKey}_poBackupHandle`),
          get(`${orgKey}_invoiceBackupHandle`),
          load(`${orgKey}_expenses`, seeds.expenses),
          load(`${orgKey}_expenseCategories`, seeds.expenseCategories)
        ]);

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
        setPoBackupHandle(savedPoHandle || null);
        setInvoiceBackupHandle(savedInvHandle || null);
        setExpenses(savedExpenses || []);
        setExpenseCategories(savedExpenseCategories || seeds.expenseCategories || []);

        if (savedImages && typeof savedImages === 'object') {
          setSkuImages(savedImages);
        } else {
          setSkuImages({});
        }

        setDataLoaded(true);
      } catch (err) {
        console.error("Failed to load data", err);
        setDataLoaded(true);
      }
    }
    loadAllData();
  }, [orgKey]);

  // 2. Auto-Save Data
  useEffect(() => {
    if (!dataLoaded) return;

    const handler = setTimeout(() => {
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

      console.log('Auto-saved data to IDB');
    }, 1000);

    return () => clearTimeout(handler);
  }, [snapshots, pos, settings, vendors, customers, cogs, websitePrices, skuDescriptions, outgoingOrders, internalOrders, invoices, websiteOrders, myCompany, expenses, expenseCategories, orgKey, dataLoaded]);

  // Handle Updates
  const updatePoBackupHandle = useCallback(async (handle) => {
    setPoBackupHandle(handle);
    await set(`${orgKey}_poBackupHandle`, handle);
  }, [orgKey]);

  const updateInvoiceBackupHandle = useCallback(async (handle) => {
    setInvoiceBackupHandle(handle);
    await set(`${orgKey}_invoiceBackupHandle`, handle);
  }, [orgKey]);

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
  const saveOutgoingOrder = useCallback((order) => {
    setOutgoingOrders(prev => {
      const exists = prev.find(o => o.id === order.id);
      if (exists) return prev.map(o => o.id === order.id ? order : o);
      return [...prev, order];
    });
  }, []);

  const deleteOutgoingOrder = useCallback((id) => {
    setOutgoingOrders(prev => prev.filter(o => o.id !== id));
  }, []);

  return {
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
    myCompany, setMyCompany,
    companyLogo, handleLogoUpload,
    poBackupHandle, updatePoBackupHandle,
    invoiceBackupHandle, updateInvoiceBackupHandle,
    saveOutgoingOrder, deleteOutgoingOrder,
    expenses, setExpenses,
    expenseCategories, setExpenseCategories
  };
}