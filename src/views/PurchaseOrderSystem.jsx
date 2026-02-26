import React, { useState, useMemo, useRef } from 'react';
import { Plus, Download, Upload, Check, Trash2, ArrowLeft, FileText, Calendar, DollarSign, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { VendorCell } from '../components/VendorCell';

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
    setVendors,
    skuImages,
    poBackupHandle,
    invoiceBackupHandle,
    myCompany,
    companyLogo,
    onOpenVendors
}) => {
    const [viewMode, setViewMode] = useState('list'); // list, create
    const [previewPO, setPreviewPO] = useState(null);
    const [previewHtml, setPreviewHtml] = useState('');
    const [activeSubTab, setActiveSubTab] = useState('orders'); // orders, reports

    // --- New Vendor Inline State ---
    const [showNewVendorInput, setShowNewVendorInput] = useState(false);
    const [newVendorName, setNewVendorName] = useState('');

    // --- Report State ---
    const [reportStartDate, setReportStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 3);
        return d.toISOString().split('T')[0];
    });
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportVendorFilter, setReportVendorFilter] = useState('all');

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

    // --- Report Computed Data ---
    const filteredPOs = useMemo(() => {
        return validPOs.filter(po => {
            const d = po.orderDate;
            if (d < reportStartDate || d > reportEndDate) return false;
            if (reportVendorFilter !== 'all' && String(po.vendorId) !== String(reportVendorFilter)) return false;
            return true;
        });
    }, [validPOs, reportStartDate, reportEndDate, reportVendorFilter]);

    const vendorSummary = useMemo(() => {
        const map = {};
        filteredPOs.forEach(po => {
            const vendor = vendors.find(v => v.id == po.vendorId);
            const name = vendor?.name?.name || vendor?.name || 'Unknown';
            if (!map[po.vendorId]) map[po.vendorId] = { name, poCount: 0, totalSpend: 0, items: 0 };
            map[po.vendorId].poCount += 1;
            map[po.vendorId].totalSpend += (po.totalAmount || 0);
            map[po.vendorId].items += po.items.reduce((s, i) => s + (i.qty || 0), 0);
        });
        return Object.values(map).sort((a, b) => b.totalSpend - a.totalSpend);
    }, [filteredPOs, vendors]);

    const skuSummary = useMemo(() => {
        const map = {};
        filteredPOs.forEach(po => {
            po.items.forEach(item => {
                const key = item.sku || 'Unknown';
                if (!map[key]) map[key] = { sku: key, totalQty: 0, totalSpend: 0, poCount: 0, vendors: new Set() };
                map[key].totalQty += (item.qty || 0);
                map[key].totalSpend += ((item.qty || 0) * (item.unitPrice || 0));
                map[key].poCount += 1;
                const vendor = vendors.find(v => v.id == po.vendorId);
                map[key].vendors.add(vendor?.name?.name || vendor?.name || 'Unknown');
            });
        });
        return Object.values(map).map(s => ({ ...s, vendors: [...s.vendors].join(', ') })).sort((a, b) => b.totalSpend - a.totalSpend);
    }, [filteredPOs, vendors]);

    const reportTotals = useMemo(() => ({
        totalPOs: filteredPOs.length,
        totalSpend: filteredPOs.reduce((s, po) => s + (po.totalAmount || 0), 0),
        totalItems: filteredPOs.reduce((s, po) => s + po.items.reduce((s2, i) => s2 + (i.qty || 0), 0), 0)
    }), [filteredPOs]);

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
                logoImgTag = `<img src="${base64}" class="logo-img" alt="Logo" />`;
            } catch (e) {
                console.error("Logo processing error", e);
            }
        }

        // Terms String
        const paymentTerms = po.termType === 'Custom' ? `Net ${po.termDays}` : po.termType;

        const itemsRows = po.items.map(i => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${i.sku}</td>
                <td style="padding: 10px;">${i.description || ''}</td>
                <td style="padding: 10px; text-align: right;">${i.qty}</td>
                <td style="padding: 10px; text-align: right;">${formatMoney(i.unitPrice)}</td>
                <td style="padding: 10px; text-align: right;">${formatMoney(i.qty * i.unitPrice)}</td>
            </tr>
        `).join('');

        return `
        <html>
        <head>
            <title>Purchase Order ${po.poNumber}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #184833; padding-bottom: 20px; }
                .logo-container { margin-bottom: 15px; }
                .logo-img { max-height: 80px; max-width: 200px; }
                .company-name { font-size: 24px; font-weight: 900; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; color: #184833; }
                .company-details { font-size: 13px; color: #555; line-height: 1.4; }
                .po-meta { text-align: right; }
                .po-title { font-size: 32px; color: #184833; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; }
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
                <div class="po-meta">
                    <div class="po-title">Purchase Order</div>
                    <div class="meta-row"><span class="meta-label">PO #:</span> <span>${po.poNumber}</span></div>
                    <div class="meta-row"><span class="meta-label">DATE:</span> <span>${formatDate(po.orderDate)}</span></div>
                    <div class="meta-row"><span class="meta-label">TERMS:</span> <span>${paymentTerms}</span></div>
                </div>
            </div>

            <div class="address-section">
                <div class="address-box">
                    <h3>Vendor</h3>
                    <div class="address-name">${vendorName}</div>
                    <div class="address-info">
                        ${vendorAddress}${vendorAddress ? '<br>' : ''}
                        ${vendorEmail}
                    </div>
                </div>
                <div class="address-box">
                    <h3>Ship To</h3>
                    <div class="address-name">${myCompany?.name || ''}</div>
                    <div class="address-info">
                        ${shipAddr}${shipAddr ? '<br>' : ''}
                        ${shipAddr2 ? `${shipAddr2}<br>` : ''}
                        ${shipCity}${shipCity && shipState ? ', ' : ''}${shipState} ${shipZip}
                    </div>
                </div>
                <div class="address-box">
                    <h3>Bill To</h3>
                    <div class="address-name">${myCompany?.name || ''}</div>
                    <div class="address-info">
                        ${billAddr}${billAddr ? '<br>' : ''}
                        ${billAddr2 ? `${billAddr2}<br>` : ''}
                        ${billCity}${billCity && billState ? ', ' : ''}${billState} ${billZip}
                    </div>
                </div>
            </div>

            <table>
                <thead><tr><th>SKU</th><th>Description</th><th style="text-align: right;">Qty</th><th style="text-align: right;">Unit Price</th><th style="text-align: right;">Amount</th></tr></thead>
                <tbody>${itemsRows}</tbody>
            </table>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 40px;">
                ${po.notes ? `
                <div class="notes-box" style="flex: 1; margin-top: 0;">
                    <strong>Notes:</strong><br>${po.notes}
                </div>` : '<div style="flex: 1;"></div>'}
                <div class="totals-box">
                    <div class="total-row">
                        <span>Subtotal</span>
                        <span>${formatMoney(po.totalAmount)}</span>
                    </div>
                    <div class="total-row final">
                        <span>TOTAL</span>
                        <span>${formatMoney(po.totalAmount)}</span>
                    </div>
                </div>
            </div>

            <div class="footer">
                Thank you for your business! Please ship as soon as possible and provide tracking information once shipped.
            </div>
        </body>
        </html>
    `;
    };

    // --- Handlers ---

    const getNextPONumber = (vendorId) => {
        const vendor = vendors.find(v => v.id == vendorId);
        const prefix = vendor?.poPrefix || '';
        if (prefix) {
            // Count existing POs for this vendor with this prefix
            const existingCount = pos.filter(p => p.vendorId == vendorId && p.poNumber?.startsWith(prefix)).length;
            return `${prefix}${String(existingCount + 1).padStart(3, '0')}`;
        }
        // Fallback: generic PO number
        return `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`;
    };

    const handleCreateStart = () => {
        setNewPO({
            poNumber: '',
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
        const poNumber = getNextPONumber(vendorId);
        setNewPO(prev => ({ ...prev, vendorId, poNumber }));
    };

    const handleVendorProductSelect = (itemId, product) => {
        updateItem(itemId, 'sku', product.sku);
        updateItem(itemId, 'description', product.description);
        updateItem(itemId, 'unitPrice', product.price);
    };

    const savePO = async () => {
        if (!newPO.vendorId) {
            toast.error("Please select a vendor");
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

    const downloadPO = async (po) => {
        const vendor = vendors.find(v => v.id == po.vendorId);
        const html = await generatePOHtml(po, vendor);

        // Open in new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
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
                        {!showNewVendorInput ? (
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                value={newPO.vendorId}
                                onChange={(e) => {
                                    if (e.target.value === '__new__') {
                                        setShowNewVendorInput(true);
                                    } else {
                                        handleVendorSelect(e.target.value);
                                    }
                                }}
                            >
                                <option value="">Select Vendor...</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.name?.name || v.name}</option>
                                ))}
                                <option value="__new__">+ Create New Vendor</option>
                            </select>
                        ) : (
                            <div className="mt-1 flex gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    className="flex-1 rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border text-sm"
                                    placeholder="Vendor name..."
                                    value={newVendorName}
                                    onChange={(e) => setNewVendorName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setShowNewVendorInput(false);
                                            setNewVendorName('');
                                        }
                                        if (e.key === 'Enter' && newVendorName.trim()) {
                                            const id = Date.now();
                                            setVendors(prev => [...prev, { id, name: newVendorName.trim() }]);
                                            handleVendorSelect(id);
                                            toast.success(`Vendor "${newVendorName.trim()}" created`);
                                            setNewVendorName('');
                                            setShowNewVendorInput(false);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!newVendorName.trim()) return;
                                        const id = Date.now();
                                        setVendors(prev => [...prev, { id, name: newVendorName.trim() }]);
                                        handleVendorSelect(id);
                                        toast.success(`Vendor "${newVendorName.trim()}" created`);
                                        setNewVendorName('');
                                        setShowNewVendorInput(false);
                                    }}
                                    className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                                >
                                    Add
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowNewVendorInput(false); setNewVendorName(''); }}
                                    className="px-2 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
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

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea
                        rows={3}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border text-sm"
                        placeholder="Optional notes for this purchase order..."
                        value={newPO.notes || ''}
                        onChange={(e) => setNewPO({ ...newPO, notes: e.target.value })}
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={savePO} className="bg-indigo-600 text-white px-6 py-2 rounded shadow hover:bg-indigo-700">Save Purchase Order</button>
                </div>
            </div>
        );
    }

    // --- List View ---
    const renderOrdersList = () => (
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

    // --- Reports View ---
    const renderReports = () => (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Report Filters</h3>
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                        <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                        <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
                        <select value={reportVendorFilter} onChange={e => setReportVendorFilter(e.target.value)} className="p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="all">All Vendors</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name?.name || v.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
                    <p className="text-xs text-gray-500 uppercase font-medium">Total POs</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{reportTotals.totalPOs}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
                    <p className="text-xs text-gray-500 uppercase font-medium">Total Spend</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatMoney(reportTotals.totalSpend)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
                    <p className="text-xs text-gray-500 uppercase font-medium">Total Items Ordered</p>
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{reportTotals.totalItems.toLocaleString()}</p>
                </div>
            </div>

            {/* Vendor Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white">Purchases by Vendor</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">POs</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Spend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {vendorSummary.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                                    <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{row.poCount}</td>
                                    <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{row.items.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 dark:text-white">{formatMoney(row.totalSpend)}</td>
                                </tr>
                            ))}
                            {vendorSummary.length === 0 && (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No purchase orders in this date range.</td></tr>
                            )}
                        </tbody>
                        {vendorSummary.length > 1 && (
                            <tfoot className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <td className="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">Total</td>
                                    <td className="px-6 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">{reportTotals.totalPOs}</td>
                                    <td className="px-6 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">{reportTotals.totalItems.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(reportTotals.totalSpend)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* SKU Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white">Purchases by SKU</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor(s)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Qty</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Spend</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Unit Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {skuSummary.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{row.sku}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={row.vendors}>{row.vendors}</td>
                                    <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{row.poCount}</td>
                                    <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{row.totalQty.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 dark:text-white">{formatMoney(row.totalSpend)}</td>
                                    <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">{formatMoney(row.totalQty > 0 ? row.totalSpend / row.totalQty : 0)}</td>
                                </tr>
                            ))}
                            {skuSummary.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No items found in this date range.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // --- Main Return with Tab Bar ---
    return (
        <div className="space-y-6">
            {/* Tab Bar */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => { setActiveSubTab('orders'); setViewMode('list'); }} className={`pb-2 px-4 font-medium ${activeSubTab === 'orders' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Purchase Orders</button>
                <button onClick={() => setActiveSubTab('reports')} className={`pb-2 px-4 font-medium ${activeSubTab === 'reports' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Reports</button>
            </div>

            {activeSubTab === 'orders' && renderOrdersList()}
            {activeSubTab === 'reports' && renderReports()}
        </div>
    );
};


export default PurchaseOrderSystem;
