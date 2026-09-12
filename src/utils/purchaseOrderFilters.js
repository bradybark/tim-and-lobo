const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeText = value => String(value ?? '').trim().toLocaleLowerCase();

const getVendorName = (vendor) => vendor?.name?.name || vendor?.name || 'Unknown Vendor';

const toLocalDayNumber = (dateLike) => {
  if (!dateLike) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(dateLike))
    ? new Date(`${dateLike}T00:00:00`)
    : new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getDaysUntilDue = (dueDate, today = new Date()) => {
  const dueDay = toLocalDayNumber(dueDate);
  const todayDay = toLocalDayNumber(today);
  if (dueDay === null || todayDay === null) return null;
  return Math.round((dueDay - todayDay) / DAY_MS);
};

export const preparePurchaseOrdersForList = (purchaseOrders, vendors, today = new Date()) => {
  const vendorNames = new Map(
    (vendors || []).map(vendor => [String(vendor.id), getVendorName(vendor)]),
  );

  return (purchaseOrders || []).map((po) => {
    const vendorName = vendorNames.get(String(po.vendorId)) || 'Unknown Vendor';
    const hasInvoice = Boolean(po.invoiceDate || po.documents?.length);
    const daysUntilDue = getDaysUntilDue(po.dueDate, today);

    let paymentState = 'open';
    let paymentLabel = 'Open';
    let paymentSort = 3;

    if (po.status === 'Paid') {
      paymentState = 'paid';
      paymentLabel = 'Paid';
      paymentSort = 4;
    } else if (!hasInvoice) {
      paymentState = 'needs-invoice';
      paymentLabel = 'Needs invoice';
      paymentSort = 2;
    } else if (daysUntilDue !== null && daysUntilDue < 0) {
      paymentState = 'overdue';
      paymentLabel = 'Overdue';
      paymentSort = 0;
    } else if (daysUntilDue !== null && daysUntilDue <= 10) {
      paymentState = 'due-soon';
      paymentLabel = daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue} days`;
      paymentSort = 1;
    }

    const searchableText = normalizeText([
      po.poNumber,
      vendorName,
      po.invoiceNumber,
      po.invoiceDate,
      po.dueDate,
      po.status,
      paymentLabel,
      po.dropShipRecipient,
      ...(po.items || []).flatMap(item => [item.sku, item.description]),
      ...(po.documents || []).flatMap(document => [
        document.name,
        document.fileName,
        document.originalName,
        document.storage?.originalName,
      ]),
    ].join(' '));

    return {
      ...po,
      vendorName,
      hasInvoice,
      daysUntilDue,
      paymentState,
      paymentLabel,
      paymentSort,
      searchableText,
    };
  });
};

export const filterPurchaseOrderList = (purchaseOrders, filters = {}) => {
  const {
    search = '',
    view = 'all',
    vendorId = 'all',
    startDate = '',
    endDate = '',
    orderStage = 'all',
    invoiceState = 'all',
    minTotal = '',
    maxTotal = '',
  } = filters;
  const searchValue = normalizeText(search);
  const minimum = minTotal === '' ? null : Number(minTotal);
  const maximum = maxTotal === '' ? null : Number(maxTotal);

  return (purchaseOrders || []).filter((po) => {
    if (searchValue && !po.searchableText.includes(searchValue)) return false;
    if (vendorId !== 'all' && String(po.vendorId) !== String(vendorId)) return false;
    if (startDate && (!po.orderDate || po.orderDate < startDate)) return false;
    if (endDate && (!po.orderDate || po.orderDate > endDate)) return false;
    if (orderStage !== 'all' && po.status !== orderStage) return false;
    if (invoiceState === 'missing' && po.hasInvoice) return false;
    if (invoiceState === 'uploaded' && !po.hasInvoice) return false;
    if (minimum !== null && !Number.isNaN(minimum) && Number(po.totalAmount || 0) < minimum) return false;
    if (maximum !== null && !Number.isNaN(maximum) && Number(po.totalAmount || 0) > maximum) return false;

    if (view === 'open' && po.paymentState === 'paid') return false;
    if (view !== 'all' && view !== 'open' && po.paymentState !== view) return false;
    return true;
  });
};
