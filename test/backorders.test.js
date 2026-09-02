import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBackorderOrder,
  getBackorderedQuantity,
  getBackorderInvoiceNumber,
  getInvoiceQuantity,
  hasBackorderedItems,
} from '../src/utils/backorders.js';

test('splits ordered quantities into ship-now and backordered quantities', () => {
  const item = { count: 10, backorderedQty: 4 };
  assert.equal(getInvoiceQuantity(item), 6);
  assert.equal(getBackorderedQuantity(item), 4);
  assert.equal(getBackorderedQuantity({ count: 3, backorderedQty: 9 }), 3);
});

test('creates a linked waiting backorder with only remaining quantities', () => {
  const sourceOrder = {
    id: 100,
    poNumber: 'PO-500',
    customerId: 8,
    invoiceNumber: '04-011',
    items: [
      { sku: 'A', count: 10, backorderedQty: 4, price: 5 },
      { sku: 'B', count: 2, backorderedQty: 0, price: 9 },
    ],
  };
  const backorder = createBackorderOrder({ sourceOrder, sequence: 1 });

  assert.equal(backorder.id, '100-backorder-1');
  assert.equal(backorder.rootOrderId, 100);
  assert.equal(backorder.parentOrderId, 100);
  assert.equal(backorder.backorderSequence, 1);
  assert.equal(backorder.invoiceNumber, '');
  assert.deepEqual(backorder.items.map(item => [item.sku, item.count, item.backorderedQty]), [['A', 4, 4]]);
  assert.equal(hasBackorderedItems(backorder), true);
  assert.equal(getInvoiceQuantity(backorder.items[0]), 0);
});

test('derives each fulfillment invoice from the original invoice number', () => {
  const root = { id: 100, invoiceNumber: '04-011' };
  assert.equal(
    getBackorderInvoiceNumber({
      order: { isBackorder: true, rootOrderId: 100, backorderSequence: 1 },
      orders: [root],
    }),
    '04-011-1',
  );
  assert.equal(
    getBackorderInvoiceNumber({
      order: { isBackorder: true, rootOrderId: 100, backorderSequence: 2 },
      orders: [root],
    }),
    '04-011-2',
  );
});

test('requires the original invoice before a backorder can be invoiced', () => {
  assert.throws(
    () => getBackorderInvoiceNumber({
      order: { isBackorder: true, rootOrderId: 100, backorderSequence: 1 },
      orders: [{ id: 100, invoiceNumber: '' }],
    }),
    /original order invoice/i,
  );
});
