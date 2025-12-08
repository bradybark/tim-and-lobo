// src/views/PlannerView.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  ChevronDown,
  HelpCircle,
  Camera,
  Upload,
  Calendar
} from 'lucide-react';

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

const TooltipHeader = ({ title, tooltip, className = '' }) => (
  <div
    className={`group relative inline-flex items-center gap-1 cursor-help ${className}`}
  >
    <span>{title}</span>
    <HelpCircle className="w-3 h-3" />
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-center font-normal normal-case border border-gray-700">
      {tooltip}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
    </div>
  </div>
);

const ImageUploader = ({
  imageKey,
  currentImage,
  onUpload,
  className = '',
  placeholder,
  objectFit = 'cover',
}) => {
  const fileInputRef = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(imageKey, reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const containerClasses = `cursor-pointer overflow-hidden relative group flex items-center justify-center ${className}`;
  const emptyStateClasses = currentImage
    ? ''
    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600';

  return (
    <div className="relative inline-block w-full h-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div
        onClick={handleClick}
        className={`${containerClasses} ${emptyStateClasses}`}
        title="Upload image"
      >
        {currentImage ? (
          <>
            <img
              src={currentImage}
              alt="Uploaded"
              className={`w-full h-full object-${objectFit} object-center`}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 scale-75">
                <Camera className="w-4 h-4" />
              </span>
            </div>
          </>
        ) : (
          placeholder || (
            <span className="text-gray-400">
              <Upload className="w-4 h-4" />
            </span>
          )
        )}
      </div>
    </div>
  );
};

const PlannerView = ({
  plannerData,
  skuImages,
  handleImageUpload,
  updateSkuSetting,
  handleExportExcel,
  handleExportAll,
  // New props
  rateParams,
  setRateParams
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase sticky left-0 bg-gray-50 dark:bg-gray-700 z-10 min-w-[200px]">
                <TooltipHeader
                  title="Product"
                  tooltip="Product SKU and Image"
                />
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                <TooltipHeader
                  title="Status"
                  tooltip="Reorder status based on inventory levels"
                />
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                <TooltipHeader
                  title="Cur. Inv"
                  tooltip="Current inventory on hand"
                />
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                <TooltipHeader
                  title="Daily Rate"
                  tooltip={`Average units sold per day. Basis: ${plannerData[0]?.usedPeriodLabel || 'Selected Period'}`}
                />
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                <TooltipHeader
                  title="Days Left"
                  tooltip="Estimated days until stockout"
                />
              </th>

              {/* Editable settings */}
              <th className="px-3 py-3 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 border-l border-r border-indigo-100 dark:border-indigo-900/30 w-32">
                <TooltipHeader
                  title="LEAD TIME DAYS"
                  tooltip="Days it takes for an order to arrive"
                />
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 border-r border-indigo-100 dark:border-indigo-900/30 w-32">
                <TooltipHeader
                  title="MIN INV DAYS"
                  tooltip="Safety buffer in days of stock"
                />
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/20 border-r border-indigo-100 dark:border-indigo-900/30 w-32">
                <TooltipHeader
                  title="TARGET MO."
                  tooltip="Desired months of stock upon arrival"
                />
              </th>

              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                <TooltipHeader
                  title="Trigger Qty"
                  tooltip="Inventory level to trigger reorder"
                />
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                <TooltipHeader
                  title="Target Qty"
                  tooltip="Ideal inventory quantity"
                />
              </th>

              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                <TooltipHeader
                  title="On Order"
                  tooltip="Stock currently on the way"
                />
              </th>
              <th className="px-3 py-3 text-right text-xs font-bold text-gray-700 dark:text-white uppercase bg-yellow-50 dark:bg-yellow-900/10">
                <TooltipHeader
                  title="Reorder Qty"
                  tooltip="Amount needed to reach target"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                <TooltipHeader
                  title="Suggested Order"
                  tooltip="Date to place order by"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                <TooltipHeader
                  title="Forecast Zero"
                  tooltip="Estimated date of stockout"
                />
              </th>
            </tr>
          </thead>

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {plannerData.map((row) => {
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

            {plannerData.length === 0 && (
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