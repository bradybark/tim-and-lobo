const toNonNegativeNumber = value => Math.max(0, Number(value) || 0);

export const getOrderedQuantity = item => toNonNegativeNumber(item?.count);

export const getBackorderedQuantity = item => {
  const ordered = getOrderedQuantity(item);
  return Math.min(ordered, toNonNegativeNumber(item?.backorderedQty));
};

export const getInvoiceQuantity = item =>
  getOrderedQuantity(item) - getBackorderedQuantity(item);

export const hasBackorderedItems = order =>
  (order?.items || []).some(item => getBackorderedQuantity(item) > 0);

export const createBackorderOrder = ({ sourceOrder, sequence }) => {
  const rootOrderId = sourceOrder.rootOrderId || sourceOrder.id;
  const items = (sourceOrder.items || [])
    .map(item => ({ ...item, count: getBackorderedQuantity(item) }))
    .filter(item => item.count > 0)
    .map(item => ({ ...item, backorderedQty: item.count }));

  if (items.length === 0) return null;

  return {
    ...sourceOrder,
    id: `${rootOrderId}-backorder-${sequence}`,
    parentOrderId: sourceOrder.id,
    rootOrderId,
    isBackorder: true,
    backorderSequence: sequence,
    backorderStatus: 'waiting',
    invoiceNumber: '',
    items,
    adjustment: 0,
    adjustmentNote: '',
    processingFee: 0,
    shippingCost: 0,
    isPartnerShipping: false,
    tracking: '',
    shippingCompany: '',
    isPaid: false,
    filePO: null,
    filePOStorage: null,
    fileInvoice: null,
    fileInvoiceStorage: null,
  };
};

export const getBackorderInvoiceNumber = ({ order, orders }) => {
  if (!order?.isBackorder || !order.backorderSequence) {
    throw new Error('This order is not a backorder fulfillment.');
  }
  const rootOrderId = order.rootOrderId || order.parentOrderId;
  const rootOrder = (orders || []).find(candidate => String(candidate.id) === String(rootOrderId));
  const baseInvoiceNumber = String(rootOrder?.invoiceNumber || '').trim();
  if (!baseInvoiceNumber) {
    throw new Error('Generate the original order invoice before invoicing its backorder.');
  }
  return `${baseInvoiceNumber}-${order.backorderSequence}`;
};
