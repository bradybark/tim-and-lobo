// src/views/WebsiteOrdersView.jsx
import React, { useState } from 'react';
import { Plus, Eye, Trash2, StickyNote } from 'lucide-react';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { toast } from 'sonner';

const WebsiteOrderModal = ({ order, allSkus, cogs, websitePrices, onClose, onSave }) => {
  const [formData, setFormData] = useState(() => ({
    id: order?.id || Date.now(),
    date: order?.date || new Date().toISOString().split('T')[0],
    customerName: order?.customerName || '',
    items: order?.items && order.items.length > 0 ? order.items : [{ sku: allSkus[0] || 'Unknown', count: 1, price: websitePrices[allSkus[0]] || 0, unitCost: cogs[allSkus[0]] || 0 }],
    shippingCharge: order?.shippingCharge || 0,
    costToShip: order?.costToShip || 0,
    processingFee: order?.processingFee || 0,
    notes: order?.notes || ''
  }));

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { sku: allSkus[0] || 'Unknown', count: 1, price: websitePrices[allSkus[0]] || 0, unitCost: cogs[allSkus[0]] || 0 }]
    }));
  };

  const removeItem = (idx) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleItemChange = (idx, field, val) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], [field]: val };

    if (field === 'sku') {
      newItems[idx].unitCost = cogs[val] || 0;
      newItems[idx].price = websitePrices[val] || 0;
    }
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const itemRevenue = formData.items.reduce((sum, i) => sum + (i.count * i.price), 0);
  const totalRevenue = itemRevenue + Number(formData.shippingCharge);
  const itemCost = formData.items.reduce((sum, i) => sum + (i.count * i.unitCost), 0);
  const totalCost = itemCost + Number(formData.costToShip) + Number(formData.processingFee);
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerName) return toast.error("Customer Name required");
    if (formData.items.length === 0) return toast.error("Add at least one item");
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{order ? 'Edit Website Order' : 'New Website Order'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Date</label><input type="date" required value={formData.date} onChange={e => handleChange('date', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Customer Name</label><input type="text" required value={formData.customerName} onChange={e => handleChange('customerName', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. John Doe" /></div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2"><h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Order Items</h3><button type="button" onClick={addItem} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">+ Add SKU</button></div>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-500"><tr><th className="p-2 text-left">SKU</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Cost</th><th className="p-2 w-8"></th></tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {formData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2"><select value={item.sku} onChange={e => handleItemChange(idx, 'sku', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 outline-none dark:bg-gray-700 dark:text-white rounded">{allSkus.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                    <td className="p-2 text-right"><input type="number" min="1" value={item.count} onChange={e => handleItemChange(idx, 'count', Number(e.target.value))} className="w-16 text-right bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 dark:text-white" /></td>
                    <td className="p-2 text-right"><input type="number" step="0.01" value={item.price} onChange={e => handleItemChange(idx, 'price', Number(e.target.value))} className="w-20 text-right bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 dark:text-white" /></td>
                    <td className="p-2 text-right"><input type="number" step="0.01" value={item.unitCost} onChange={e => handleItemChange(idx, 'unitCost', Number(e.target.value))} className="w-20 text-right bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 text-gray-600 dark:text-gray-300" /></td>
                    <td className="p-2"><button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Shipping Charge (Income)</label><input type="number" step="0.01" value={formData.shippingCharge} onChange={e => handleChange('shippingCharge', Number(e.target.value))} className="w-full p-2 border rounded text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Cost to Ship (Expense)</label><input type="number" step="0.01" value={formData.costToShip} onChange={e => handleChange('costToShip', Number(e.target.value))} className="w-full p-2 border rounded text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Processing Fee</label><input type="number" step="0.01" value={formData.processingFee} onChange={e => handleChange('processingFee', Number(e.target.value))} className="w-full p-2 border rounded text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1 text-sm">
              <div className="flex justify-between dark:text-white"><span>Total Revenue:</span><span className="font-bold">${totalRevenue.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Total Costs:</span><span>${totalCost.toFixed(2)}</span></div>
              <div className="flex justify-between font-medium text-green-600 dark:text-green-400"><span>Net Profit:</span><span>${profit.toFixed(2)}</span></div>
              <div className="flex justify-between font-medium text-indigo-600 dark:text-indigo-400"><span>Net Margin:</span><span>{margin.toFixed(2)}%</span></div>
            </div>
          </div>

          <div><label className="block text-xs font-medium text-gray-500 mb-1">Internal Notes</label><textarea value={formData.notes} onChange={e => handleChange('notes', e.target.value)} className="w-full p-2 border rounded text-sm h-20 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Add details about this order..." /></div>
          <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-500">Cancel</button><button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button></div>
        </form>
      </div>
    </div>
  );
};

const WebsiteOrdersView = ({ websiteOrders, setWebsiteOrders, cogs, websitePrices, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  const allSkus = settings.map(s => s.sku);

  const tableData = React.useMemo(() => websiteOrders.map(o => {
    const items = o.items || (o.sku ? [{ count: o.count, price: o.price, unitCost: o.unitCost }] : []);
    const sales = items.reduce((sum, i) => sum + (i.count * i.price), 0);
    const cogsTotal = items.reduce((sum, i) => sum + (i.count * i.unitCost), 0);

    const shipCharge = Number(o.shippingCharge || 0);
    const shipCost = Number(o.costToShip || o.shippingCost || 0);

    const totalRev = sales + shipCharge;
    const totalCost = cogsTotal + shipCost + Number(o.processingFee || 0);

    const profit = totalRev - totalCost;
    const margin = totalRev > 0 ? (profit / totalRev) * 100 : 0;

    return {
      ...o,
      itemCount: items.length,
      totalRevenue: totalRev,
      profit,
      margin,
      shippingCost: shipCost
    };
  }), [websiteOrders]);

  const { processedData, sortConfig, handleSort, filters, handleFilter } = useTable(tableData, { key: 'date', direction: 'desc' });

  const handleSaveOrder = (newOrder) => {
    setWebsiteOrders(prev => {
      const exists = prev.find(o => o.id === newOrder.id);
      if (exists) return prev.map(o => o.id === newOrder.id ? newOrder : o);
      return [...prev, newOrder];
    });
    setIsModalOpen(false);
    toast.success('Website Order Saved');
  };

  const handleDelete = (id) => { if (confirm("Delete this order?")) setWebsiteOrders(prev => prev.filter(o => o.id !== id)); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-gray-900 dark:text-white">Website Orders</h2><button onClick={() => { setEditingOrder(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2"><Plus className="w-4 h-4" /> New Website Order</button></div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto custom-scroll pb-4">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <SortableHeaderCell label="Date" sortKey="date" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.date} />
                <SortableHeaderCell label="Customer Name" sortKey="customerName" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.customerName} />
                <SortableHeaderCell label="Items" sortKey="itemCount" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.itemCount} className="text-center" />
                <SortableHeaderCell label="Total Revenue" sortKey="totalRevenue" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.totalRevenue} className="text-right" />
                <SortableHeaderCell label="Profit" sortKey="profit" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.profit} className="text-right" />
                <SortableHeaderCell label="Margin" sortKey="margin" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.margin} className="text-right" />
                <SortableHeaderCell label="Ship Cost" sortKey="shippingCost" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.shippingCost} className="text-right" />
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {processedData.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">{row.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{row.customerName}</td>
                  <td className="px-6 py-4 text-sm text-center text-gray-900 dark:text-white">{row.itemCount}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-medium">${row.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-sm text-right text-green-600">${row.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-sm text-right text-indigo-600">{row.margin.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-gray-400">${row.shippingCost.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">{row.notes && <div className="group relative inline-block"><StickyNote className="w-4 h-4 text-gray-400" /><div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded z-50">{row.notes}</div></div>}</td>
                  <td className="px-6 py-4 text-right space-x-2"><button onClick={() => { setEditingOrder(row); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-800"><Eye className="w-4 h-4" /></button><button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && <WebsiteOrderModal order={editingOrder} allSkus={allSkus} cogs={cogs} websitePrices={websitePrices} onClose={() => setIsModalOpen(false)} onSave={handleSaveOrder} />}
    </div>
  );
};

export default WebsiteOrdersView;