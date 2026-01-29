// src/views/CogsManagerView.jsx
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { ImageUploader } from '../components/ImageUploader';
import { toast } from 'sonner';

const CogsManagerView = ({ 
  cogs, 
  setCogs, 
  websitePrices, // NEW
  setWebsitePrices, // NEW
  settings, 
  setSettings, 
  skuImages, 
  handleImageUpload,
  onBack 
}) => {
  const [newSku, setNewSku] = useState('');

  const skuList = useMemo(() => {
    const allSkus = new Set([...settings.map(s => s.sku), ...Object.keys(cogs)]);
    return Array.from(allSkus).map(sku => ({
      sku,
      cost: cogs[sku] || 0,
      webPrice: websitePrices[sku] || 0 // NEW
    }));
  }, [settings, cogs, websitePrices]);

  const { processedData, sortConfig, handleSort, filters, handleFilter } = useTable(skuList, { key: 'sku', direction: 'asc' });

  const handleCostChange = (sku, val) => {
    const num = parseFloat(val);
    setCogs(prev => ({ ...prev, [sku]: isNaN(num) ? 0 : num }));
  };

  const handleWebPriceChange = (sku, val) => {
    const num = parseFloat(val);
    setWebsitePrices(prev => ({ ...prev, [sku]: isNaN(num) ? 0 : num }));
  };

  const handleAddSku = (e) => {
    e.preventDefault();
    const trimmed = newSku.trim();
    if (!trimmed) return;

    const exists = settings.some(s => s.sku === trimmed) || cogs[trimmed] !== undefined;
    if (exists) {
        toast.error('SKU already exists');
        return;
    }

    setSettings(prev => [...prev, { sku: trimmed, leadTime: 90, minDays: 60, targetMonths: 6 }]);
    setCogs(prev => ({ ...prev, [trimmed]: 0 }));
    setWebsitePrices(prev => ({ ...prev, [trimmed]: 0 })); // Init price

    setNewSku('');
    toast.success(`SKU "${trimmed}" added to system`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pricing & COGS Manager</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 items-end sm:items-center">
        <div className="grow">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Add New SKU to Program</label>
            <div className="flex gap-2">
                <input type="text" value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="e.g. NEW-PRODUCT-01" className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                <button onClick={handleAddSku} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium"><Plus className="w-4 h-4" /> Add SKU</button>
            </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 max-w-md">Adding a SKU here will make it available in the Reorder Planner, Outgoing Orders, and Pricing Records automatically.</div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <SortableHeaderCell label="Product Info" sortKey="sku" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.sku} />
              <SortableHeaderCell label="Cost to Ship / Buy (COGS)" sortKey="cost" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.cost} className="text-right" />
              <SortableHeaderCell label="Website Price" sortKey="webPrice" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.webPrice} className="text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {processedData.map((row) => (
              <tr key={row.sku} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex-shrink-0">
                            <ImageUploader imageKey={row.sku} currentImage={skuImages[row.sku]} onUpload={handleImageUpload} className="h-10 w-10 rounded border border-gray-200 dark:border-gray-600 object-cover" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{row.sku}</span>
                   </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="relative inline-block w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input type="number" step="0.01" value={row.cost} onChange={(e) => handleCostChange(row.sku, e.target.value)} className="w-full pl-6 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="relative inline-block w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input type="number" step="0.01" value={row.webPrice} onChange={(e) => handleWebPriceChange(row.sku, e.target.value)} className="w-full pl-6 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CogsManagerView;