// src/views/PlannerView.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { ImageUploader } from '../components/ImageUploader';
import { TooltipHeader } from '../components/TooltipHeader';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';

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

const PlannerView = ({
  plannerData,
  skuImages,
  handleImageUpload,
  updateSkuSetting,
  handleExportExcel,
  handleExportAll,
  rateParams,
  setRateParams
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  const { processedData, sortConfig, handleSort, filters, handleFilter } = useTable(plannerData);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target)
      ) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Control Bar */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Daily Rate Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Sales Rate Basis:</span>
          </div>
          
          <select 
            value={rateParams.timeframe}
            onChange={(e) => setRateParams(prev => ({ ...prev, timeframe: e.target.value }))}
            className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
          >
            <option value="last-period">Most Recent Snapshot (Default)</option>
            <option value="3m">Average: Last 3 Months</option>
            <option value="6m">Average: Last 6 Months</option>
            <option value="1y">Average: Last 1 Year</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {rateParams.timeframe === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
              <input 
                type="date"
                value={rateParams.customStart}
                onChange={(e) => setRateParams(prev => ({ ...prev, customStart: e.target.value }))}
                className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 text-gray-900 dark:text-white"
                title="Start Date"
              />
              <span className="text-gray-400">-</span>
              <input 
                type="date"
                value={rateParams.customEnd}
                onChange={(e) => setRateParams(prev => ({ ...prev, customEnd: e.target.value }))}
                className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 text-gray-900 dark:text-white"
                title="End Date"
              />
            </div>
          )}
        </div>

        {/* Export Menu */}
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setShowExportMenu((prev) => !prev)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-4 rounded transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Options
            <ChevronDown className="w-3 h-3" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-1" role="menu">
                <button
                  type="button"
                  onClick={() => {
                    handleExportExcel();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col"
                >
                  <span className="font-medium">Export Current View</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Download only this page as Excel
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportAll();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col border-t border-gray-100 dark:border-gray-600"
                >
                  <span className="font-medium">Export Full Workbook</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Inventory Log, POs &amp; Reorder Planner (3 sheets)
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main table */}
      <div className="overflow-x-auto custom-scroll pb-4">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <SortableHeaderCell 
                label="Product" 
                sortKey="sku" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                onFilter={handleFilter} 
                filterValue={filters.sku}
                className="sticky left-0 bg-gray-50 dark:bg-gray-700 z-10 min-w-[200px]"
                tooltip="Product SKU and Image"
              />
              <SortableHeaderCell label="Status" sortKey="needsAction" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.needsAction} className="text-center" />
              <SortableHeaderCell label="Cur. Inv" sortKey="currentInv" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.currentInv} className="text-right" />
              <SortableHeaderCell label="Daily Rate" sortKey="dailyRate" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.dailyRate} className="text-right" />
              <SortableHeaderCell label="Days Left" sortKey="daysRemaining" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.daysRemaining} className="text-right" />

              {/* Editable settings */}
              <SortableHeaderCell label="Lead Time" sortKey="settings.leadTime" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters['settings.leadTime']} className="bg-indigo-50 dark:bg-indigo-900/20 text-center text-indigo-700 w-32" />
              <SortableHeaderCell label="Min Days" sortKey="settings.minDays" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters['settings.minDays']} className="bg-indigo-50 dark:bg-indigo-900/20 text-center text-indigo-700 w-32" />
              <SortableHeaderCell label="Target Mo" sortKey="settings.targetMonths" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters['settings.targetMonths']} className="bg-indigo-50 dark:bg-indigo-900/20 text-center text-indigo-700 w-32" />

              <SortableHeaderCell label="Trigger" sortKey="reorderTriggerLevel" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.reorderTriggerLevel} className="text-right" />
              <SortableHeaderCell label="Target" sortKey="targetUnitLevel" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.targetUnitLevel} className="text-right" />

              <SortableHeaderCell label="On Order" sortKey="onOrder" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.onOrder} className="text-right" />
              <SortableHeaderCell label="Reorder Qty" sortKey="reorderQty" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.reorderQty} className="bg-yellow-50 dark:bg-yellow-900/10 text-right text-gray-700 dark:text-white" />
              <SortableHeaderCell label="Sug. Order" sortKey="suggestOrderDate" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.suggestOrderDate} />
              <SortableHeaderCell label="Stockout" sortKey="zeroDate" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.zeroDate} />
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {processedData.map((row) => {
              const isUrgent = row.needsAction;
              return (
                <tr
                  key={row.sku}
                  className={
                    isUrgent
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-inherit z-10 border-r border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-4">
                        <ImageUploader
                          imageKey={row.sku}
                          currentImage={skuImages[row.sku]}
                          onUpload={handleImageUpload}
                          className="w-10 h-10 rounded-md border border-gray-200 dark:border-gray-600 shadow-sm"
                        />
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {row.sku}
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    {isUrgent ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Order
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        OK
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-200">
                    {row.currentInv.toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {row.dailyRate.toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {row.daysRemaining === Infinity
                      ? '∞'
                      : row.daysRemaining.toFixed(0)}
                  </td>

                  {/* Inputs */}
                  <td className="px-2 py-4 whitespace-nowrap bg-indigo-50/50 dark:bg-indigo-900/10 border-l border-r border-indigo-100 dark:border-indigo-900/30">
                    <input
                      type="number"
                      className="table-input"
                      value={row.settings.leadTime}
                      onChange={(e) =>
                        updateSkuSetting(row.sku, 'leadTime', e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap bg-indigo-50/50 dark:bg-indigo-900/10 border-r border-indigo-100 dark:border-indigo-900/30">
                    <input
                      type="number"
                      className="table-input"
                      value={row.settings.minDays}
                      onChange={(e) =>
                        updateSkuSetting(row.sku, 'minDays', e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap bg-indigo-50/50 dark:bg-indigo-900/10 border-r border-indigo-100 dark:border-indigo-900/30">
                    <input
                      type="number"
                      className="table-input"
                      value={row.settings.targetMonths}
                      onChange={(e) =>
                        updateSkuSetting(row.sku, 'targetMonths', e.target.value)
                      }
                    />
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(row.reorderTriggerLevel).toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(row.targetUnitLevel).toLocaleString()}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-blue-600 dark:text-blue-400 font-medium">
                    {row.onOrder.toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/10">
                    {Math.ceil(row.reorderQty).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {row.needsAction ? (
                      <span className="text-red-600 dark:text-red-400 font-bold">
                        Today
                      </span>
                    ) : (
                      formatDate(row.suggestOrderDate)
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {row.zeroDate ? formatDate(row.zeroDate) : 'Never'}
                  </td>
                </tr>
              );
            })}

            {processedData.length === 0 && (
              <tr>
                <td
                  colSpan={14}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  No products found. Go to Inventory Log to add your first item.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlannerView;