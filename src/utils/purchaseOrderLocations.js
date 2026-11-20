// Compare the original PO records, before the list adds sorting and display fields.
export function matchingPOBackups(orders, backups) {
  const matches = new Map();
  for (const backup of backups) {
    if (!Array.isArray(backup?.orders)) continue;
    const savedById = new Map(backup.orders.map(order => [order.id, order]));
    for (const order of orders) {
      const saved = savedById.get(order.id);
      if (!saved || (saved !== order && JSON.stringify(saved) !== JSON.stringify(order))) continue;
      const names = matches.get(order.id) || [];
      if (!names.includes(backup.name)) names.push(backup.name);
      matches.set(order.id, names);
    }
  }
  return matches;
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
