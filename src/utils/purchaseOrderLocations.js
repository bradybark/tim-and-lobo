// Compare stored order records before views add sorting and display fields.
export function matchingOrderBackups(orders, backups, collection) {
  const matches = new Map();
  for (const backup of backups) {
    if (!Array.isArray(backup?.[collection])) continue;
    for (const order of matchingOrders(orders, backup[collection])) {
      const names = matches.get(order.id) || [];
      if (!names.includes(backup.name)) names.push(backup.name);
      matches.set(order.id, names);
    }
  }
  return matches;
}

export function matchingOrders(orders, savedOrders) {
  const byId = new Map(savedOrders.map(order => [order.id, order]));
  return orders.filter(order => {
    const saved = byId.get(order.id);
    return saved && (saved === order || JSON.stringify(saved) === JSON.stringify(order));
  });
}

export function outgoingDocumentPath(order, kind) {
  const invoice = kind === 'invoice';
  const file = invoice ? order.fileInvoiceStorage : order.filePOStorage;
  const number = invoice ? order.invoiceNumber : order.poNumber;
  const routing = file?.routing;
  if (!file?.relativePath || !number || routing?.recordId == null) return null;
  if (String(routing.recordId) !== String(order.id) || String(routing.recordLabel) !== String(number)) return null;
  if (routing.documentType !== (invoice ? 'invoices' : 'purchase-orders')) return null;
  return file.relativePath;
}

export function printablePOPath(order) {
  const file = order.generatedPOStorage;
  if (!file?.relativePath || !order.poNumber) return null;
  // Older backorders sometimes inherit the parent's document reference.
  if (file.routing?.recordId != null && String(file.routing.recordId) !== String(order.id)) return null;
  const matchesNumber = file.routing?.recordLabel != null
    ? String(file.routing.recordLabel) === String(order.poNumber)
    : file.originalName?.toLowerCase() === `${order.poNumber}.html`.toLowerCase();
  return matchesNumber ? file.relativePath : null;
}
