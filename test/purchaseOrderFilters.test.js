import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterPurchaseOrderList,
  getDaysUntilDue,
  preparePurchaseOrdersForList,
} from '../src/utils/purchaseOrderFilters.js';

const today = new Date('2026-09-11T12:00:00');
const vendors = [
  { id: 1, name: 'Northstar Tools' },
  { id: 2, name: { name: 'Keystone Supply' } },
];
const purchaseOrders = [
  {
    id: 1,
    poNumber: 'TT-001',
    vendorId: 1,
    orderDate: '2026-08-01',
    status: 'Received',
    invoiceDate: '2026-08-10',
    dueDate: '2026-09-01',
    totalAmount: 1000,
    items: [{ sku: 'TSB8', description: 'Toolbox' }],
  },
  {
    id: 2,
    poNumber: 'TT-002',
    vendorId: 2,
    orderDate: '2026-09-05',
    status: 'Sent',
    totalAmount: 2500,
    items: [{ sku: 'MST22', description: 'Storage tray' }],
  },
  {
    id: 3,
    poNumber: 'TT-003',
    vendorId: 1,
    orderDate: '2026-09-08',
    status: 'Paid',
    invoiceDate: '2026-09-08',
    dueDate: '2026-10-08',
    totalAmount: 500,
    items: [],
  },
];

test('derives vendor and payment values used by the visible table', () => {
  const rows = preparePurchaseOrdersForList(purchaseOrders, vendors, today);
  assert.equal(rows[0].vendorName, 'Northstar Tools');
  assert.equal(rows[0].paymentState, 'overdue');
  assert.equal(rows[1].vendorName, 'Keystone Supply');
  assert.equal(rows[1].paymentState, 'needs-invoice');
  assert.equal(rows[2].paymentState, 'paid');
});

test('filters by an exact selected vendor', () => {
  const rows = preparePurchaseOrdersForList(purchaseOrders, vendors, today);
  assert.deepEqual(
    filterPurchaseOrderList(rows, { vendorId: '2' }).map(po => po.id),
    [2],
  );
});

test('searches displayed vendors, PO numbers, SKUs, and payment labels', () => {
  const rows = preparePurchaseOrdersForList(purchaseOrders, vendors, today);
  assert.deepEqual(filterPurchaseOrderList(rows, { search: 'northstar' }).map(po => po.id), [1, 3]);
  assert.deepEqual(filterPurchaseOrderList(rows, { search: 'MST22' }).map(po => po.id), [2]);
  assert.deepEqual(filterPurchaseOrderList(rows, { search: 'overdue' }).map(po => po.id), [1]);
});

test('supports workflow views and typed advanced filters', () => {
  const rows = preparePurchaseOrdersForList(purchaseOrders, vendors, today);
  assert.deepEqual(filterPurchaseOrderList(rows, { view: 'needs-invoice' }).map(po => po.id), [2]);
  assert.deepEqual(filterPurchaseOrderList(rows, { view: 'paid' }).map(po => po.id), [3]);
  assert.deepEqual(
    filterPurchaseOrderList(rows, {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      minTotal: '1000',
      invoiceState: 'missing',
    }).map(po => po.id),
    [2],
  );
});

test('calculates calendar-day due dates without time-of-day drift', () => {
  assert.equal(getDaysUntilDue('2026-09-11', today), 0);
  assert.equal(getDaysUntilDue('2026-09-21', today), 10);
  assert.equal(getDaysUntilDue('2026-09-10', today), -1);
});
