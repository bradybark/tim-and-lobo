// src/constants/seedData.js
export const LOBO_SNAPSHOTS = [
  { id: 1, date: '2025-07-01', sku: 'MST12', qty: 0 },
  { id: 2, date: '2025-07-01', sku: 'MST18', qty: 0 },
  { id: 3, date: '2025-07-01', sku: 'MST22', qty: 0 },
  { id: 4, date: '2025-11-25', sku: 'MST12', qty: 600 },
  { id: 5, date: '2025-11-25', sku: 'MST18', qty: 600 },
  { id: 6, date: '2025-11-25', sku: 'MST22', qty: 350 },
];

export const LOBO_POS = [
  {
    id: 101,
    sku: 'MST12',
    poNumber: '1802',
    orderDate: '2025-02-10',
    qty: 1000,
    received: true,
    eta: '2025-07-09',
    receivedDate: '2025-07-09',
    vendor: '',
  },
  {
    id: 102,
    sku: 'MST18',
    poNumber: '1802',
    orderDate: '2025-02-10',
    qty: 1000,
    received: true,
    eta: '2025-07-09',
    receivedDate: '2025-07-09',
    vendor: '',
  },
  {
    id: 103,
    sku: 'MST22',
    poNumber: '1802',
    orderDate: '2025-02-10',
    qty: 1000,
    received: true,
    eta: '2025-07-09',
    receivedDate: '2025-07-09',
    vendor: '',
  },
  {
    id: 104,
    sku: 'ACT',
    poNumber: '1905',
    orderDate: '2025-11-01',
    qty: 1008,
    received: false,
    eta: '2026-02-01',
    receivedDate: '',
    vendor: '',
  },
];

export const LOBO_SETTINGS = [
  { sku: 'MST12', leadTime: 90, minDays: 60, targetMonths: 10 },
  { sku: 'MST18', leadTime: 90, minDays: 60, targetMonths: 10 },
  { sku: 'MST22', leadTime: 90, minDays: 60, targetMonths: 10 },
  { sku: 'ACT', leadTime: 90, minDays: 60, targetMonths: 6 },
];

export const LOBO_VENDORS = [];

export const TIMOTHY_SNAPSHOTS = [];
export const TIMOTHY_POS = [];
export const TIMOTHY_SETTINGS = [
//
];
export const TIMOTHY_VENDORS = [];