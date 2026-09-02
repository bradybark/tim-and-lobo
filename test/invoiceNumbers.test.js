import test from 'node:test';
import assert from 'node:assert/strict';
import { findInvoiceNumberConflict, getNextInvoiceNumber } from '../src/utils/invoiceNumbers.js';

test('increments the highest sequence for the selected customer and suffix', () => {
  const customer = { id: 7, invoiceSuffix: 'ATL-' };
  const orders = [
    { customerId: 7, invoiceNumber: 'ATL-002' },
    { customerId: '7', invoiceNumber: 'ATL-009' },
    { customerId: 8, invoiceNumber: 'ATL-099' },
    { customerId: 7, invoiceNumber: 'OLD-100' },
  ];

  assert.equal(getNextInvoiceNumber({ orders, customer }), 'ATL-010');
});

test('handles legacy numeric invoice values and starts at 001', () => {
  assert.equal(
    getNextInvoiceNumber({
      orders: [{ customerId: 3, invoiceNumber: 4 }],
      customer: { id: '3', invoiceSuffix: '' },
    }),
    '005',
  );
  assert.equal(
    getNextInvoiceNumber({ orders: [], customer: { id: 3, invoiceSuffix: 'RNO-' } }),
    'RNO-001',
  );
});

test('ignores malformed and differently prefixed invoice numbers', () => {
  const customer = { id: 1, invoiceSuffix: 'KS-' };
  const orders = [
    { customerId: 1, invoiceNumber: 'KS-' },
    { customerId: 1, invoiceNumber: 'KS-ABC' },
    { customerId: 1, invoiceNumber: 'OTHER-500' },
  ];

  assert.equal(getNextInvoiceNumber({ orders, customer }), 'KS-001');
});

test('detects a manually entered invoice number already used by another order', () => {
  const orders = [
    { id: 1, invoiceNumber: '04-011' },
    { id: 2, invoiceNumber: '04-012' },
  ];

  assert.equal(
    findInvoiceNumberConflict({ orders, invoiceNumber: ' 04-011 ', orderId: 2 })?.id,
    1,
  );
  assert.equal(
    findInvoiceNumberConflict({ orders, invoiceNumber: '04-012', orderId: 2 }),
    null,
  );
  assert.equal(
    findInvoiceNumberConflict({ orders, invoiceNumber: '', orderId: 3 }),
    null,
  );
});
