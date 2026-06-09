import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Eye, Download, X, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';

// Helper to format currency
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

const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const InvoicesView = ({
    invoices = [],
    setInvoices,
    customers,
    myCompany,
    companyLogo,
}) => {
    const [viewMode, setViewMode] = useState('list'); // list, create
    const [previewHtml, setPreviewHtml] = useState('');
    const [previewInvoice, setPreviewInvoice] = useState(null);

    // --- Create Mode State ---
    const [newInvoice, setNewInvoice] = useState({
        invoiceNumber: '',
        customerName: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        terms: '',
        items: [],
        notes: '',
        status: 'Draft', // Draft, Sent, Paid, Cancelled
        // Ship To Address fields
        shipToName: '',
        shipAddress: '',
        shipAddress2: '',
        shipCity: '',
        shipState: '',
        shipZip: '',
        // Bill To Address fields
        billToName: '',
        billAddress: '',
        billAddress2: '',
        billCity: '',
        billState: '',
        billZip: '',
        // Shipping cost
        shippingAmount: 0,
    });

    // --- Helpers ---

    const getNextInvoiceNumber = () => {
        const existing = invoices.length;
        return `INV-${new Date().getFullYear()}-${String(existing + 1).padStart(3, '0')}`;
    };

    const generateInvoiceHtml = async (invoice) => {
        // Prepare Logo
        let logoImgTag = '';
        if (companyLogo) {
            try {
                const base64 = await blobToBase64(companyLogo);
                logoImgTag = `<img src="${base64}" class="logo-img" alt="Logo" />`;
            } catch (e) {
                console.error("Logo processing error", e);
            }
        }

        const itemsRows = invoice.items.map(i => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${i.sku}</td>
                <td style="padding: 10px;">${i.description || ''}</td>
                <td style="padding: 10px; text-align: right;">${i.qty}</td>
                <td style="padding: 10px; text-align: right;">${formatMoney(i.unitPrice)}</td>
                <td style="padding: 10px; text-align: right;">${formatMoney(i.qty * i.unitPrice)}</td>
            </tr>
        `).join('');

        const subtotal = invoice.items.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
        const shipping = invoice.shippingAmount || 0;
        const total = subtotal + shipping;

        return `
        <html>
        <head>
            <title>Invoice ${invoice.invoiceNumber}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #184833; padding-bottom: 20px; }
                .logo-container { margin-bottom: 15px; }
                .logo-img { max-height: 80px; max-width: 200px; }
                .company-name { font-size: 24px; font-weight: 900; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; color: #184833; }
                .company-details { font-size: 13px; color: #555; line-height: 1.4; }
                .invoice-meta { text-align: right; }
                .invoice-title { font-size: 32px; color: #184833; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; }
                .meta-row { display: flex; justify-content: flex-end; gap: 15px; font-size: 14px; margin-bottom: 5px; }
                .meta-label { font-weight: bold; color: #666; }

                .address-section { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 30px; }
                .address-box { flex: 1; background: #f9f9f9; padding: 20px; border-radius: 5px; }
                .address-box h3 { font-size: 12px; text-transform: uppercase; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 0 0 10px 0; }
                .address-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
                .address-info { font-size: 14px; line-height: 1.5; color: #444; }

                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { text-align: left; background: #184833; color: white; padding: 12px 10px; font-size: 12px; font-weight: bold; text-transform: uppercase; }

                .totals { display: flex; justify-content: flex-end; }
                .totals-box { width: 300px; }
                .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; }
                .total-row.final { border-top: 2px solid #184833; border-bottom: none; font-weight: 900; font-size: 20px; margin-top: 10px; padding-top: 15px; color: #184833; }

                .notes-box { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px; border-left: 3px solid #184833; font-size: 13px; }
                .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 13px; color: #888; }

                @media print {
                    body { padding: 20px; }
                    @page { size: letter portrait; margin: 0.5in; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="logo-container">
                        ${logoImgTag}
                    </div>
                    <div class="company-name">${myCompany?.name || 'Company Name'}</div>
                    <div class="company-details">
                        ${myCompany?.address1 || ''}<br>
                        ${myCompany?.address2 ? `${myCompany.address2}<br>` : ''}
                        ${myCompany?.city ? `${myCompany.city}, ` : ''}${myCompany?.state || ''} ${myCompany?.zip || ''}<br>
                        ${myCompany?.email || ''}<br>
                        ${myCompany?.phone || ''}
                    </div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-title">Invoice</div>
                    <div class="meta-row"><span class="meta-label">INVOICE #:</span> <span>${invoice.invoiceNumber}</span></div>
                    <div class="meta-row"><span class="meta-label">DATE:</span> <span>${formatDate(invoice.invoiceDate)}</span></div>
                    ${invoice.terms ? `<div class="meta-row"><span class="meta-label">TERMS:</span> <span>${invoice.terms}</span></div>` : ''}
                </div>
            </div>

            <div class="address-section">
                <div class="address-box">
                    <h3>Bill To</h3>
                    <div class="address-name">${invoice.billToName || invoice.customerName || ''}</div>
                    <div class="address-info">
                        ${invoice.billAddress || ''}${invoice.billAddress ? '<br>' : ''}
                        ${invoice.billAddress2 ? `${invoice.billAddress2}<br>` : ''}
                        ${invoice.billCity || ''}${invoice.billCity && invoice.billState ? ', ' : ''}${invoice.billState || ''} ${invoice.billZip || ''}
                    </div>
                </div>
                <div class="address-box">
                    <h3>Ship To</h3>
                    <div class="address-name">${invoice.shipToName || invoice.customerName || ''}</div>
                    <div class="address-info">
                        ${invoice.shipAddress || ''}${invoice.shipAddress ? '<br>' : ''}
                        ${invoice.shipAddress2 ? `${invoice.shipAddress2}<br>` : ''}
                        ${invoice.shipCity || ''}${invoice.shipCity && invoice.shipState ? ', ' : ''}${invoice.shipState || ''} ${invoice.shipZip || ''}
                    </div>
                </div>
            </div>

            <table>
                <thead><tr><th>SKU</th><th>Description</th><th style="text-align: right;">Qty</th><th style="text-align: right;">Unit Price</th><th style="text-align: right;">Amount</th></tr></thead>
                <tbody>${itemsRows}</tbody>
            </table>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 40px;">
                ${invoice.notes ? `
                <div class="notes-box" style="flex: 1; margin-top: 0;">
                    <strong>Notes:</strong><br>${invoice.notes}
                </div>` : '<div style="flex: 1;"></div>'}
                <div class="totals-box">
                    <div class="total-row">
                        <span>Subtotal</span>
                        <span>${formatMoney(subtotal)}</span>
                    </div>
                    <div class="total-row">
                        <span>Shipping</span>
                        <span>${formatMoney(shipping)}</span>
                    </div>
                    <div class="total-row final">
                        <span>TOTAL</span>
                        <span>${formatMoney(total)}</span>
                    </div>
                </div>
            </div>

            <div class="footer">
                Thank you for your business! Please contact us with any questions.
            </div>
        </body>
        </html>
    `;
    };

    // --- Handlers ---

    const handleCreateStart = () => {
        setNewInvoice({
            invoiceNumber: getNextInvoiceNumber(),
            customerName: '',
            invoiceDate: new Date().toISOString().split('T')[0],
            terms: '',
            items: [],
            notes: '',
            status: 'Draft',
            shipToName: '',
            shipAddress: '',
            shipAddress2: '',
            shipCity: '',
            shipState: '',
            shipZip: '',
            billToName: '',
            billAddress: '',
            billAddress2: '',
            billCity: '',
            billState: '',
            billZip: '',
            shippingAmount: 0,
        });
        setViewMode('create');
    };

    const handleEditInvoice = (invoice) => {
        setNewInvoice({
            ...invoice,
            shippingAmount: invoice.shippingAmount || 0,
            shipToName: invoice.shipToName || '',
            shipAddress: invoice.shipAddress || '',
            shipAddress2: invoice.shipAddress2 || '',
            shipCity: invoice.shipCity || '',
            shipState: invoice.shipState || '',
            shipZip: invoice.shipZip || '',
            billToName: invoice.billToName || '',
            billAddress: invoice.billAddress || '',
            billAddress2: invoice.billAddress2 || '',
            billCity: invoice.billCity || '',
            billState: invoice.billState || '',
            billZip: invoice.billZip || '',
        });
        setViewMode('create');
    };

    const handleAddItem = () => {
        setNewInvoice(prev => ({
            ...prev,
            items: [...prev.items, { id: Date.now(), sku: '', description: '', qty: 1, unitPrice: 0 }]
        }));
    };

    const updateItem = (id, field, value) => {
        setNewInvoice(prev => ({
            ...prev,
            items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const removeItem = (id) => {
        setNewInvoice(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    const saveInvoice = () => {
        if (!newInvoice.customerName?.trim()) {
            toast.error("Please enter a customer name");
            return;
        }

        const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
        const totalAmount = subtotal + (parseFloat(newInvoice.shippingAmount) || 0);

        const isUpdate = newInvoice.id;
        const finalInvoice = {
            ...newInvoice,
            id: newInvoice.id || Date.now(),
            subtotal,
            totalAmount,
        };

        if (isUpdate) {
            setInvoices(prev => prev.map(q => q.id === finalInvoice.id ? finalInvoice : q));
            toast.success(`Invoice ${finalInvoice.invoiceNumber} updated`);
        } else {
            setInvoices(prev => [...prev, finalInvoice]);
            toast.success(`Invoice ${finalInvoice.invoiceNumber} created`);
        }

        setViewMode('list');
    };

    const deleteInvoice = (id) => {
        if (window.confirm('Delete this invoice?')) {
            setInvoices(prev => prev.filter(q => q.id !== id));
            toast.error('Invoice deleted');
        }
    };

    const updateStatus = (id, status) => {
        setInvoices(prev => prev.map(q => q.id === id ? { ...q, status } : q));
        toast.success(`Invoice marked as ${status}`);
    };

    const downloadInvoice = async (invoice) => {
        const html = await generateInvoiceHtml(invoice);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const openPreview = async (invoice) => {
        const html = await generateInvoiceHtml(invoice);
        setPreviewHtml(html);
        setPreviewInvoice(invoice);
    };

    const closePreview = () => {
        setPreviewInvoice(null);
        setPreviewHtml('');
    };

    const copyBillToShip = () => {
        setNewInvoice(prev => ({
            ...prev,
            shipToName: prev.billToName,
            shipAddress: prev.billAddress,
            shipAddress2: prev.billAddress2,
            shipCity: prev.billCity,
            shipState: prev.billState,
            shipZip: prev.billZip,
        }));
    };

    // --- Computed ---
    const sortedInvoices = useMemo(() => {
        return [...invoices].sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
    }, [invoices]);

    // --- Create View ---
    if (viewMode === 'create') {
        const subtotal = newInvoice.items.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0);
        const shipping = parseFloat(newInvoice.shippingAmount) || 0;
        const total = subtotal + shipping;

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-center border-b pb-4 dark:border-gray-700">
                    <h2 className="text-xl font-bold dark:text-white">{newInvoice.id ? 'Edit' : 'Create'} Invoice</h2>
                    <button onClick={() => setViewMode('list')} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">Cancel</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name</label>
                        <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            placeholder="Enter customer name..."
                            value={newInvoice.customerName}
                            onChange={(e) => setNewInvoice({ ...newInvoice, customerName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Number</label>
                        <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={newInvoice.invoiceNumber}
                            onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Date</label>
                        <input
                            type="date"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={newInvoice.invoiceDate}
                            onChange={(e) => setNewInvoice({ ...newInvoice, invoiceDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Terms</label>
                        <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            placeholder="e.g. Net 30"
                            value={newInvoice.terms}
                            onChange={(e) => setNewInvoice({ ...newInvoice, terms: e.target.value })}
                        />
                    </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-4 dark:border-gray-700">
                    {/* Bill To */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium dark:text-white">Bill To</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Recipient Name / Company</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                placeholder="Leave blank to use customer name..."
                                value={newInvoice.billToName || ''}
                                onChange={(e) => setNewInvoice({ ...newInvoice, billToName: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address Line 1</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newInvoice.billAddress || ''}
                                    onChange={(e) => setNewInvoice({ ...newInvoice, billAddress: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address Line 2</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newInvoice.billAddress2 || ''}
                                    onChange={(e) => setNewInvoice({ ...newInvoice, billAddress2: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newInvoice.billCity || ''}
                                    onChange={(e) => setNewInvoice({ ...newInvoice, billCity: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">State</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newInvoice.billState || ''}
                                    onChange={(e) => setNewInvoice({ ...newInvoice, billState: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Zip</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newInvoice.billZip || ''}
                                    onChange={(e) => setNewInvoice({ ...newInvoice, billZip: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ship To */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium dark:text-white">Ship To</h3>
                            <button type="button" onClick={copyBillToShip} className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white px-2 py-1 rounded">
                                Copy from Bill To
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Recipient Name / Company</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                placeholder="Leave blank to use customer name..."
                                value={newInvoice.shipToName || ''}
                                onChange={(e) => setNewInvoice({ ...newInvoice, shipToName: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address Line 1</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newInvoice.shipAddress || ''}
                                    onChange={(e) => setNewInvoice({ ...newInvoice, shipAddress: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address Line 2</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newInvoice.shipAddress2 || ''}
                                    onChange={(e) => setNewInvoice({ ...newInvoice, shipAddress2: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newInvoice.shipCity || ''}
                                    onChange={(e) => setNewInvoice({ ...newInvoice, shipCity: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">State</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newInvoice.shipState || ''}
                                    onChange={(e) => setNewInvoice({ ...newInvoice, shipState: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Zip</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newInvoice.shipZip || ''}
                                    onChange={(e) => setNewInvoice({ ...newInvoice, shipZip: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="border-t pt-4 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium dark:text-white">Items</h3>
                        <button type="button" onClick={handleAddItem} className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded hover:bg-indigo-100">+ Add Item</button>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {newInvoice.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="p-2">
                                            <input
                                                className="w-full text-sm border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1"
                                                placeholder="SKU"
                                                value={item.sku}
                                                onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                className="w-full text-sm border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1"
                                                placeholder="Description"
                                                value={item.description}
                                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number" className="w-full text-sm text-right border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1"
                                                value={item.qty}
                                                onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value))}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number" step="0.01" className="w-full text-sm text-right border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                                            />
                                        </td>
                                        <td className="p-2 text-right text-sm font-medium dark:text-white">
                                            {formatMoney(item.qty * item.unitPrice)}
                                        </td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Shipping Amount */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shipping Amount</label>
                        <input
                            type="number"
                            step="0.01"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={newInvoice.shippingAmount}
                            onChange={(e) => setNewInvoice({ ...newInvoice, shippingAmount: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="flex items-end col-span-2 justify-end">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Subtotal: <span className="font-semibold text-gray-900 dark:text-white">{formatMoney(subtotal)}</span>
                            {' | '}Shipping: <span className="font-semibold text-gray-900 dark:text-white">{formatMoney(shipping)}</span>
                            {' | '}Total: <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatMoney(total)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea
                        rows={3}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border text-sm"
                        placeholder="Optional notes for this invoice..."
                        value={newInvoice.notes || ''}
                        onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={saveInvoice} className="bg-indigo-600 text-white px-6 py-2 rounded shadow hover:bg-indigo-700">Save Invoice</button>
                </div>
            </div>
        );
    }

    // --- List View ---
    return (
        <div className="space-y-6">
            {/* Preview Modal */}
            {previewInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
                        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                            <h3 className="font-bold dark:text-white">Invoice Preview — {previewInvoice.invoiceNumber}</h3>
                            <div className="flex gap-2">
                                <button onClick={() => downloadInvoice(previewInvoice)} className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 flex items-center gap-1">
                                    <Download className="w-3 h-3" /> Print
                                </button>
                                <button onClick={closePreview} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <iframe
                                srcDoc={previewHtml}
                                className="w-full border-0"
                                style={{ height: '800px' }}
                                title="Invoice Preview"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invoices</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage outgoing invoices for customers</p>
                </div>
                <button onClick={handleCreateStart} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-indigo-700">
                    <Plus className="w-4 h-4" /> New Invoice
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Invoice #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Terms</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {sortedInvoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                        {invoice.invoiceNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{invoice.customerName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(invoice.invoiceDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{invoice.terms || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <select
                                            value={invoice.status}
                                            onChange={(e) => updateStatus(invoice.id, e.target.value)}
                                            className={`px-2 py-0.5 text-xs font-semibold rounded-full border-0 cursor-pointer
                                                ${invoice.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                invoice.status === 'Sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                invoice.status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'}`}
                                        >
                                            <option value="Draft">Draft</option>
                                            <option value="Sent">Sent</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                                        {formatMoney(invoice.totalAmount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleEditInvoice(invoice)} className="text-gray-400 hover:text-indigo-600" title="Edit Invoice">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => openPreview(invoice)} className="text-gray-400 hover:text-indigo-600" title="Preview Invoice">
                                            <FileText className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => downloadInvoice(invoice)} className="text-gray-400 hover:text-indigo-600" title="Print Invoice">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => deleteInvoice(invoice.id)} className="text-gray-400 hover:text-red-600" title="Delete Invoice">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sortedInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        No invoices yet. Click "New Invoice" to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoicesView;
