// src/components/CustomerSalesReportModal.jsx
import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';

const formatMoney = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
};

const CustomerSalesReportModal = ({ customer, onClose }) => {
  const { outgoingOrders = [], internalOrders = [], skuDescriptions = {} } = useInventory();
  const [timePeriod, setTimePeriod] = useState('All Time');
  const [excludeInitial, setExcludeInitial] = useState(true);

  const reportData = useMemo(() => {
    if (!customer) return [];

    // 1. Gather all line items for this customer from both lists
    const allCustomerItems = [];
    
    // Process outgoing orders
    const custOutgoing = outgoingOrders.filter(o => Number(o.customerId) === Number(customer.id));
    custOutgoing.forEach(order => {
      (order.items || []).forEach(item => {
        allCustomerItems.push({
          date: new Date(order.date),
          sku: item.sku,
          count: Number(item.count) || 0,
          revenue: (Number(item.count) || 0) * (Number(item.price) || 0),
          cost: (Number(item.count) || 0) * (Number(item.unitCost) || 0)
        });
      });
    });

    // Process internal orders
    const custInternal = internalOrders.filter(o => Number(o.customerId) === Number(customer.id));
    custInternal.forEach(order => {
      allCustomerItems.push({
        date: new Date(order.date),
        sku: order.sku,
        count: Number(order.count) || 0,
        revenue: (Number(order.count) || 0) * (Number(order.price) || 0),
        cost: (Number(order.count) || 0) * (Number(order.unitCost) || 0)
      });
    });

    // Sort all items chronologically (oldest first) to find the "Initial Stocking" order easily
    allCustomerItems.sort((a, b) => a.date - b.date);

    // Filter by the selected time period to determine what falls into the "Visible" bucket
    const now = new Date();
    let cutoffDate = null;
    if (timePeriod === 'Last 30 Days') {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 30);
    } else if (timePeriod === 'Last 90 Days') {
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 90);
    } else if (timePeriod === 'YTD') {
      cutoffDate = new Date(now.getFullYear(), 0, 1);
    }

    // Group items by SKU
    const skuMap = {};
    allCustomerItems.forEach(item => {
      if (!skuMap[item.sku]) {
        skuMap[item.sku] = {
          sku: item.sku,
          description: skuDescriptions[item.sku] || '',
          firstOrderDate: item.date,
          secondOrderDate: null,
          totalQty: 0,
          initialQty: 0,
          replenishmentQty: 0,
          revenue: 0,
          cost: 0,
          orderCount: 0,
          // metrics specifically within the date filter:
          filteredTotalQty: 0,
          filteredInitialQty: 0,
          filteredReplenishmentQty: 0,
          filteredRevenue: 0,
          filteredCost: 0
        };
      }
      
      const record = skuMap[item.sku];
      record.orderCount++;
      const isInitialOrder = record.orderCount === 1;

      if (isInitialOrder) {
        record.initialQty += item.count;
      } else {
        record.replenishmentQty += item.count;
        if (!record.secondOrderDate) {
          record.secondOrderDate = item.date;
        }
      }
      
      record.totalQty += item.count;
      record.revenue += item.revenue;
      record.cost += item.cost;

      // Also track the metrics that fall within the selected date range
      if (!cutoffDate || item.date >= cutoffDate) {
        record.filteredTotalQty += item.count;
        record.filteredRevenue += item.revenue;
        record.filteredCost += item.cost;
        if (isInitialOrder) {
          record.filteredInitialQty += item.count;
        } else {
          record.filteredReplenishmentQty += item.count;
        }
      }
    });

    // Finalize the math for each SKU
    return Object.values(skuMap)
      .filter(record => record.filteredTotalQty > 0) // Only show SKUs active in the selected period
      .map(record => {
        let qtyToUseForRate = 0;
        let daysToUseForRate = 0;
        let hasReplenishment = !!record.secondOrderDate;

        if (excludeInitial) {
          qtyToUseForRate = record.filteredReplenishmentQty;
          if (hasReplenishment) {
            // calculate days from the second order to today, or from cutoff to today
            const startForRate = (cutoffDate && record.secondOrderDate < cutoffDate) ? cutoffDate : record.secondOrderDate;
            daysToUseForRate = Math.max(1, (now - startForRate) / (1000 * 60 * 60 * 24));
          }
        } else {
          qtyToUseForRate = record.filteredTotalQty;
          const startForRate = (cutoffDate && record.firstOrderDate < cutoffDate) ? cutoffDate : record.firstOrderDate;
          daysToUseForRate = Math.max(1, (now - startForRate) / (1000 * 60 * 60 * 24));
        }

        const unitsPerDay = hasReplenishment || !excludeInitial ? (qtyToUseForRate / daysToUseForRate) : 0;
        const unitsPerMonth = unitsPerDay * 30.42;

        const profit = record.filteredRevenue - record.filteredCost;
        const margin = record.filteredRevenue > 0 ? (profit / record.filteredRevenue) * 100 : 0;

        return {
          ...record,
          unitsPerDay,
          unitsPerMonth,
          profit,
          margin,
          hasReplenishment
        };
      })
      .sort((a, b) => b.filteredTotalQty - a.filteredTotalQty);
  }, [customer, outgoingOrders, internalOrders, timePeriod, excludeInitial, skuDescriptions]);

  const totals = reportData.reduce((acc, row) => {
    acc.qty += row.filteredTotalQty;
    acc.revenue += row.filteredRevenue;
    acc.profit += row.profit;
    return acc;
  }, { qty: 0, revenue: 0, profit: 0 });

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Customer Sales Report: {customer.company}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Analyze SKU-level ordering trends and velocity.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-6 items-center flex-shrink-0">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Time Period</label>
            <select 
              value={timePeriod} 
              onChange={e => setTimePeriod(e.target.value)}
              className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            >
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Last 90 Days">Last 90 Days</option>
              <option value="YTD">Year to Date (YTD)</option>
              <option value="All Time">All Time</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <input 
              type="checkbox" 
              id="excludeInitial"
              checked={excludeInitial}
              onChange={e => setExcludeInitial(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label htmlFor="excludeInitial" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              Exclude Initial Stocking Orders from Run Rate
            </label>
          </div>
        </div>

        {/* Note Box */}
        {excludeInitial && (
          <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-300 flex-shrink-0">
            <strong>Note:</strong> To prevent large first-time warehouse stocking orders from artificially inflating the ongoing run rate, the <em>"Units / Mo"</em> math completely ignores the very first order of any SKU. The calculation only begins from the date of their <em>second</em> order.
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-6 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Units (Period)</div>
            <div className="text-2xl font-bold dark:text-white">{totals.qty.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Gross Revenue (Period)</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatMoney(totals.revenue)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Net Profit (Period)</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatMoney(totals.profit)}</div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 p-6 pt-0">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 rounded-tl-lg">SKU & Description</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Total Qty</th>
                <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-right text-xs">Init. Stock Qty</th>
                <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-right text-xs">Rep. Qty</th>
                <th className="px-4 py-3 font-semibold text-indigo-700 dark:text-indigo-300 text-right bg-indigo-50/50 dark:bg-indigo-900/10">Ongoing Units / Mo</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Gross Rev</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Net Profit</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right rounded-tr-lg">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No order data found for this period.
                  </td>
                </tr>
              ) : (
                reportData.map(row => (
                  <tr key={row.sku} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{row.sku}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{row.description}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium dark:text-white">{row.filteredTotalQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{row.filteredInitialQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{row.filteredReplenishmentQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10">
                      {excludeInitial && !row.hasReplenishment ? (
                        <span className="text-xs font-normal text-gray-400">N/A (Stock Only)</span>
                      ) : (
                        row.unitsPerMonth.toFixed(1)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right dark:text-white">{formatMoney(row.filteredRevenue)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatMoney(row.profit)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{row.margin.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerSalesReportModal;
