// src/views/OutgoingReportsView.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BarChart3, Calendar, ChevronDown, ChevronUp, RefreshCw, Filter,
  TrendingUp, ArrowRight, ArrowUpRight, ArrowDownRight, CheckSquare, Square, Trash2, Globe, Truck, Building
} from 'lucide-react';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { useTable } from '../hooks/useTable';
import { toast } from 'sonner';

const getPercentChange = (curr, prev) => {
  if (!prev || prev === 0) return { val: 0, color: 'text-gray-400', icon: null };
  const pct = ((curr - prev) / prev) * 100;
  if (pct > 0) return { val: pct, color: 'text-green-600', icon: <ArrowUpRight className="w-3 h-3" /> };
  if (pct < 0) return { val: pct, color: 'text-red-600', icon: <ArrowDownRight className="w-3 h-3" /> };
  return { val: 0, color: 'text-gray-400', icon: <ArrowRight className="w-3 h-3" /> };
};

const ComparisonCard = ({ title, current, previous, format }) => {
  const change = getPercentChange(current, previous);
  const displayCurr = format === 'currency' ? `$${current.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `${current.toFixed(2)}%`;
  const displayPrev = format === 'currency' ? `$${previous.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `${previous.toFixed(2)}%`;
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="text-xs text-gray-500 uppercase font-medium">{title}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{displayCurr}</div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-gray-400">Prev: {displayPrev}</span>
        <span className={`flex items-center gap-1 font-bold ${change.color}`}>{change.icon} {Math.abs(change.val).toFixed(1)}%</span>
      </div>
    </div>
  );
};

const TIME_RANGES = [
  { label: 'Last 3 Months', value: '3m' },
  { label: 'Last 6 Months', value: '6m' },
  { label: 'Last 1 Year', value: '1y' },
  { label: 'Last 2 Years', value: '2y' },
  { label: 'Custom Range', value: 'custom' },
];

const METRICS = [
  { label: 'Revenue', key: 'revenue', format: 'currency' },
  { label: 'Net Profit', key: 'netProfit', format: 'currency' },
  { label: 'Net Margin', key: 'netMargin', format: 'percent' },
];

const MultiSelectDropdown = ({ options, selectedValues, onChange, label, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (val) => {
    const newSet = new Set(selectedValues);
    if (newSet.has(val)) newSet.delete(val);
    else newSet.add(val);
    onChange(newSet);
  };

  const selectAll = () => {
    if (selectedValues.size === options.length) onChange(new Set());
    else onChange(new Set(options.map(o => o.value)));
  };

  return (
    <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={dropdownRef}>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm cursor-pointer flex justify-between items-center bg-white"
      >
        <span className="truncate">
          {disabled ? 'N/A' :
            selectedValues.size === 0 ? '-- Select --' :
              selectedValues.size === options.length ? 'All Selected' :
                `${selectedValues.size} Selected`}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div
            onClick={selectAll}
            className="px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
          >
            {selectedValues.size === options.length ? 'Deselect All' : 'Select All'}
          </div>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => toggleOption(opt.value)}
              className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2"
            >
              {selectedValues.has(opt.value) ?
                <CheckSquare className="w-4 h-4 text-indigo-600" /> :
                <Square className="w-4 h-4 text-gray-400" />
              }
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SimpleLineChart = ({ data, dataKey, color = '#4f46e5', label }) => {
  if (!data || data.length < 2) return <div className="h-64 flex items-center justify-center text-gray-400 border rounded">Not enough data to graph</div>;
  const height = 300; const width = 800; const padding = 40;
  const values = data.map(d => d[dataKey]);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 10);
  const range = maxVal - minVal || 1;
  const getX = (index) => padding + (index / (data.length - 1)) * (width - (padding * 2));
  const getY = (val) => height - padding - ((val - minVal) / range) * (height - (padding * 2));
  let pathD = `M ${getX(0)} ${getY(data[0][dataKey])}`;
  data.slice(1).forEach((d, i) => { pathD += ` L ${getX(i + 1)} ${getY(d[dataKey])}`; });

  return (
    <div className="w-full overflow-x-auto bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-4">{label} Over Time</h4>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[600px]">
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = height - padding - (t * (height - padding * 2));
          return (<g key={t}><line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeDasharray="4" /><text x={padding - 5} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400">{dataKey === 'netMargin' ? `${(minVal + t * range).toFixed(1)}%` : `$${Math.round(minVal + t * range).toLocaleString()}`}</text></g>);
        })}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (<circle key={i} cx={getX(i)} cy={getY(d[dataKey])} r="3" fill={color} className="hover:r-5 transition-all"><title>{d.date}: {dataKey === 'netMargin' ? `${d[dataKey].toFixed(2)}%` : `$${d[dataKey].toFixed(2)}`}</title></circle>))}
        {data.map((d, i) => { if (data.length > 12 && i % Math.ceil(data.length / 12) !== 0) return null; return <text key={i} x={getX(i)} y={height - 15} textAnchor="middle" className="text-[10px] fill-gray-400">{d.label}</text>; })}
      </svg>
    </div>
  );
};

