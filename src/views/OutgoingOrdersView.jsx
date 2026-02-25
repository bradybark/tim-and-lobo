// src/views/OutgoingOrdersView.jsx
import React, { useState, useMemo } from 'react';
import { Plus, Eye, Trash2, Paperclip, Printer, Search, FileText, Receipt } from 'lucide-react';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { FileUploader } from '../components/FileUploader';
import { toast } from 'sonner';
import { useInventory } from '../context/InventoryContext';



// --- HELPER FUNCTIONS ---
const formatMoney = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
};

const formatDate = (dateLike) => {
  if (!dateLike) return '-';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const blobToDataURL = (blob) => {
  return new Promise((resolve) => {
    if (!blob) { resolve(null); return; }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};

// --- ORDER MODAL COMPONENT ---
const OrderModal = ({ order, customers, allSkus, cogs, onClose, onSave, companyLogo: propLogo, outgoingOrders }) => {
  const { myCompany, companyLogo: contextLogo, skuDescriptions } = useInventory();
  const companyLogo = propLogo || contextLogo;
  const [formData, setFormData] = useState(() => ({
    id: order?.id || Date.now(),
    date: order?.date || new Date().toISOString().split('T')[0],
    poNumber: order?.poNumber || '',
    invoiceNumber: order?.invoiceNumber || '',
    customerId: order?.customerId || '',
    paymentTerms: order?.paymentTerms || 'Due on Receipt',
    items: order?.items || [],
    processingFee: order?.processingFee || 0,
    shippingCost: order?.shippingCost || 0,
    isPartnerShipping: order?.isPartnerShipping || false,
    adjustment: order?.adjustment || 0,
    adjustmentNote: order?.adjustmentNote || '',
    tracking: order?.tracking || '',
    isPaid: order?.isPaid || false,
    filePO: order?.filePO || null,
    fileInvoice: order?.fileInvoice || null
  }));

  const handleItemChange = (idx, field, val) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], [field]: val };

    if (field === 'sku') {
      newItems[idx].unitCost = cogs[val] || 0;
      const cust = customers.find(c => c.id === Number(formData.customerId));
      if (cust && cust.pricingRecords) {
        const record = cust.pricingRecords.find(r => r.sku === val);
        if (record) newItems[idx].price = record.price;
      }
    }
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { sku: allSkus[0] || 'Unknown', count: 1, price: 0, unitCost: cogs[allSkus[0]] || 0 }]
    }));
  };

  const removeItem = (idx) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const subTotal = formData.items.reduce((sum, item) => sum + (item.count * item.price), 0);
  const totalCogs = formData.items.reduce((sum, item) => sum + (item.count * item.unitCost), 0);
  const totalRevenue = subTotal + Number(formData.adjustment);
  const totalCost = totalCogs + Number(formData.processingFee) + Number(formData.shippingCost);
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error("Please select a customer");
      return;
    }
    onSave(formData);
  };

  const generateDocumentHtml = async (type) => { // type = 'invoice' | 'confirmation'
    if (!formData.customerId) {
      toast.error("Please select a customer first.");
      return null;
    }
    const customer = customers.find(c => c.id === Number(formData.customerId));

    // Logo processing (Matches InternalOrdersView logic)
    const logoDataUrl = await blobToDataURL(companyLogo);
    const logoImgTag = logoDataUrl ? `<img src="${logoDataUrl}" class="logo-img" alt="Logo" />` : '';

    // Document Title & Number
    const docTitle = type === 'invoice' ? 'INVOICE' : 'ORDER CONFIRMATION';
    const docNumberLabel = type === 'invoice' ? 'INVOICE #' : 'PO / REF #';

    let generatedInvoiceNumber = formData.invoiceNumber;
    if (type === 'invoice' && !generatedInvoiceNumber) {
      const customerOrders = (outgoingOrders || []).filter(o => o.customerId === customer.id && o.invoiceNumber !== undefined && o.invoiceNumber !== '');
      let maxSeq = 0;
      const suffixStr = customer.invoiceSuffix || '';

      customerOrders.forEach(o => {
        let seqStr = '';
        // If the invoice starts with the exact suffix provided by the customer
        if (suffixStr && o.invoiceNumber.startsWith(suffixStr)) {
          seqStr = o.invoiceNumber.substring(suffixStr.length);
        }
        // If there's no suffix on the customer, but the invoice number is purely numeric
        else if (!suffixStr && /^\\d+$/.test(o.invoiceNumber)) {
          seqStr = o.invoiceNumber;
        }
        // If it doesn't match the current suffix, it's ignored for sequence calculation

        if (seqStr) {
          const seq = parseInt(seqStr, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      });

      generatedInvoiceNumber = `${suffixStr}${String(maxSeq + 1).padStart(3, '0')}`;
      // Update form data so that if the user pushes Save Order, it saves the assigned invoice number
      setFormData(prev => ({ ...prev, invoiceNumber: generatedInvoiceNumber }));
    }

    const docNumber = type === 'invoice' ? generatedInvoiceNumber : formData.poNumber;
    const poNumberHtml = type === 'invoice' ? `<div class="meta-row"><span class="meta-label">PO #:</span> <span>${formData.poNumber || ''}</span></div>` : '';

    // Logic: Due Date Calculation (Simple Net X logic)
    // If 'Custom', we might need more logic but for now we follow the dropdowns (Net 15, 30, etc.)
    const terms = formData.paymentTerms || 'Due on Receipt';
    const dateObj = new Date(formData.date);
    let daysToAdd = 0;
    if (terms === 'Net 15') daysToAdd = 15;
    if (terms === 'Net 30') daysToAdd = 30;
    if (terms === 'Net 45') daysToAdd = 45;
    if (terms === 'Net 60') daysToAdd = 60;

    dateObj.setDate(dateObj.getDate() + daysToAdd);
    const dueDateStr = formatDate(dateObj.toISOString());

    // Items
    const itemsRows = formData.items.map(item => {
      const desc = skuDescriptions?.[item.sku] || '';
      return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">${item.sku}</td>
            <td style="padding: 10px;">${desc}</td>
            <td style="padding: 10px; text-align: right;">${item.count}</td>
            <td style="padding: 10px; text-align: right;">${formatMoney(item.price)}</td>
            <td style="padding: 10px; text-align: right;">${formatMoney(item.count * item.price)}</td>
        </tr>
      `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${docTitle} ${docNumber}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; -webkit-print-color-adjust: exact; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .logo-container { margin-bottom: 15px; }
                .logo-img { max-height: 80px; max-width: 200px; object-fit: contain; }
                .company-name { font-size: 24px; font-weight: 900; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
                .company-details { font-size: 13px; color: #555; line-height: 1.4; }
                .invoice-meta { text-align: right; }
                .invoice-title { font-size: 32px; color: #333; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; }
                .meta-row { display: flex; justify-content: flex-end; gap: 15px; font-size: 14px; margin-bottom: 5px; }
                .meta-label { font-weight: bold; color: #666; }
                
                .bill-to { margin-bottom: 40px; background: #f9f9f9; padding: 20px; border-radius: 5px; }
                .ship-to { margin-bottom: 40px; border: 1px solid #eee; padding: 20px; border-radius: 5px; }
                h3.section-title { font-size: 12px; text-transform: uppercase; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 0 0 10px 0; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { text-align: left; background: #333; color: white; padding: 12px 10px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
                
                .totals { display: flex; justify-content: flex-end; }
                .totals-box { width: 300px; }
                .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; }
                .total-row.final { border-top: 2px solid #333; border-bottom: none; font-weight: 900; font-size: 20px; margin-top: 10px; padding-top: 15px; }
                
                .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 13px; color: #888; }
                .paid-stamp { 
                    border: 2px solid #059669; color: #059669; 
                    font-size: 16px; font-weight: bold; text-transform: uppercase; 
                    padding: 5px 10px; transform: rotate(-10deg); 
                    display: inline-block; margin-top: 10px;
                }
                @media print {
                  body { padding: 0; }
                  .bill-to { -webkit-print-color-adjust: exact; background: #f9f9f9 !important; }
                  th { -webkit-print-color-adjust: exact; background: #333 !important; color: white !important; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="logo-container">
                        ${logoImgTag}
                    </div>
                    <div class="company-name">${myCompany?.name || 'Your Company'}</div>
                    <div class="company-details">
                        ${myCompany?.address1 || ''}<br>
                        ${myCompany?.address2 ? `${myCompany.address2}<br>` : ''}
                        ${myCompany?.city ? `${myCompany.city}, ` : ''}${myCompany?.state || ''} ${myCompany?.zip || ''}<br>
                        ${myCompany?.email || ''}<br>
                        ${myCompany?.phone || ''}
                    </div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-title">${docTitle}</div>
                    <div class="meta-row"><span class="meta-label">DATE:</span> <span>${formatDate(formData.date)}</span></div>
                    <div class="meta-row"><span class="meta-label">${docNumberLabel}:</span> <span>${docNumber}</span></div>
                    ${poNumberHtml}
                    ${type === 'invoice' ? `<div class="meta-row"><span class="meta-label">TERMS:</span> <span>${terms}</span></div>` : ''}
                    ${type === 'invoice' ? `<div class="meta-row"><span class="meta-label">DUE DATE:</span> <span>${dueDateStr}</span></div>` : ''}
                    ${type === 'invoice' && formData.isPaid ? '<div style="text-align: right;"><div class="paid-stamp">PAID</div></div>' : ''}
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 40px; margin-bottom: 30px;">
                <div class="bill-to" style="flex: 1;">
                    <h3 class="section-title">Bill To:</h3>
                    <strong>${customer.company}</strong><br>
                    ${customer.contact ? `Attn: ${customer.contact}<br>` : ''}
                    ${customer.billAddress1 || customer.billAddress || ''}<br>
                    ${customer.billAddress2 ? `${customer.billAddress2}<br>` : ''}
                    ${customer.billCity || ''}${customer.billCity && customer.billState ? ', ' : ''}${customer.billState || ''} ${customer.billZip || ''}<br>
                    ${customer.emailAcct ? `<br>${customer.emailAcct}` : ''}
                </div>
                <div class="ship-to" style="flex: 1;">
                    <h3 class="section-title">Ship To:</h3>
                    <strong>${customer.company}</strong><br>
                    ${customer.shipAddress1 || customer.shipAddress || customer.address || ''}<br>
                    ${customer.shipAddress2 ? `${customer.shipAddress2}<br>` : ''}
                    ${customer.shipCity || ''}${customer.shipCity && customer.shipState ? ', ' : ''}${customer.shipState || ''} ${customer.shipZip || ''}
                </div>
            </div>

            <table>
                <thead><tr><th>SKU</th><th>Description</th><th style="text-align: right;">Qty</th><th style="text-align: right;">Unit Price</th><th style="text-align: right;">Amount</th></tr></thead>
                <tbody>${itemsRows}</tbody>
            </table>

            <div class="totals">
                <div class="totals-box">
                    <div class="total-row"><span>Subtotal</span><span>${formatMoney(subTotal)}</span></div>
                    ${Number(formData.adjustment) !== 0 ? `<div class="total-row"><span>Adjustment ${formData.adjustmentNote ? `(${formData.adjustmentNote})` : ''}</span><span>${formatMoney(formData.adjustment)}</span></div>` : ''}
                    ${Number(formData.processingFee) !== 0 ? `<div class="total-row"><span>Processing Fee</span><span>${formatMoney(formData.processingFee)}</span></div>` : ''}
                    <div class="total-row final">
                        <span>Total Due</span>
                        <span>${formatMoney(totalRevenue)}</span>
                    </div>
                </div>
            </div>

            <div class="footer">
                Thank you for your business! ${myCompany?.email ? `<br>Questions? Contact us at ${myCompany.email}` : ''}
            </div>
        </body>
        </html>
    `;
  };

  const downloadDocument = async (type) => {
    try {
      console.log("Starting invoice generation...");
      const html = await generateDocumentHtml(type);
      if (!html) {
        console.error("No HTML generated");
        return;
      }
      console.log("HTML Generated, length:", html.length);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Popup blocked. Please allow popups to print invoices.");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();

      // Enhanced Print Logic: Wait for logo to load
      const logo = printWindow.document.querySelector('.logo-img');
      if (logo) {
        if (logo.complete) {
          setTimeout(() => printWindow.print(), 500);
        } else {
          logo.onload = () => {
            setTimeout(() => printWindow.print(), 500);
          };
          logo.onerror = () => {
            console.error("Logo failed to load in print window");
            setTimeout(() => printWindow.print(), 500);
          };
        }
      } else {
      }
    } catch (err) {
      console.error("Error generating invoice:", err);
      toast.error("Failed to generate invoice. Check console for details.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {order ? 'Edit Order' : 'New Outgoing Order'}
            </h2>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Date</label><input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">PO Number</label><input type="text" required value={formData.poNumber} onChange={e => setFormData({ ...formData, poNumber: e.target.value })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment Terms</label>
              <select value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
              <select value={formData.customerId} onChange={e => {
                const newId = Number(e.target.value);
                const cust = customers.find(c => c.id === newId);
                setFormData(prev => ({
                  ...prev,
                  customerId: newId,
                  paymentTerms: cust?.paymentTerms || 'Due on Receipt'
                }));
              }} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                <option value="">Select Customer...</option>
                {customers.filter(c => !c.isPartner).map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex justify-between items-center mb-2"><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Order Items</h3><button type="button" onClick={addItem} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">+ Add SKU</button></div>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-500">
                <tr><th className="p-2 text-left">SKU</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price/Unit</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Unit Cost</th><th className="p-2 text-right">Gross Profit</th><th className="p-2 w-8"></th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {formData.items.map((item, idx) => {
                  const lineTotal = item.count * item.price;
                  const lineCost = item.count * item.unitCost;
                  const lineProfit = lineTotal - lineCost;
                  const lineMargin = lineTotal > 0 ? (lineProfit / lineTotal) * 100 : 0;
                  return (
                    <tr key={idx}>
                      <td className="p-2"><select value={item.sku} onChange={e => handleItemChange(idx, 'sku', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 outline-none dark:bg-gray-700 dark:text-white rounded">{allSkus.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                      <td className="p-2 text-right"><input type="number" min="1" value={item.count} onChange={e => handleItemChange(idx, 'count', Number(e.target.value))} className="w-16 text-right bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 dark:text-white" /></td>
                      <td className="p-2 text-right"><input type="number" step="0.01" value={item.price} onChange={e => handleItemChange(idx, 'price', Number(e.target.value))} className="w-20 text-right bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 dark:text-white" /></td>
                      <td className="p-2 text-right font-medium dark:text-white">${lineTotal.toLocaleString()}</td>
                      <td className="p-2 text-right"><input type="number" step="0.01" value={item.unitCost} onChange={e => handleItemChange(idx, 'unitCost', Number(e.target.value))} className="w-20 text-right bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 text-gray-600 dark:text-gray-300" /></td>
                      <td className={`p-2 text-right font-medium ${lineProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>${lineProfit.toLocaleString()} <span className="text-xs opacity-75">({lineMargin.toFixed(1)}%)</span></td>
                      <td className="p-2"><button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-500">Tracking Number</label><input type="text" value={formData.tracking} onChange={e => setFormData({ ...formData, tracking: e.target.value })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
              <div className="flex gap-4">
                <FileUploader label="Upload PO" currentFile={formData.filePO} onUpload={(f) => setFormData(prev => ({ ...prev, filePO: f }))} />
                <FileUploader label="Upload Invoice" currentFile={formData.fileInvoice} onUpload={(f) => setFormData(prev => ({ ...prev, fileInvoice: f }))} />
              </div>
              <div className="flex items-center gap-2 pt-2"><input type="checkbox" id="isPaid" checked={formData.isPaid} onChange={e => setFormData({ ...formData, isPaid: e.target.checked })} className="w-4 h-4 text-green-600 rounded" /><label htmlFor="isPaid" className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Paid</label></div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between dark:text-gray-300"><span>Subtotal:</span><span>${subTotal.toFixed(2)}</span></div>

              <div className="flex justify-between items-center dark:text-gray-300">
                <span>Adjustment:</span>
                <input type="number" value={formData.adjustment} onChange={e => setFormData({ ...formData, adjustment: Number(e.target.value) })} className="w-20 text-right text-xs p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <input type="text" placeholder="Adjustment Note (Optional)" value={formData.adjustmentNote} onChange={e => setFormData({ ...formData, adjustmentNote: e.target.value })} className="w-full text-xs p-1 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300" />

              <div className="flex justify-between items-center text-gray-500 dark:text-gray-400"><span>Processing Fee:</span><input type="number" value={formData.processingFee} onChange={e => setFormData({ ...formData, processingFee: Number(e.target.value) })} className="w-20 text-right text-xs p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>

              <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-2">
                  Shipping Cost:
                  <label className="flex items-center gap-1 cursor-pointer text-xs text-indigo-600 dark:text-indigo-400">
                    <input type="checkbox" checked={formData.isPartnerShipping} onChange={e => setFormData({ ...formData, isPartnerShipping: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    Partner Pay?
                  </label>
                </span>
                <input type="number" value={formData.shippingCost} onChange={e => setFormData({ ...formData, shippingCost: Number(e.target.value) })} className="w-20 text-right text-xs p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2 flex justify-between font-bold text-lg dark:text-white"><span>Revenue:</span><span>${totalRevenue.toFixed(2)}</span></div>
              <div className="flex justify-between font-medium text-green-600 dark:text-green-400"><span>Net Profit:</span><span>${profit.toFixed(2)}</span></div>
              <div className="flex justify-between font-medium text-indigo-600 dark:text-indigo-400"><span>Margin:</span><span>{margin.toFixed(2)}%</span></div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              <div className="flex gap-2">
                <button type="button" onClick={() => downloadDocument('confirmation')} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-500 transition-colors text-xs font-medium">
                  <Printer className="w-4 h-4" /> Order Conf.
                </button>
                <button type="button" onClick={() => downloadDocument('invoice')} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-500 transition-colors text-xs font-medium">
                  <Printer className="w-4 h-4" /> Invoice
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500 dark:text-gray-400">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save Order</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- MAIN VIEW COMPONENT ---
const OutgoingOrdersView = (props) => {
  // Fix: Prefer props if passed, otherwise fall back to context
  const context = useInventory();

  const outgoingOrders = props.outgoingOrders || context.outgoingOrders || [];
  const customers = props.customers || context.customers || [];
  const settings = props.settings || context.settings || [];
  const cogs = props.cogs || context.cogs || {};
  const saveOutgoingOrder = context.saveOutgoingOrder;
  const deleteOutgoingOrder = context.deleteOutgoingOrder;
  const companyLogo = props.companyLogo || context.companyLogo;

  const allSkus = (settings || []).map(s => s.sku); // FIX: Derive SKUs from settings

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState('');

  // Setup table sorting/filtering with safety checks
  const filteredData = useMemo(() => {
    return (outgoingOrders || []).filter(o =>
      (o.poNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (customers || []).find(c => c.id === o.customerId)?.company.toLowerCase().includes(search.toLowerCase())
    );
  }, [outgoingOrders, customers, search]);

  const handleFilter = (key, value) => {
    // Assuming handleFilter is part of useTable
  }; // Not strictly needed, useTable handles it but I am injecting handleViewFile below

  const handleViewFile = (file) => {
    if (!file) return;
    if (file instanceof Blob || file instanceof File) {
      const url = URL.createObjectURL(file);
      window.open(url, '_blank');
    } else if (typeof file === 'string') {
      window.open(file, '_blank');
    } else {
      toast.error('File format not supported for viewing.');
    }
  };

  const { processedData, handleSort, sortConfig, filters, handleFilter: tableFilter } = useTable(filteredData);

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedOrder(null);
    setIsModalOpen(true);
  };

  const handleSave = (orderData) => {
    if (saveOutgoingOrder) {
      saveOutgoingOrder(orderData);
      setIsModalOpen(false);
      toast.success('Order saved successfully');
    } else {
      toast.error("Save function missing in Context");
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      if (deleteOutgoingOrder) {
        deleteOutgoingOrder(id);
        toast.success('Order deleted');
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Outgoing Orders</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage customer orders and shipments</p>
        </div>
        <button onClick={handleAddNew} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search PO or Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-medium">
              <tr>
                <SortableHeaderCell label="Date" sortKey="date" currentSort={sortConfig} onSort={handleSort} onFilter={tableFilter} filterValue={filters.date} />
                <SortableHeaderCell label="PO Number" sortKey="poNumber" currentSort={sortConfig} onSort={handleSort} onFilter={tableFilter} filterValue={filters.poNumber} />
                <SortableHeaderCell label="Customer" sortKey="customerId" currentSort={sortConfig} onSort={handleSort} onFilter={tableFilter} filterValue={filters.customerId} />
                <th className="px-6 py-3">Items</th>
                <SortableHeaderCell label="Total" sortKey="total" currentSort={sortConfig} onSort={handleSort} onFilter={tableFilter} filterValue={filters.total} />
                <SortableHeaderCell label="Status" sortKey="isPaid" currentSort={sortConfig} onSort={handleSort} onFilter={tableFilter} filterValue={filters.isPaid} />
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* FIX: Check if processedData exists */}
              {(!processedData || processedData.length === 0) ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500">No orders found.</td></tr>
              ) : processedData.map(order => {
                const cust = customers.find(c => c.id === order.customerId);
                const total = (order.items || []).reduce((sum, i) => sum + (i.count * i.price), 0) + (order.adjustment || 0);
                return (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">{order.date}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.poNumber}</td>
                    <td className="px-6 py-4">{cust ? cust.company : 'Unknown'}</td>
                    <td className="px-6 py-4">{(order.items || []).length} SKUs</td>
                    <td className="px-6 py-4 font-medium">${total.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {(() => {
                        if (order.isPaid) {
                          return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Paid</span>;
                        }

                        // Calculate Due Date
                        const terms = order.paymentTerms || 'Due on Receipt';
                        const dateObj = new Date(order.date);
                        let daysToAdd = 0;
                        if (terms === 'Net 15') daysToAdd = 15;
                        if (terms === 'Net 30') daysToAdd = 30;
                        if (terms === 'Net 45') daysToAdd = 45;
                        if (terms === 'Net 60') daysToAdd = 60;
                        dateObj.setDate(dateObj.getDate() + daysToAdd);

                        const today = new Date();
                        const diffTime = today - dateObj;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const isOverdue = diffDays > 0;

                        if (isOverdue) {
                          return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">{diffDays} Days Overdue</span>;
                        } else {
                          return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">Due: {formatDate(dateObj)}</span>;
                        }
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {order.filePO && (
                        <button onClick={() => handleViewFile(order.filePO)} title="View PO" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-indigo-600"><FileText className="w-4 h-4" /></button>
                      )}
                      {order.fileInvoice && (
                        <button onClick={() => handleViewFile(order.fileInvoice)} title="View Invoice" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-green-600"><Receipt className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => handleEdit(order)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-blue-600"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(order.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <OrderModal
          order={selectedOrder}
          customers={customers}
          allSkus={allSkus}
          cogs={cogs}
          companyLogo={companyLogo}
          outgoingOrders={outgoingOrders}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default OutgoingOrdersView;