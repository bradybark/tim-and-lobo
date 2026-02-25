// src/views/InternalOrdersView.jsx
import React, { useState } from 'react';
import { Plus, Eye, Trash2, CheckSquare, Square, FileText, Printer, Download } from 'lucide-react';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { toast } from 'sonner';
import { useInventory } from '../context/InventoryContext'; // To access myCompany

const blobToDataURL = (blob) => {
    return new Promise((resolve) => {
        if (!blob) { resolve(null); return; }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
};

const InternalOrderModal = ({ order, customers, allSkus, cogs, onClose, onSave }) => {
    // ... (Modal logic unchanged, keeping brevity here but providing full file below)
    const [formData, setFormData] = useState(() => ({
        id: order?.id || Date.now(),
        date: order?.date || new Date().toISOString().split('T')[0],
        customerId: order?.customerId || '',
        sku: order?.sku || allSkus[0],
        count: order?.count || 0,
        price: order?.price || 0,
        unitCost: order?.unitCost || 0,
        fbaShipmentId: order?.fbaShipmentId || '',
        isPaid: order?.isPaid || false
    }));
    const revenue = formData.count * formData.price;
    const totalCost = formData.count * formData.unitCost;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const selectedCustomer = customers.find(c => c.id === Number(formData.customerId));
    const isAmazon = selectedCustomer?.isAmazon;
    const handleChange = (field, val) => {
        setFormData(prev => {
            const next = { ...prev, [field]: val };
            if (field === 'sku') {
                next.unitCost = cogs[val] || 0;
                if (selectedCustomer && selectedCustomer.pricingRecords) {
                    const rec = selectedCustomer.pricingRecords.find(r => r.sku === val);
                    if (rec) next.price = rec.price;
                }
            }
            if (field === 'customerId') {
                const newCust = customers.find(c => c.id === Number(val));
                if (newCust && newCust.pricingRecords) {
                    const rec = newCust.pricingRecords.find(r => r.sku === next.sku);
                    if (rec) next.price = rec.price;
                }
            }
            return next;
        });
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.customerId) return toast.error("Select a partner company");
        onSave(formData);
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{order ? 'Edit Internal Order' : 'New Internal Order'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-gray-500 mb-1">Date</label><input type="date" required value={formData.date} onChange={e => handleChange('date', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-500 mb-1">Partner Company</label><select required value={formData.customerId} onChange={e => handleChange('customerId', Number(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"><option value="">-- Select --</option>{customers.filter(c => c.isPartner).map(c => <option key={c.id} value={c.id}>{c.company}</option>)}</select></div>
                    </div>
                    {isAmazon && (<div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded border border-amber-200 dark:border-amber-800"><label className="block text-xs font-bold text-amber-800 dark:text-amber-400 mb-1">FBA Shipment ID</label><input type="text" value={formData.fbaShipmentId} onChange={e => handleChange('fbaShipmentId', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. FBA1234567" /></div>)}
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-gray-500 mb-1">SKU</label><select value={formData.sku} onChange={e => handleChange('sku', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">{allSkus.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div><label className="block text-xs font-medium text-gray-500 mb-1">Count</label><input type="number" min="1" value={formData.count} onChange={e => handleChange('count', Number(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded">
                        <div><label className="block text-xs font-medium text-gray-500 mb-1">Unit Price ($)</label><input type="number" step="0.01" value={formData.price} onChange={e => handleChange('price', Number(e.target.value))} className="w-full p-1 border rounded text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-500 mb-1">Unit Cost (COGS)</label><input type="number" step="0.01" value={formData.unitCost} onChange={e => handleChange('unitCost', Number(e.target.value))} className="w-full p-1 border rounded text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                    </div>
                    <div className="flex justify-between text-sm pt-2 px-2"><div className="text-gray-600 dark:text-gray-300">Revenue: <span className="font-bold">${revenue.toLocaleString()}</span></div><div className="text-green-600">Profit: <span className="font-bold">${profit.toLocaleString()}</span> ({margin.toFixed(1)}%)</div></div>
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-500">Cancel</button><button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Save</button></div>
                </form>
            </div>
        </div>
    );
};

const InternalOrdersView = ({ internalOrders, setInternalOrders, invoices, setInvoices, customers, cogs, settings }) => {
    const { myCompany, companyLogo, skuDescriptions } = useInventory();
    const [activeTab, setActiveTab] = useState('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [reportCustomer, setReportCustomer] = useState('');
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

    const allSkus = (settings || []).map(s => s.sku);

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleMassPaid = () => {
        if (selectedIds.size === 0) return;
        setInternalOrders(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, isPaid: true } : o));
        setSelectedIds(new Set());
        toast.success(`${selectedIds.size} orders marked as PAID`);
    };

    const tableData = React.useMemo(() => internalOrders.map(o => {
        const cust = customers.find(c => c.id === Number(o.customerId));
        const rev = o.count * o.price;
        const profit = rev - (o.count * o.unitCost);
        const isAmazon = cust?.isAmazon;
        return {
            ...o,
            customerName: cust?.company || 'Unknown',
            revenue: rev,
            profit,
            displaySku: isAmazon && o.fbaShipmentId ? `${o.sku} (FBA: ${o.fbaShipmentId})` : o.sku
        };
    }), [internalOrders, customers]);

    const { processedData, sortConfig, handleSort, filters, handleFilter } = useTable(tableData, { key: 'date', direction: 'desc' });

    const outstandingOrders = React.useMemo(() => {
        if (!reportCustomer) return [];
        return internalOrders.filter(o => {
            return Number(o.customerId) === Number(reportCustomer) && !o.isPaid && !o.invoiceId && o.date <= reportEndDate;
        });
    }, [internalOrders, reportCustomer, reportEndDate]);

    const outstandingSummary = React.useMemo(() => {
        const summary = { totalOwed: 0, totalProfit: 0, items: {} };
        outstandingOrders.forEach(o => {
            const rev = o.count * o.price;
            const prof = rev - (o.count * o.unitCost);
            summary.totalOwed += rev;
            summary.totalProfit += prof;
            if (!summary.items[o.sku]) summary.items[o.sku] = { count: 0, revenue: 0, profit: 0, price: o.price };
            summary.items[o.sku].count += o.count;
            summary.items[o.sku].revenue += rev;
            summary.items[o.sku].profit += prof;
        });
        return summary;
    }, [outstandingOrders]);

    // --- HTML GENERATOR ---
    const generateInvoiceHTML = async (invoiceId, customerId, lineItems, totalDue, date) => {
        const customer = customers.find(c => c.id === Number(customerId));
        const logoDataUrl = await blobToDataURL(companyLogo);

        const rowsHtml = lineItems.map(item => {
            const desc = skuDescriptions?.[item.sku] || '';
            return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${item.sku}</td>
                <td style="padding: 10px;">${desc}</td>
                <td style="padding: 10px; text-align: right;">${item.count}</td>
                <td style="padding: 10px; text-align: right;">$${Number(item.price).toFixed(2)}</td>
                <td style="padding: 10px; text-align: right;">$${item.revenue.toFixed(2)}</td>
            </tr>
            `;
        }).join('');

        return `
        <html>
        <head>
            <title>Invoice ${invoiceId}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .logo-container { margin-bottom: 15px; }
                .logo-img { max-height: 80px; max-width: 200px; }
                .company-name { font-size: 24px; font-weight: 900; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; }
                .company-details { font-size: 13px; color: #555; line-height: 1.4; }
                .invoice-meta { text-align: right; }
                .invoice-title { font-size: 32px; color: #333; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; }
                .meta-row { display: flex; justify-content: flex-end; gap: 15px; font-size: 14px; margin-bottom: 5px; }
                .meta-label { font-weight: bold; color: #666; }
                
                .bill-to { margin-bottom: 40px; background: #f9f9f9; padding: 20px; border-radius: 5px; }
                .bill-to h3 { font-size: 12px; text-transform: uppercase; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 0 0 10px 0; }
                .customer-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                .customer-info { font-size: 14px; line-height: 1.5; color: #444; }

                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { text-align: left; background: #333; color: white; padding: 12px 10px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
                
                .totals { display: flex; justify-content: flex-end; }
                .totals-box { width: 300px; }
                .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; }
                .total-row.final { border-top: 2px solid #333; border-bottom: none; font-weight: 900; font-size: 20px; margin-top: 10px; padding-top: 15px; }
                
                .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 13px; color: #888; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="logo-container">
                        ${logoDataUrl ? `<img src="${logoDataUrl}" class="logo-img"/>` : ''}
                    </div>
                    <div class="company-name">${myCompany?.name || 'Your Company Name'}</div>
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
                    <div class="meta-row"><span class="meta-label">INVOICE #:</span> <span>${invoiceId}</span></div>
                    <div class="meta-row"><span class="meta-label">DATE:</span> <span>${date}</span></div>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 40px; margin-bottom: 30px;">
                <div class="bill-to" style="flex: 1;">
                    <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-size: 12px; color: #555; text-transform: uppercase;">Bill To:</h3>
                    ${customer ? customer.company : 'N/A'}<br>
                    ${customer ? (customer.billAddress1 || customer.billAddress || '') : ''}<br>
                    ${customer && (customer.billCity || customer.billState || customer.billZip) ? `${customer.billCity || ''}, ${customer.billState || ''} ${customer.billZip || ''}<br>` : ''}
                    ${customer ? customer.emailAcct || '' : ''}
                </div>
                <div class="ship-to" style="flex: 1;">
                    <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-size: 12px; color: #555; text-transform: uppercase;">Ship To:</h3>
                    ${customer ? (customer.shipAddress1 || customer.shipAddress || customer.address || '') : ''}<br>
                    ${customer && (customer.shipCity || customer.shipState || customer.shipZip) ? `${customer.shipCity || ''}, ${customer.shipState || ''} ${customer.shipZip || ''}` : ''}
                </div>
            </div>

            <table>
                <thead><tr><th>SKU</th><th>Description</th><th style="text-align: right;">Qty</th><th style="text-align: right;">Unit Price</th><th style="text-align: right;">Amount</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div class="totals">
                <div class="totals-box">
                    <div class="total-row final">
                        <span>Total Due</span>
                        <span>$${totalDue.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div class="footer">
                Thank you for your business! Please remit payment within 30 days.
            </div>
        </body>
        </html>
    `;
    };

    const createInvoice = async () => {
        if (outstandingOrders.length === 0) return toast.error("No open orders to invoice");

        const customer = customers.find(c => c.id === Number(reportCustomer));
        const prefix = customer?.invoicePrefix || 'INV-';
        const invoiceId = `${prefix}${Date.now().toString().slice(-6)}`;
        const date = new Date().toISOString().split('T')[0];
        const items = Object.entries(outstandingSummary.items).map(([sku, data]) => ({ sku, ...data }));

        const newInvoice = {
            id: invoiceId,
            date,
            customerId: reportCustomer,
            total: outstandingSummary.totalOwed,
            items,
            orderIds: outstandingOrders.map(o => o.id),
            isPaid: false
        };

        setInvoices(prev => [...prev, newInvoice]);
        setInternalOrders(prev => prev.map(o => outstandingOrders.find(oo => oo.id === o.id) ? { ...o, invoiceId } : o));

        const html = await generateInvoiceHTML(invoiceId, reportCustomer, items, outstandingSummary.totalOwed, date);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);

        toast.success("Invoice Created");
    };

    const viewInvoice = async (inv) => {
        const html = await generateInvoiceHTML(inv.id, inv.customerId, inv.items, inv.total, inv.date);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const deleteInvoice = (invId) => {
        if (confirm("Delete invoice? This will re-open the linked orders.")) {
            setInvoices(prev => prev.filter(i => i.id !== invId));
            setInternalOrders(prev => prev.map(o => o.invoiceId === invId ? { ...o, invoiceId: null, isPaid: false } : o));
            toast.success("Invoice deleted");
        }
    };

    const markInvoicePaid = (inv) => {
        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, isPaid: true } : i));
        setInternalOrders(prev => prev.map(o => inv.orderIds.includes(o.id) ? { ...o, isPaid: true } : o));
        toast.success("Invoice Marked Paid");
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => setActiveTab('list')} className={`pb-2 px-4 font-medium ${activeTab === 'list' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500'}`}>Order List</button>
                <button onClick={() => setActiveTab('report')} className={`pb-2 px-4 font-medium ${activeTab === 'report' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500'}`}>Outstanding Reports</button>
            </div>

            {activeTab === 'list' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-900/30">
                        <div className="flex gap-2">
                            {selectedIds.size > 0 && (
                                <button onClick={handleMassPaid} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4" /> Mark {selectedIds.size} Paid
                                </button>
                            )}
                        </div>
                        <button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> New Internal Order
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 w-10"><input type="checkbox" onChange={(e) => {
                                        if (e.target.checked) setSelectedIds(new Set(processedData.map(d => d.id)));
                                        else setSelectedIds(new Set());
                                    }} /></th>
                                    <SortableHeaderCell label="Date" sortKey="date" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.date} />
                                    <SortableHeaderCell label="Partner" sortKey="customerName" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.customerName} />
                                    <SortableHeaderCell label="Item" sortKey="displaySku" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.displaySku} />
                                    <SortableHeaderCell label="Qty" sortKey="count" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.count} className="text-right" />
                                    <SortableHeaderCell label="Revenue" sortKey="revenue" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.revenue} className="text-right" />
                                    <SortableHeaderCell label="Profit" sortKey="profit" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.profit} className="text-right" />
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {processedData.map(row => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelection(row.id)} /></td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{row.date}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{row.customerName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{row.displaySku}</td>
                                        <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">{row.count}</td>
                                        <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-medium">${row.revenue.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-right text-green-600">${row.profit.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            {row.isPaid ? <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">PAID</span> :
                                                row.invoiceId ? <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">INV</span> :
                                                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">OPEN</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => { setEditingOrder(row); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-800 mr-2"><Eye className="w-4 h-4" /></button>
                                            <button onClick={() => { if (confirm('Delete?')) setInternalOrders(prev => prev.filter(o => o.id !== row.id)) }} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'report' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow border border-gray-200 dark:border-gray-700 flex gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Partner</label>
                            <select value={reportCustomer} onChange={e => setReportCustomer(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="">Select Partner...</option>
                                {customers.filter(c => c.isPartner).map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                            <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                    </div>

                    {reportCustomer && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Pending Orders Summary */}
                            <div className="bg-white dark:bg-gray-800 rounded shadow p-6">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Outstanding (Un-invoiced) Orders</h3>
                                {outstandingOrders.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded border border-purple-100 dark:border-purple-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-gray-600 dark:text-gray-300">Total Owed</span>
                                                <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">${outstandingSummary.totalOwed.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Total Profit</span>
                                                <span className="text-green-600 dark:text-green-400 font-medium">${outstandingSummary.totalProfit.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <table className="w-full text-sm">
                                            <thead><tr className="text-left text-gray-500 border-b"><th>SKU</th><th className="text-right">Qty</th><th className="text-right">Total</th></tr></thead>
                                            <tbody>
                                                {Object.entries(outstandingSummary.items).map(([sku, d]) => (
                                                    <tr key={sku} className="border-b last:border-0 border-gray-100 dark:border-gray-700">
                                                        <td className="py-2 dark:text-white">{sku}</td>
                                                        <td className="text-right dark:text-gray-300">{d.count}</td>
                                                        <td className="text-right font-medium dark:text-white">${d.revenue.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <button onClick={createInvoice} className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex justify-center gap-2">
                                            <FileText className="w-4 h-4" /> Create Invoice
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">No outstanding orders up to this date.</div>
                                )}
                            </div>

                            {/* Invoice History */}
                            <div className="bg-white dark:bg-gray-800 rounded shadow p-6">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Invoices (History)</h3>
                                <div className="space-y-3">
                                    {invoices.filter(i => i.customerId === reportCustomer).map(inv => (
                                        <div key={inv.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white">{inv.id}</div>
                                                <div className="text-xs text-gray-500">{inv.date} • {inv.orderIds.length} Orders</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-indigo-600 dark:text-indigo-400">${inv.total.toLocaleString()}</div>
                                                {inv.isPaid ? (
                                                    <div className="flex items-center gap-2 justify-end mt-1">
                                                        <span className="text-xs text-green-600 font-bold">PAID</span>
                                                        <button onClick={() => viewInvoice(inv)} className="text-gray-400 hover:text-gray-600" title="View Invoice">
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => deleteInvoice(inv.id)} className="text-red-500 hover:text-red-700" title="Delete Invoice"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 mt-1 justify-end">
                                                        <button onClick={() => viewInvoice(inv)} className="text-gray-400 hover:text-gray-600" title="View Invoice">
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => markInvoicePaid(inv)} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200">Mark Paid</button>
                                                        <button onClick={() => deleteInvoice(inv.id)} className="text-red-500 hover:text-red-700" title="Delete Invoice"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {invoices.filter(i => i.customerId === reportCustomer).length === 0 && <div className="text-gray-500 text-sm text-center">No invoices generated yet.</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && <InternalOrderModal order={editingOrder} customers={customers} allSkus={allSkus} cogs={cogs} onClose={() => setIsModalOpen(false)} onSave={(data) => {
                if (editingOrder) setInternalOrders(prev => prev.map(o => o.id === data.id ? data : o));
                else setInternalOrders(prev => [...prev, data]);
                setIsModalOpen(false);
                toast.success("Order Saved");
            }} />}
        </div>
    );
};

export default InternalOrdersView;