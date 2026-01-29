// src/views/PricingRecordView.jsx
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const PricingRecordView = ({ customer, cogs, settings, onSave, onBack }) => {
  const [records, setRecords] = useState(customer.pricingRecords || []);
  const allSkus = useMemo(() => settings.map(s => s.sku), [settings]);

  const handleAdd = () => {
    setRecords(prev => [...prev, { sku: allSkus[0] || '', price: 0, moq: 1 }]);
  };

  const handleChange = (index, field, val) => {
    const newRecords = [...records];
    newRecords[index] = { ...newRecords[index], [field]: val };
    setRecords(newRecords);
  };

  const handleDelete = (index) => {
    setRecords(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(records);
    toast.success('Pricing saved');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Pricing Record: {customer.company}
            </h2>
        </div>
        <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2">
          <Save className="w-4 h-4" /> Save Record
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">COGS (Base)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Customer Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Profit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin %</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">MOQ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {records.map((rec, idx) => {
              const baseCost = cogs[rec.sku] || 0;
              const price = parseFloat(rec.price) || 0;
              const profit = price - baseCost;
              const margin = price > 0 ? (profit / price) * 100 : 0;

              return (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <select 
                        value={rec.sku} 
                        onChange={(e) => handleChange(idx, 'sku', e.target.value)}
                        // FIX: Added dark:bg-gray-700 and dark:text-white to ensure visibility in dropdown
                        className="bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1.5 text-sm text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        {allSkus.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                    ${baseCost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={rec.price} 
                        onChange={(e) => handleChange(idx, 'price', e.target.value)}
                        className="w-24 text-right p-1.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </td>
                  <td className={`px-6 py-4 text-right text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${profit.toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 text-right text-sm font-medium ${margin >= 20 ? 'text-green-600' : 'text-amber-500'}`}>
                    {margin.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input 
                        type="number" 
                        value={rec.moq} 
                        onChange={(e) => handleChange(idx, 'moq', e.target.value)}
                        className="w-16 text-right p-1.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button onClick={handleAdd} className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:underline">
                <Plus className="w-4 h-4" /> Add Item Row
            </button>
        </div>
      </div>
    </div>
  );
};

export default PricingRecordView;