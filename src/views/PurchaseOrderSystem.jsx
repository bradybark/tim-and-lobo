import React, { useState, useMemo, useRef } from 'react';
import { Plus, Download, Upload, Check, Trash2, ArrowLeft, FileText, Calendar, DollarSign, Eye, X } from 'lucide-react';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { VendorCell } from '../components/VendorCell';
import html2pdf from 'html2pdf.js';

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

const PurchaseOrderSystem = ({
    pos, // List of PO documents
    updatePOs, // Function to update PO list
    vendors,
    skuImages,
    poBackupHandle,
    invoiceBackupHandle,
    myCompany,
    companyLogo
}) => {
    const [viewMode, setViewMode] = useState('list'); // list, create
    const [previewPO, setPreviewPO] = useState(null); // PO object to preview
    const [previewHtml, setPreviewHtml] = useState(''); // HTML content for preview

    // --- Create Mode State ---
    const [newPO, setNewPO] = useState({
        poNumber: '',
        vendorId: '',
        orderDate: new Date().toISOString().split('T')[0],
        items: [],
        notes: '',
        status: 'Draft', // Draft, Sent, Received, Paid
        termType: 'Due on Receipt',
        termDays: 0,
        // Ship To Address fields
        shipAddress: '',
        shipAddress2: '',
        shipCity: '',
        shipState: '',
        shipZip: '',
        // Bill To Address fields (separate)
        billAddress: '',
        billAddress2: '',
        billCity: '',
        billState: '',
        billZip: ''
    });

    const termOptions = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Custom'];

    // --- Document Handling State ---
    const fileInputRef = useRef(null);
    const [uploadingPoId, setUploadingPoId] = useState(null);

    // Filter out legacy POs
    const validPOs = useMemo(() => pos.filter(p => p.items && Array.isArray(p.items)), [pos]);

    // --- List View Logic ---
    const { processedData, sortConfig, handleSort, filters, handleFilter } = useTable(validPOs, { key: 'orderDate', direction: 'desc' });

    // --- Helpers ---

    // Calculate term days from termType
    const getTermDays = (termType, customDays) => {
        if (termType === 'Due on Receipt') return 0;
        if (termType === 'Custom') return Number(customDays) || 0;
        // Parse "Net XX" format
        const match = termType?.match(/Net (\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    };

    const generatePOHtml = async (po, vendor) => {
        const vendorName = vendor?.name?.name || vendor?.name || 'Unknown Vendor';
        const vendorAddress = vendor?.address || '';
        const vendorEmail = vendor?.email || '';

        // Use PO-specific addresses
        const shipAddr = po.shipAddress || '';
        const shipAddr2 = po.shipAddress2 || '';
        const shipCity = po.shipCity || '';
        const shipState = po.shipState || '';
        const shipZip = po.shipZip || '';

        const billAddr = po.billAddress || '';
        const billAddr2 = po.billAddress2 || '';
        const billCity = po.billCity || '';
        const billState = po.billState || '';
        const billZip = po.billZip || '';

        // Prepare Logo
        let logoImgTag = '';
        if (companyLogo) {
            try {
                const base64 = await blobToBase64(companyLogo);
                logoImgTag = `<img src="${base64}" style="max-height: 80px; display: block; margin-bottom: 10px;" alt="Logo" />`;
            } catch (e) {
                console.error("Logo processing error", e);
            }
        }

        // Terms String
        const paymentTerms = po.termType === 'Custom' ? `Net ${po.termDays}` : po.termType;

        const itemsRows = po.items.map(i => `
            <tr>
                <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px;">${i.sku}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px;">${i.description || ''}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 11px;">${i.qty}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 11px;">${formatMoney(i.unitPrice)}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 11px;">${formatMoney(i.qty * i.unitPrice)}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @page { size: portrait; margin: 0.5in; }
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; margin: 0; color: #333; -webkit-print-color-adjust: exact; background: white; }
                    .content-wrapper { max-width: 800px; margin: 0 auto; padding: 20px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 3px solid #184833; padding-bottom: 10px; }
                    .company-info { font-size: 11px; line-height: 1.3; color: #555; }
                    .company-name { font-size: 16px; font-weight: bold; color: #184833; margin-bottom: 4px; text-transform: uppercase; }
                    .po-title { text-align: right; }
                    .po-title h1 { margin: 0 0 5px 0; font-size: 24px; color: #184833; text-transform: uppercase; font-weight: 700; }
                    .po-details { font-size: 11px; line-height: 1.4; }
                    .section-title { font-size: 10px; text-transform: uppercase; color: #184833; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 2px; margin-bottom: 4px; }
                    .address-block { font-size: 11px; line-height: 1.3; }
                    .address-name { font-weight: bold; color: #000; }
                    .grid-container { display: flex; gap: 20px; margin-bottom: 25px; }
                    .flex-1 { flex: 1; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th { background-color: #184833; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; font-weight: 600; }
                    .totals { display: flex; justify-content: flex-end; }
                    .totals-box { width: 250px; }
                    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
                    .grand-total { font-size: 14px; font-weight: bold; border-top: 2px solid #184833; padding-top: 6px; margin-top: 4px; color: #184833; }
                    .footer { text-align: center; margin-top: 40px; color: #666; font-size: 10px; border-top: 1px solid #eee; padding-top: 15px; }
                </style>
            </head>
            <body>
                <div class="content-wrapper">
                    <div class="header">
                        <div>
                            ${logoImgTag}
                            <div class="company-name">${myCompany?.name || 'Timothy\'s Toolbox'}</div>
                            <div class="company-info">
                                ${myCompany?.address1 || ''}<br>
                                ${myCompany?.address2 ? `${myCompany.address2}<br>` : ''}
                                ${myCompany?.city ? `${myCompany.city}, ` : ''}${myCompany?.state || ''} ${myCompany?.zip || ''}<br>
                                ${myCompany?.email || 'info@timothystoolbox.com'}
                            </div>
                        </div>
                        <div class="po-title">
                            <h1>Purchase Order</h1>
                            <div class="po-details">
                                <strong>DATE:</strong> ${formatDate(po.orderDate)}<br>
                                <strong>PO #:</strong> ${po.poNumber}<br>
                                <strong>TERMS:</strong> ${paymentTerms}
                            </div>
                        </div>
                    </div>

                    <div class="grid-container">
                        <div class="flex-1">
                            <div class="section-title">Vendor</div>
                            <div class="address-block">
                                <div class="address-name">${vendorName}</div>
                                ${vendorAddress}<br>
                                ${vendorEmail}
                            </div>
                        </div>
                        <div class="flex-1">
                            <div class="section-title">Ship To</div>
                            <div class="address-block">
                                <div class="address-name">${myCompany?.name || ''}</div>
                                ${shipAddr}<br>
                                ${shipAddr2 ? `${shipAddr2}<br>` : ''}
                                ${shipCity}${shipCity && shipState ? ', ' : ''}${shipState} ${shipZip}
                            </div>
                        </div>
                        <div class="flex-1">
                            <div class="section-title">Bill To</div>
                            <div class="address-block">
                                <div class="address-name">${myCompany?.name || ''}</div>
                                ${billAddr}<br>
                                ${billAddr2 ? `${billAddr2}<br>` : ''}
                                ${billCity}${billCity && billState ? ', ' : ''}${billState} ${billZip}
                            </div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Description</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Unit Price</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>${itemsRows}</tbody>
                    </table>

                    <div class="totals">
                        <div class="totals-box">
                            <div class="total-row">
                                <span>Subtotal</span>
                                <span>${formatMoney(po.totalAmount)}</span>
                            </div>
                            <div class="total-row">
                                <span>Shipping</span>
                                <span>$0.00</span>
                            </div>
                            <div class="total-row grand-total">
                                <span>TOTAL</span>
                                <span>${formatMoney(po.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    ${po.notes ? `
                    <div style="margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 4px; font-size: 11px; border-left: 3px solid #184833;">
                        <strong>Notes:</strong><br>${po.notes}
                    </div>` : ''}

                    <div class="footer">
                        Please remit invoices to info@timothystoolbox.com. Please Ship as soon as possible and provide tracking information once shipped.
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    // --- Handlers ---

    const handleCreateStart = () => {
        setNewPO({
            poNumber: `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`,
            vendorId: '',
            orderDate: new Date().toISOString().split('T')[0],
            items: [],
            notes: '',
            status: 'Draft',
            termType: 'Due on Receipt',
            termDays: 0,
            // Pre-fill Ship To from company profile
            shipAddress: myCompany?.address1 || '',
            shipAddress2: myCompany?.address2 || '',
            shipCity: myCompany?.city || '',
            shipState: myCompany?.state || '',
            shipZip: myCompany?.zip || '',
            // Pre-fill Bill To from company profile
            billAddress: myCompany?.address1 || '',
            billAddress2: myCompany?.address2 || '',
            billCity: myCompany?.city || '',
            billState: myCompany?.state || '',
            billZip: myCompany?.zip || ''
        });
        setViewMode('create');
    };

    const handleEditPO = (po) => {
        setNewPO({
            ...po,
            termDays: po.termDays || 0,
            shipAddress: po.shipAddress || myCompany?.address1 || '',
            shipAddress2: po.shipAddress2 || myCompany?.address2 || '',
            shipCity: po.shipCity || myCompany?.city || '',
            shipState: po.shipState || myCompany?.state || '',
            shipZip: po.shipZip || myCompany?.zip || '',
            billAddress: po.billAddress || myCompany?.address1 || '',
            billAddress2: po.billAddress2 || myCompany?.address2 || '',
            billCity: po.billCity || myCompany?.city || '',
            billState: po.billState || myCompany?.state || '',
            billZip: po.billZip || myCompany?.zip || ''
        });
        setViewMode('create');
    };

    const handleAddItem = () => {
        setNewPO(prev => ({
            ...prev,
            items: [...prev.items, { id: Date.now(), sku: '', description: '', qty: 1, unitPrice: 0 }]
        }));
    };

    const updateItem = (id, field, value) => {
        setNewPO(prev => ({
            ...prev,
            items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const removeItem = (id) => {
        setNewPO(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    const handleVendorSelect = (vendorId) => {
        setNewPO(prev => ({ ...prev, vendorId }));
    };

    const handleVendorProductSelect = (itemId, product) => {
        updateItem(itemId, 'sku', product.sku);
        updateItem(itemId, 'description', product.description);
        updateItem(itemId, 'unitPrice', product.price);
    };

    const savePO = async () => {
        if (!newPO.vendorId) {
            alert("Please select a vendor");
            return;
        }
        const totalAmount = newPO.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

        // Check if updating existing PO or creating new one
        const isUpdate = newPO.id;
        const finalPO = {
            ...newPO,
            id: newPO.id || Date.now(),
            totalAmount,
            documents: newPO.documents || []
        };

        // 1. Update State
        if (isUpdate) {
            updatePOs(pos.map(p => p.id === finalPO.id ? finalPO : p));
        } else {
            updatePOs([...pos, finalPO]);
        }

        // 2. Automated Backup (If Folder Set) - Only for new POs
        if (poBackupHandle && !isUpdate) {
            try {
                const vendor = vendors.find(v => v.id == finalPO.vendorId);
                const html = await generatePOHtml(finalPO, vendor);

                const fileHandle = await poBackupHandle.getFileHandle(`${finalPO.poNumber}.html`, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(html);
                await writable.close();
            } catch (err) {
                console.error("Backup failed", err);
                alert("Failed to save backup copy. Check permissions.");
            }
        }

        setViewMode('list');
    };

    const handleMarkPaid = (poId) => {
        updatePOs(pos.map(p => p.id === poId ? { ...p, status: 'Paid' } : p));
    };

    const handleUndoPaid = (poId) => {
        updatePOs(pos.map(p => p.id === poId ? { ...p, status: 'Received' } : p));
    };

    const handleUpdateInvoiceDate = (poId, newInvoiceDate) => {
        updatePOs(pos.map(p => {
            if (p.id === poId) {
                // Recalculate due date based on new invoice date and terms
                const termsDays = getTermDays(p.termType, p.termDays);
                const iDate = new Date(newInvoiceDate);
                iDate.setDate(iDate.getDate() + termsDays);
                const dueDate = !isNaN(iDate.getTime()) ? iDate.toISOString().split('T')[0] : '';
                return { ...p, invoiceDate: newInvoiceDate, dueDate };
            }
            return p;
        }));
    };

    const calculateDaysUntilDue = (dueDate) => {
        if (!dueDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const selectedVendor = vendors.find(v => v.id == newPO.vendorId);

    const handleUploadClick = (poId) => {
        setUploadingPoId(poId);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingPoId) return;

        const invoiceDate = prompt("Enter Invoice Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
        if (!invoiceDate) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const result = evt.target.result;

            const updatedPOs = pos.map(p => {
                if (p.id === uploadingPoId) {
                    const newDoc = {
                        id: Date.now(),
                        name: file.name,
                        type: 'invoice',
                        data: result,
                        date: new Date().toISOString()
                    };

                    // Use helper function to get correct term days
                    const termsDays = getTermDays(p.termType, p.termDays);

                    const iDate = new Date(invoiceDate);
                    iDate.setDate(iDate.getDate() + termsDays);
                    const dueDate = !isNaN(iDate.getTime()) ? iDate.toISOString().split('T')[0] : '';

                    return {
                        ...p,
                        documents: [...(p.documents || []), newDoc],
                        status: 'Received',
                        invoiceDate: invoiceDate,
                        dueDate: dueDate
                    };
                }
                return p;
            });
            updatePOs(updatedPOs);

            if (invoiceBackupHandle) {
                try {
                    const po = pos.find(p => p.id === uploadingPoId);
                    const fileName = `${po.poNumber}_INV_${file.name}`;
                    const fileHandle = await invoiceBackupHandle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();
                } catch (err) {
                    console.error("Invoice backup failed", err);
                    alert("Failed to save invoice info to backup folder.");
                }
            }

            setUploadingPoId(null);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const downloadDocument = (doc) => {
        const link = document.createElement('a');
        link.href = doc.data;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadPO = async (po, asPdf = true) => {
        const vendor = vendors.find(v => v.id == po.vendorId);
        const html = await generatePOHtml(po, vendor);

        if (asPdf) {
            // Create a temporary container for html2pdf
            const container = document.createElement('div');
            container.innerHTML = html;
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            document.body.appendChild(container);

            const opt = {
                margin: 0,
                filename: `${po.poNumber}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            try {
                await html2pdf().set(opt).from(container).save();
            } finally {
                document.body.removeChild(container);
            }
        } else {
            // Fallback to HTML download
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${po.poNumber}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    const openPreview = async (po) => {
        const vendor = vendors.find(v => v.id == po.vendorId);
        const html = await generatePOHtml(po, vendor);
        setPreviewHtml(html);
        setPreviewPO(po);
    };

    const closePreview = () => {
        setPreviewPO(null);
        setPreviewHtml('');
    };


    // --- Render Functions ---

    if (viewMode === 'create') {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-center border-b pb-4 dark:border-gray-700">
                    <h2 className="text-xl font-bold dark:text-white">{newPO.id ? 'Edit' : 'Create'} Purchase Order</h2>
                    <button onClick={() => setViewMode('list')} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">Cancel</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vendor</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={newPO.vendorId}
                            onChange={(e) => handleVendorSelect(e.target.value)}
                        >
                            <option value="">Select Vendor...</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name?.name || v.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">PO Number</label>
                        <input
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={newPO.poNumber}
                            onChange={(e) => setNewPO({ ...newPO, poNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order Date</label>
                        <input
                            type="date"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={newPO.orderDate}
                            onChange={(e) => setNewPO({ ...newPO, orderDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Terms</label>
                        <select
                            className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                            value={newPO.termType}
                            onChange={(e) => setNewPO({ ...newPO, termType: e.target.value })}
                        >
                            {termOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    {newPO.termType === 'Custom' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Days to Pay</label>
                            <input
                                type="number"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                value={newPO.termDays}
                                onChange={(e) => setNewPO({ ...newPO, termDays: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                {/* Ship To and Bill To - Separate Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 dark:border-gray-700">
                    {/* Ship To */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium dark:text-white">Ship To</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address Line 1</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                value={newPO.shipAddress || ''}
                                onChange={(e) => setNewPO({ ...newPO, shipAddress: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address Line 2</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                value={newPO.shipAddress2 || ''}
                                onChange={(e) => setNewPO({ ...newPO, shipAddress2: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newPO.shipCity || ''}
                                    onChange={(e) => setNewPO({ ...newPO, shipCity: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">State</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newPO.shipState || ''}
                                    onChange={(e) => setNewPO({ ...newPO, shipState: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Zip</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newPO.shipZip || ''}
                                    onChange={(e) => setNewPO({ ...newPO, shipZip: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium dark:text-white">Bill To</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address Line 1</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                value={newPO.billAddress || ''}
                                onChange={(e) => setNewPO({ ...newPO, billAddress: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address Line 2</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                value={newPO.billAddress2 || ''}
                                onChange={(e) => setNewPO({ ...newPO, billAddress2: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newPO.billCity || ''}
                                    onChange={(e) => setNewPO({ ...newPO, billCity: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">State</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newPO.billState || ''}
                                    onChange={(e) => setNewPO({ ...newPO, billState: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Zip</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    value={newPO.billZip || ''}
                                    onChange={(e) => setNewPO({ ...newPO, billZip: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div>
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
                                {newPO.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="p-2">
                                            <div className="flex flex-col">
                                                {selectedVendor?.products?.length > 0 ? (
                                                    <select
                                                        className="text-sm border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1 mb-1"
                                                        onChange={(e) => {
                                                            const prod = selectedVendor.products.find(p => p.sku === e.target.value);
                                                            if (prod) handleVendorProductSelect(item.id, prod);
                                                        }}
                                                        value={item.sku}
                                                    >
                                                        <option value="">Select from Catalog...</option>
                                                        {selectedVendor.products.map(p => <option key={p.sku} value={p.sku}>{p.sku}</option>)}
                                                    </select>
                                                ) : null}
                                                <input
                                                    className="w-full text-sm border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1"
                                                    placeholder="Custom SKU"
                                                    value={item.sku}
                                                    onChange={(e) => updateItem(item.id, 'sku', e.target.value)}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-2">
                                            <input
                                                className="w-full text-sm border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1"
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
                            <tfoot className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <td colSpan={5} className="p-2 text-right font-bold text-gray-700 dark:text-gray-300">Total:</td>
                                    <td className="p-2 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                        {formatMoney(newPO.items.reduce((sum, i) => sum + (i.qty * i.unitPrice), 0))}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={savePO} className="bg-indigo-600 text-white px-6 py-2 rounded shadow hover:bg-indigo-700">Save Purchase Order</button>
                </div>
            </div>
        );
    }

    // --- List View ---
    return (
        <div className="space-y-6">
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} />

            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Purchase Orders</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your vendor orders</p>
                </div>
                <button onClick={handleCreateStart} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-indigo-700">
                    <Plus className="w-4 h-4" /> New Order
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <SortableHeaderCell label="PO #" sortKey="poNumber" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.poNumber} />
                                <SortableHeaderCell label="Vendor" sortKey="vendorName" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.vendorName} />
                                <SortableHeaderCell label="Date" sortKey="orderDate" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.orderDate} />
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Invoice Info</th>
                                <SortableHeaderCell label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.status} />
                                <SortableHeaderCell label="Total" sortKey="totalAmount" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.totalAmount} className="text-right" />
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {processedData.map((po) => {
                                const vendor = vendors.find(v => v.id == po.vendorId);
                                const vendorName = vendor ? (vendor.name?.name || vendor.name) : '-';
                                const hasDocs = po.documents && po.documents.length > 0;
                                const daysUntilDue = calculateDaysUntilDue(po.dueDate);
                                const hasInvoice = hasDocs || po.invoiceDate;

                                return (
                                    <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                            {po.poNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{vendorName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(po.orderDate)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {po.invoiceDate ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">Inv:</span>
                                                        <input
                                                            type="date"
                                                            value={po.invoiceDate}
                                                            onChange={(e) => handleUpdateInvoiceDate(po.id, e.target.value)}
                                                            className="text-xs border rounded px-1 py-0.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                        />
                                                    </div>
                                                    {po.dueDate && (
                                                        <div className="text-xs text-amber-600 dark:text-amber-400">
                                                            Due: {formatDate(po.dueDate)}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <button onClick={() => downloadPO(po)} className="text-xs flex items-center gap-1 text-indigo-600 hover:underline">
                                                    <Download className="w-3 h-3" /> PO
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {po.status === 'Paid' ? (
                                                <button
                                                    onClick={() => handleUndoPaid(po.id)}
                                                    className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 cursor-pointer"
                                                    title="Click to undo Paid status"
                                                >
                                                    PAID ✕
                                                </button>
                                            ) : hasInvoice ? (
                                                // Has invoice - show status with mark as paid option
                                                daysUntilDue !== null && daysUntilDue < 0 ? (
                                                    <button
                                                        onClick={() => handleMarkPaid(po.id)}
                                                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 cursor-pointer"
                                                        title="Click to mark as Paid"
                                                    >
                                                        OVERDUE
                                                    </button>
                                                ) : daysUntilDue !== null && daysUntilDue <= 10 ? (
                                                    <button
                                                        onClick={() => handleMarkPaid(po.id)}
                                                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 cursor-pointer"
                                                        title="Click to mark as Paid"
                                                    >
                                                        Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleMarkPaid(po.id)}
                                                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:bg-yellow-200 cursor-pointer"
                                                        title="Click to mark as Paid"
                                                    >
                                                        {po.status} {daysUntilDue !== null && `(${daysUntilDue}d)`}
                                                    </button>
                                                )
                                            ) : (
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${po.status === 'Sent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {po.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                                            {formatMoney(po.totalAmount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button onClick={() => handleEditPO(po)} className="text-gray-400 hover:text-indigo-600" title="View/Edit PO">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => downloadPO(po)} className="text-gray-400 hover:text-indigo-600" title="Download PO">
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleUploadClick(po.id)} className="text-gray-400 hover:text-indigo-600" title="Upload Invoice">
                                                <Upload className="w-4 h-4" />
                                            </button>
                                            {hasDocs && (
                                                <button onClick={() => downloadDocument(po.documents[po.documents.length - 1])} className="text-gray-400 hover:text-indigo-600" title="Download Last Invoice">
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


export default PurchaseOrderSystem;
