const normalizeInvoiceNumber = (value) => String(value ?? '').trim();

export const findInvoiceNumberConflict = ({ orders = [], invoiceNumber, orderId }) => {
  const normalized = normalizeInvoiceNumber(invoiceNumber).toLocaleUpperCase();
  if (!normalized) return null;

  return orders.find(order =>
    String(order?.id) !== String(orderId)
    && normalizeInvoiceNumber(order?.invoiceNumber).toLocaleUpperCase() === normalized,
  ) || null;
};

export const getNextInvoiceNumber = ({ orders = [], customer }) => {
  if (!customer) throw new Error('A customer is required to generate an invoice number.');

  const suffix = normalizeInvoiceNumber(customer.invoiceSuffix);
  let maxSequence = 0;

  for (const order of orders) {
    if (String(order?.customerId) !== String(customer.id)) continue;

    const invoiceNumber = normalizeInvoiceNumber(order?.invoiceNumber);
    if (!invoiceNumber) continue;

    let sequenceText = '';
    if (suffix && invoiceNumber.startsWith(suffix)) {
      sequenceText = invoiceNumber.slice(suffix.length);
    } else if (!suffix && /^\d+$/.test(invoiceNumber)) {
      sequenceText = invoiceNumber;
    }

    if (!/^\d+$/.test(sequenceText)) continue;
    const sequence = Number.parseInt(sequenceText, 10);
    if (sequence > maxSequence) maxSequence = sequence;
  }

  return `${suffix}${String(maxSequence + 1).padStart(3, '0')}`;
};