const OutgoingReportsView = ({
  outgoingOrders, setOutgoingOrders,
  internalOrders,
  websiteOrders,
  customers,

}) => {
  const [reportSource, setReportSource] = useState('outgoing');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
  const [selectedSku, setSelectedSku] = useState('all');
  const [timeframe, setTimeframe] = useState('3m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState('table');
  const [graphMetric, setGraphMetric] = useState('revenue');

  // --- PARTNER SHIPPING TOTAL (Calculated from Outgoing Orders Only) ---
  const globalPartnerShipping = useMemo(() => {
    return outgoingOrders
      .filter(o => o.isPartnerShipping)
      .reduce((sum, o) => sum + Number(o.shippingCost || 0), 0);
  }, [outgoingOrders]);

  const clearPartnerShipping = () => {
    if (confirm("Clear all partner shipping costs? This will reset the Partner Balance to $0.00.")) {
      setOutgoingOrders(prev => prev.map(o => o.isPartnerShipping ? { ...o, isPartnerShipping: false } : o));
      toast.success("Partner Shipping Balance Cleared");
    }
  };

  // --- 1. NORMALIZE DATA ---
  const normalizedOrders = useMemo(() => {
    let raw = [];

    // Outgoing (B2B)
    if (reportSource === 'outgoing' || reportSource === 'all') {
      raw = raw.concat(outgoingOrders.map(o => ({
        ...o,
        type: 'outgoing',
        shippingCost: Number(o.shippingCost || 0),
        shippingCharge: 0
      })));
    }

    // Internal
    if (reportSource === 'internal' || reportSource === 'all') {
      raw = raw.concat(internalOrders.map(o => ({
        id: o.id, date: o.date, customerId: o.customerId,
        adjustment: 0, processingFee: 0, shippingCost: 0, shippingCharge: 0,
        type: 'internal',
        items: [{ sku: o.sku, count: Number(o.count || 0), price: Number(o.price || 0), unitCost: Number(o.unitCost || 0) }]
      })));
    }

    // Website
    if (reportSource === 'website' || reportSource === 'all') {
      raw = raw.concat(websiteOrders.map(o => ({
        id: o.id,
        date: o.date,
        customerName: o.customerName,
        adjustment: Number(o.shippingCharge || 0), // Count shipping charge as revenue adjustment
        processingFee: Number(o.processingFee || 0),
        shippingCost: Number(o.costToShip || o.shippingCost || 0),
        shippingCharge: Number(o.shippingCharge || 0),
        type: 'website',
        items: o.items ? o.items.map(i => ({
          sku: i.sku,
          count: Number(i.count || 0),
          price: Number(i.price || 0),
          unitCost: Number(i.unitCost || 0)
        })) : [{
          sku: o.sku,
          count: Number(o.count || 0),
          price: Number(o.price || 0),
          unitCost: Number(o.unitCost || 0)
        }]
      })));
    }
    return raw;
  }, [outgoingOrders, internalOrders, websiteOrders, reportSource]);

  // --- 2. FILTER & AGGREGATE ---
  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    if (timeframe === 'custom') {
      if (!customStart || !customEnd) return null;
      start = new Date(customStart);
      end = new Date(customEnd);
    } else {
      if (timeframe === '3m') start.setMonth(now.getMonth() - 3);
      if (timeframe === '6m') start.setMonth(now.getMonth() - 6);
      if (timeframe === '1y') start.setFullYear(now.getFullYear() - 1);
      if (timeframe === '2y') start.setFullYear(now.getFullYear() - 2);
    }
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, [timeframe, customStart, customEnd]);

  const aggregateData = React.useCallback((rangeStart, rangeEnd) => {
    let totals = {
      revenue: 0, cogs: 0, netProfit: 0, adjustments: 0, processingFees: 0,
      shippingCost: 0, shippingCharge: 0,
      totalUnits: 0, skuBreakdown: {}
    };

    const relevantOrders = normalizedOrders.filter(o => {
      const d = new Date(o.date);
      let customerMatch = true;

      if (reportSource === 'outgoing' || reportSource === 'internal') {
        if (selectedCustomerIds.size > 0 && !selectedCustomerIds.has(Number(o.customerId))) {
          customerMatch = false;
        }
      }
      if (reportSource === 'all' && selectedCustomerIds.size > 0 && o.type !== 'website') {
        if (!selectedCustomerIds.has(Number(o.customerId))) customerMatch = false;
      }

      return customerMatch && d >= rangeStart && d <= rangeEnd;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    const timeSeriesMap = {};

    relevantOrders.forEach(order => {
      const orderSubtotal = order.items.reduce((sum, i) => sum + (i.count * i.price), 0);
      let prorationFactor = 1;
      let orderRevenue = 0;
      let orderCogs = 0;

      if (selectedSku === 'all') {
        orderRevenue = orderSubtotal + Number(order.adjustment || 0); // shippingCharge is inside adjustment
        orderCogs = order.items.reduce((sum, i) => sum + (i.count * i.unitCost), 0);
      } else {
        const skuItems = order.items.filter(i => i.sku === selectedSku);
        if (skuItems.length === 0) return;
        const skuRevenue = skuItems.reduce((sum, i) => sum + (i.count * i.price), 0);
        const skuCogs = skuItems.reduce((sum, i) => sum + (i.count * i.unitCost), 0);
        prorationFactor = orderSubtotal > 0 ? skuRevenue / orderSubtotal : 0;
        orderRevenue = skuRevenue + (Number(order.adjustment || 0) * prorationFactor);
        orderCogs = skuCogs;
      }

      const fees = Number(order.processingFee || 0) * prorationFactor;
      const shipCost = Number(order.shippingCost || 0) * prorationFactor;
      const shipCharge = Number(order.shippingCharge || 0) * prorationFactor;
      const adj = Number(order.adjustment || 0) * prorationFactor;
      const netProfit = orderRevenue - (orderCogs + fees + shipCost);

      totals.revenue += orderRevenue;
      totals.cogs += orderCogs;
      totals.netProfit += netProfit;
      totals.adjustments += adj;
      totals.processingFees += fees;
      totals.shippingCost += shipCost;
      totals.shippingCharge += shipCharge;

      // Time Series
      const dateKey = new Date(order.date).toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!timeSeriesMap[dateKey]) timeSeriesMap[dateKey] = { label: dateKey, date: order.date, revenue: 0, netProfit: 0, netMargin: 0 };
      timeSeriesMap[dateKey].revenue += orderRevenue;
      timeSeriesMap[dateKey].netProfit += netProfit;

      // SKU Breakdown
      order.items.forEach(item => {
        if (selectedSku !== 'all' && item.sku !== selectedSku) return;
        if (!totals.skuBreakdown[item.sku]) totals.skuBreakdown[item.sku] = { sku: item.sku, totalUnits: 0, totalSales: 0, totalCost: 0 };
        totals.skuBreakdown[item.sku].totalUnits += Number(item.count);
        totals.skuBreakdown[item.sku].totalSales += (Number(item.count) * Number(item.price));
        totals.skuBreakdown[item.sku].totalCost += (Number(item.count) * Number(item.unitCost));
      });
    });

    const timeSeries = Object.values(timeSeriesMap).map(d => ({
      ...d, netMargin: d.revenue > 0 ? (d.netProfit / d.revenue) * 100 : 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    totals.netMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue) * 100 : 0;
    return { totals, timeSeries };
  }, [normalizedOrders, selectedCustomerIds, reportSource, selectedSku]);

  const currentData = useMemo(() => {
    if (!dateRange) return null;
    return aggregateData(dateRange.start, dateRange.end);
  }, [dateRange, aggregateData]);

  const previousData = useMemo(() => {
    if (!dateRange) return null;
    const duration = dateRange.end - dateRange.start;
    const prevEnd = new Date(dateRange.start.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - duration);
    return aggregateData(prevStart, prevEnd);
  }, [dateRange, aggregateData]);

  const tableRows = useMemo(() => {
    if (!currentData) return [];
    return Object.values(currentData.totals.skuBreakdown).map(d => {
      const gp = d.totalSales - d.totalCost;
      return {
        ...d,
        avgPrice: d.totalUnits > 0 ? d.totalSales / d.totalUnits : 0,
        avgCost: d.totalUnits > 0 ? d.totalCost / d.totalUnits : 0,
        avgGp: d.totalUnits > 0 ? gp / d.totalUnits : 0,
        totalGrossProfit: gp,
        gpMargin: d.totalSales > 0 ? (gp / d.totalSales) * 100 : 0
      };
    });
  }, [currentData]);

  const { processedData, sortConfig, handleSort, filters, handleFilter } = useTable(tableRows, { key: 'totalSales', direction: 'desc' });





  const allUniqueSkus = useMemo(() => {
    const s = new Set(normalizedOrders.flatMap(o => o.items.map(i => i.sku)));
    return Array.from(s).sort();
  }, [normalizedOrders]);

  const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: c.company })), [customers]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Source</label>
            <select value={reportSource} onChange={(e) => { setReportSource(e.target.value); setSelectedCustomerIds(new Set()); }} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
              <option value="outgoing">Outgoing (B2B)</option>
              <option value="internal">Internal Orders</option>
              <option value="website">Website Orders</option>
              <option value="all">All Avenues (Combined)</option>
            </select>
          </div>
          <MultiSelectDropdown
            label="Customers"
            options={customerOptions}
            selectedValues={selectedCustomerIds}
            onChange={setSelectedCustomerIds}
            disabled={reportSource === 'website'}
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">SKU</label>
            <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
              <option value="all">All SKUs</option>
              {allUniqueSkus.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Timeframe</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
              {TIME_RANGES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        {timeframe === 'custom' && (
          <div className="flex gap-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
          </div>
        )}
      </div>

      {(reportSource !== 'website' && reportSource !== 'all' && selectedCustomerIds.size === 0) ? (
        <div className="text-center p-10 text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          Select at least one Customer to begin analysis.
        </div>
      ) : (
        <>
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg w-fit">
            {['table', 'trends', 'comparison'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium rounded-md capitalize ${activeTab === t ? 'bg-white dark:bg-gray-800 shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>{t === 'table' ? 'Overview Table' : t}</button>
            ))}
          </div>

          {activeTab === 'table' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <SortableHeaderCell label="SKU" sortKey="sku" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.sku} />
                        <SortableHeaderCell label="Units" sortKey="totalUnits" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.totalUnits} className="text-right" />
                        <SortableHeaderCell label="Total Sales" sortKey="totalSales" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.totalSales} className="text-right" />
                        <SortableHeaderCell label="Total COGS" sortKey="totalCost" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.totalCost} className="text-right" />
                        <SortableHeaderCell label="Avg Price" sortKey="avgPrice" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.avgPrice} className="text-right" />
                        <SortableHeaderCell label="Avg Cost" sortKey="avgCost" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.avgCost} className="text-right" />
                        <SortableHeaderCell label="Avg GP" sortKey="avgGp" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.avgGp} className="text-right" />
                        <SortableHeaderCell label="Total GP" sortKey="totalGrossProfit" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.totalGrossProfit} className="text-right" />
                        <SortableHeaderCell label="GP %" sortKey="gpMargin" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.gpMargin} className="text-right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {processedData.map((row) => (
                        <tr key={row.sku} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{row.sku}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-gray-300">{row.totalUnits.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 dark:text-white">${row.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-sm text-right text-red-500 dark:text-red-400">${row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-gray-400">${row.avgPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-gray-400">${row.avgCost.toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-right text-green-600 dark:text-green-400">${row.avgGp.toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-green-700 dark:text-green-400">${row.totalGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-sm text-right text-indigo-600 dark:text-indigo-400">{row.gpMargin.toFixed(2)}%</td>
                        </tr>
                      ))}
                      {processedData.length === 0 && <tr><td colSpan={9} className="p-4 text-center text-gray-500">No data found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Financial Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Revenue</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">${currentData?.totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                    <div className="text-xs text-red-600 dark:text-red-400 uppercase">Total COGS</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">${currentData?.totals.cogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                    <div className="text-xs text-green-600 dark:text-green-400 uppercase">Net Profit</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">${currentData?.totals.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 uppercase">Net Margin</div>
                    <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{currentData?.totals.netMargin.toFixed(2)}%</div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 p-2 border-l border-gray-200 dark:border-gray-700 pl-4">
                    {(reportSource === 'website' || reportSource === 'all') && (
                      <div className="flex justify-between"><span>Shipping Revenue:</span> <span className="font-medium">${currentData?.totals.shippingCharge.toLocaleString()}</span></div>
                    )}
                    <div className="flex justify-between"><span>Shipping Cost:</span> <span className="font-medium">${currentData?.totals.shippingCost.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Total Fees:</span> <span className="font-medium">${currentData?.totals.processingFees.toLocaleString()}</span></div>
                  </div>

                  {/* PARTNER SHIPPING TRACKER (Re-Added Here) */}
                  {(reportSource === 'outgoing' || reportSource === 'all') && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 relative col-span-1 lg:col-span-1">
                      <div className="text-xs text-amber-700 dark:text-amber-400 uppercase font-bold">Partner Shipping Balance</div>
                      <div className="text-2xl font-bold text-amber-800 dark:text-amber-300 mb-1">${globalPartnerShipping.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <button
                        onClick={clearPartnerShipping}
                        className="text-[10px] text-amber-600 dark:text-amber-400 underline hover:text-amber-800 cursor-pointer"
                      >
                        Clear Balance (Reset to 0)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {METRICS.map(m => (
                  <button key={m.key} onClick={() => setGraphMetric(m.key)} className={`px-3 py-1 rounded text-sm border ${graphMetric === m.key ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-300'}`}>{m.label}</button>
                ))}
              </div>
              <SimpleLineChart data={currentData?.timeSeries} dataKey={graphMetric} label={`${selectedSku === 'all' ? 'Whole Business' : selectedSku} - ${METRICS.find(m => m.key === graphMetric).label}`} />
            </div>
          )}

          {activeTab === 'comparison' && currentData && previousData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ComparisonCard title="Total Revenue" current={currentData.totals.revenue} previous={previousData.totals.revenue} format="currency" />
              <ComparisonCard title="Net Profit" current={currentData.totals.netProfit} previous={previousData.totals.netProfit} format="currency" />
              <ComparisonCard title="Net Margin" current={currentData.totals.netMargin} previous={previousData.totals.netMargin} format="percent" />
              <div className="md:col-span-3 bg-gray-50 dark:bg-gray-800 p-4 rounded text-sm text-gray-500 text-center">Comparing current period to previous {timeframe === 'custom' ? 'custom range' : timeframe} period.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OutgoingReportsView;