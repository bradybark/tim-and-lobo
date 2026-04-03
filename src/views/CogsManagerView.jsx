// src/views/CogsManagerView.jsx
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, History, X, LineChart as LineChartIcon, List } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { ImageUploader } from '../components/ImageUploader';
import { toast } from 'sonner';

const CogsManagerView = ({
  cogs,
  setCogs,
  websitePrices,
  setWebsitePrices,
  skuDescriptions,
  setSkuDescriptions,
  settings,
  setSettings,
  skuImages,
  handleImageUpload,
  onBack,
  cogsHistory = [],
  setCogsHistory
}) => {
  const [newSku, setNewSku] = useState('');
  const [viewHistorySku, setViewHistorySku] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'report'

  // Report States
  const [reportSku, setReportSku] = useState('');
  const [reportDays, setReportDays] = useState(90); // default 90 days

  const formatMoney = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  const formatDate = (dateLike) => new Date(dateLike).toLocaleDateString();

  const skuList = useMemo(() => {
    const allSkus = new Set([...settings.map(s => s.sku), ...Object.keys(cogs)]);
    return Array.from(allSkus).map(sku => ({
      sku,
      description: skuDescriptions?.[sku] || '',
      cost: cogs[sku] || 0,
      webPrice: websitePrices[sku] || 0
    }));
  }, [settings, cogs, websitePrices, skuDescriptions]);

  // Set initial report SKU after skuList populates if empty
  React.useEffect(() => {
      if (!reportSku && skuList.length > 0) {
          setReportSku(skuList[0].sku);
      }
  }, [skuList, reportSku]);

  const reportData = useMemo(() => {
      if (!reportSku) return [];
      
      let filteredHistory = cogsHistory.filter(h => h.sku === reportSku);
      
      if (reportDays !== 'all') {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - parseInt(reportDays, 10));
          filteredHistory = filteredHistory.filter(h => new Date(h.date) >= cutoffDate);
      }

      // Sort chronological
      filteredHistory.sort((a,b) => new Date(a.date) - new Date(b.date));

      // Map to recharts format
      return filteredHistory.map(h => ({
          date: formatDate(h.date),
          avgCogs: Number(h.newAvgCogs.toFixed(2)),
          receivedCogs: Number(h.receivedCogs.toFixed(2))
      }));
  }, [cogsHistory, reportSku, reportDays]);

  const { processedData, sortConfig, handleSort, filters, handleFilter } = useTable(skuList, { key: 'sku', direction: 'asc' });

  const handleCostChange = (sku, val) => {
    const num = parseFloat(val);
    setCogs(prev => ({ ...prev, [sku]: isNaN(num) ? 0 : num }));
  };

  const handleWebPriceChange = (sku, val) => {
    const num = parseFloat(val);
    setWebsitePrices(prev => ({ ...prev, [sku]: isNaN(num) ? 0 : num }));
  };

  const handleDescriptionChange = (sku, val) => {
    setSkuDescriptions(prev => ({ ...prev, [sku]: val }));
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

      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
          <button 
              onClick={() => setActiveSubTab('list')} 
              className={`pb-2 px-4 font-medium flex items-center gap-2 ${activeSubTab === 'list' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              <List className="w-4 h-4" /> Pricing List
          </button>
          <button 
              onClick={() => setActiveSubTab('report')} 
              className={`pb-2 px-4 font-medium flex items-center gap-2 ${activeSubTab === 'report' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              <LineChartIcon className="w-4 h-4" /> COGS History Report
          </button>
      </div>

      {activeSubTab === 'list' && (
      <>
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
              <SortableHeaderCell label="SKU" sortKey="sku" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.sku} />
              <th className="w-full px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
              <SortableHeaderCell label="COGS" sortKey="cost" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.cost} className="text-right" />
              <SortableHeaderCell label="Website Price" sortKey="webPrice" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.webPrice} className="text-right" />
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">History</th>
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
                <td className="px-6 py-4 w-full min-w-[300px]">
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => handleDescriptionChange(row.sku, e.target.value)}
                    placeholder="Enter description..."
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="relative inline-block w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input 
                       type="number" step="0.01" value={row.cost} 
                       onChange={(e) => handleCostChange(row.sku, e.target.value)} 
                       onFocus={(e) => { e.target.dataset.orig = row.cost; }}
                       onBlur={(e) => {
                           const orig = parseFloat(e.target.dataset.orig) || 0;
                           const current = parseFloat(row.cost) || 0;
                           if (orig !== current) {
                               const newHistory = [...(cogsHistory || [])];
                               newHistory.push({
                                   id: Date.now() + Math.random(),
                                   sku: row.sku,
                                   date: new Date().toISOString(),
                                   poNumber: 'Manual Update',
                                   oldAvgCogs: orig,
                                   receivedCogs: current,
                                   newAvgCogs: current,
                                   receivedQty: 0,
                                   previousQty: 0
                               });
                               if (setCogsHistory) setCogsHistory(newHistory);
                           }
                       }}
                       className="w-full pl-6 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="relative inline-block w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input type="number" step="0.01" value={row.webPrice} onChange={(e) => handleWebPriceChange(row.sku, e.target.value)} className="w-full pl-6 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button onClick={() => setViewHistorySku(row.sku)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="View COGS History">
                    <History className="w-5 h-5 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {activeSubTab === 'report' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Average COGS Over Time</h3>
            
            <div className="flex flex-wrap gap-4 mb-8">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Select SKU</label>
                    <select 
                        value={reportSku} 
                        onChange={(e) => setReportSku(e.target.value)}
                        className="p-2 w-48 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        {skuList.map(s => <option key={s.sku} value={s.sku}>{s.sku}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Timeframe</label>
                    <select 
                        value={reportDays} 
                        onChange={(e) => setReportDays(e.target.value)}
                        className="p-2 w-48 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="180">Last 6 Months</option>
                        <option value="365">Last 1 Year</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {reportData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    <History className="w-8 h-8 mb-2 opacity-50" />
                    <p>No receiving history found for this SKU in the selected timeframe.</p>
                </div>
            ) : (
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.5} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#9ca3af" 
                                fontSize={12} 
                                tickMargin={10} 
                            />
                            <YAxis 
                                stroke="#9ca3af" 
                                fontSize={12} 
                                tickFormatter={formatMoney} 
                                // Domain ensures the chart doesn't start from 0 if costs are high, making fluctuations clearer!
                                domain={['auto', 'auto']}
                            />
                            <Tooltip 
                                formatter={(value) => formatMoney(value)}
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '8px' }}
                                itemStyle={{ fontWeight: 600 }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Line 
                                type="stepAfter" 
                                dataKey="avgCogs" 
                                name="Rolling Average COGS" 
                                stroke="#8b5cf6" 
                                strokeWidth={3} 
                                dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} 
                                activeDot={{ r: 6 }} 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="receivedCogs" 
                                name="Shipment Incoming COGS" 
                                stroke="#10b981" 
                                strokeWidth={2} 
                                strokeDasharray="5 5" 
                                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
      )}

      {viewHistorySku && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold dark:text-white">COGS History</h2>
                <p className="text-sm text-gray-500">SKU: {viewHistorySku}</p>
              </div>
              <button onClick={() => setViewHistorySku(null)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">PO Number</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Incoming Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Received COGS</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Current Stock</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Old Avg</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">New Avg COGS</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {cogsHistory.filter(h => h.sku === viewHistorySku).length === 0 ? (
                          <tr><td colSpan={7} className="p-8 text-center text-gray-500">No receiving history found for this SKU.</td></tr>
                      ) : cogsHistory.filter(h => h.sku === viewHistorySku).sort((a,b) => new Date(b.date) - new Date(a.date)).map((hist) => (
                          <tr key={hist.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-700">
                              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(hist.date)}</td>
                              <td className="px-4 py-4 text-sm font-medium text-indigo-600">{hist.poNumber}</td>
                              <td className="px-4 py-4 text-sm text-right text-emerald-600 font-bold">+{hist.receivedQty}</td>
                              <td className="px-4 py-4 text-sm text-right font-medium dark:text-gray-300">{formatMoney(hist.receivedCogs)}</td>
                              <td className="px-4 py-4 text-sm text-right text-gray-500">{hist.previousQty}</td>
                              <td className="px-4 py-4 text-sm text-right text-gray-500 line-through">{formatMoney(hist.oldAvgCogs)}</td>
                              <td className="px-4 py-4 text-sm text-right font-bold text-blue-600 dark:text-blue-400">{formatMoney(hist.newAvgCogs)}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CogsManagerView;