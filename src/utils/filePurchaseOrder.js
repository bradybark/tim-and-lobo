import { getStoredDocumentFile, storeDocumentFile } from './documentStorage.js';
import { printablePOPath } from './purchaseOrderLocations.js';
import { renderPurchaseOrder } from './printablePurchaseOrder.js';

export function isPrintableOrder(order) {
  return order?.id != null && Boolean(order.poNumber && order.orderDate) && Array.isArray(order.items);
}

export async function ensurePrintablePO(rootHandle, order, { vendors, myCompany, companyLogo }) {
  if (printablePOPath(order)) {
    try {
      const file = await getStoredDocumentFile(rootHandle, order.generatedPOStorage, false);
      if (file.size) return order.generatedPOStorage;
    } catch (error) {
      if (error.name !== 'NotFoundError') throw error;
    }
  }
  const vendor = vendors.find(v => String(v.id) === String(order.vendorId));
  const html = await renderPurchaseOrder(order, vendor, myCompany, companyLogo);
  return storeDocumentFile({
    rootHandle, orgKey: 'timothy', partyType: 'vendors', partyId: order.vendorId,
    partyName: vendor?.name?.name || vendor?.name || 'Unknown Vendor', businessDate: order.orderDate,
    direction: 'outgoing', documentType: 'purchase-orders', recordId: order.id,
    recordLabel: order.poNumber, area: 'generated', preservePrintable: true,
    file: new File([html], order.poNumber + '.html', { type: 'text/html' }),
    metadata: { vendorId: order.vendorId, purchaseOrderNumber: order.poNumber },
  });
}

// Concurrent edits, deletes and imports can arrive while the folder is writing.
// Attach only to the same order and preserve all its current business fields.
export function attachFiledPOs(current, completed) {
  return current.map(order => {
    const result = completed.get(order.id);
    if (!result || order.poNumber !== result.order.poNumber || order.orderDate !== result.order.orderDate ||
        printablePOPath(order) !== printablePOPath(result.order)) return order;
    return { ...order, generatedPOStorage: result.reference };
  });
}
