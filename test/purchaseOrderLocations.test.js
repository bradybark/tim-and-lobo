import assert from 'node:assert/strict';
import test from 'node:test';
import { matchingPOBackups, printablePOPath } from '../src/utils/purchaseOrderLocations.js';

test('reports only backup files containing the current PO, including older records read from disk', () => {
  const order = { id: 1, poNumber: 'DURA-003', items: [{ qty: 2 }] };
  const backup = { name: 'backup.json', orders: [structuredClone(order)] };
  const auto = { name: 'auto.json', orders: [order] };
  assert.deepEqual(matchingPOBackups([order], [backup, auto]).get(1), ['backup.json', 'auto.json']);
  assert.equal(matchingPOBackups([{ ...order, items: [{ qty: 3 }] }], [backup, null]).size, 0);
  assert.equal(matchingPOBackups([order], [null, { name: 'empty.json', orders: [] }]).size, 0);
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
