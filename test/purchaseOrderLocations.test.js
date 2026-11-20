import assert from 'node:assert/strict';
import test from 'node:test';
import { matchingOrderBackups, outgoingDocumentPath, printablePOPath } from '../src/utils/purchaseOrderLocations.js';

test('reports only backup files containing the current PO, including older records read from disk', () => {
  const order = { id: 1, poNumber: 'DURA-003', items: [{ qty: 2 }] };
  const backup = { name: 'backup.json', pos: [structuredClone(order)] };
  const auto = { name: 'auto.json', pos: [order] };
  assert.deepEqual(matchingOrderBackups([order], [backup, auto], 'pos').get(1), ['backup.json', 'auto.json']);
  assert.equal(matchingOrderBackups([{ ...order, items: [{ qty: 3 }] }], [backup, null], 'pos').size, 0);
  assert.equal(matchingOrderBackups([order], [null, { name: 'empty.json', pos: [] }], 'pos').size, 0);
});

test('a printable reference must belong to this PO, including legacy references', () => {
  const order = { id: 17, poNumber: 'DURA-003' };
  const ref = { relativePath: 'generated/dura-003.html', originalName: 'DURA-003.html' };
  assert.equal(printablePOPath(order), null);
  assert.equal(printablePOPath({ ...order, generatedPOStorage: ref }), ref.relativePath);
  const filed = { ...order, generatedPOStorage: { ...ref, routing: { recordId: '17', recordLabel: 'DURA-003' } } };
  assert.equal(printablePOPath(filed), ref.relativePath);
  assert.equal(printablePOPath({ ...filed, id: 18, poNumber: 'DURA-003-BO' }), null);
  assert.equal(printablePOPath({ ...filed, poNumber: 'DURA-004' }), null);
});

test('outgoing locations use the matching order collection and each document independently', () => {
  const order = { id: 1, poNumber: 'PO-1', invoiceNumber: 'INV-1', filePO: 'browser attachment' };
  const backup = { name: 'lobo.json', pos: [order], outgoingOrders: [{ ...order, invoiceNumber: '' }] };
  assert.equal(matchingOrderBackups([order], [backup], 'outgoingOrders').size, 0);
  backup.outgoingOrders = [structuredClone(order)];
  assert.deepEqual(matchingOrderBackups([order], [backup], 'outgoingOrders').get(1), ['lobo.json']);
  assert.equal(outgoingDocumentPath(order, 'po'), null);
  assert.equal(outgoingDocumentPath(order, 'invoice'), null);
  const invoice = { relativePath: 'final/invoice.pdf', routing: { recordId: '1', recordLabel: 'INV-1', documentType: 'invoices' } };
  const po = { relativePath: 'originals/customer.pdf', routing: { recordId: 1, recordLabel: 'PO-1', documentType: 'purchase-orders' } };
  const both = { ...order, fileInvoiceStorage: invoice, filePOStorage: po };
  assert.equal(outgoingDocumentPath(both, 'invoice'), invoice.relativePath);
  assert.equal(outgoingDocumentPath(both, 'po'), po.relativePath);
  assert.equal(outgoingDocumentPath({ ...both, id: 2 }, 'invoice'), null);
  assert.equal(outgoingDocumentPath({ ...both, poNumber: 'PO-2' }, 'po'), null);
  assert.equal(outgoingDocumentPath({ ...both, filePOStorage: null }, 'po'), null);
});
