// src/views/ReportsView.jsx
import React, { useState } from 'react';
import { FileText, Download, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { SalesTrendReport } from '../components/SalesTrendReport';

const ReportsView = ({
  leadTimeStats,
  onExportLeadTimeReport,
  snapshots,
  pos,
}) => {
  const [isLeadTimeOpen, setIsLeadTimeOpen] = useState(false);

  const rows = leadTimeStats?.rows || [];

  const formatDays = (value) => {
    if (value == null || Number.isNaN(value)) return '—';
    return `${value.toFixed(1)} Days`;
  };

  const getStatusInfo = (variance) => {
    if (variance == null || Number.isNaN(variance)) {
      return {
        label: 'No Data',
        className: 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-100 border border-gray-200 dark:border-gray-600/60',
      };
    }
    if (variance <= 0) {
      return {
        label: 'On Avg Early',
        className: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40',
      };
    }
    return {
      label: 'On Avg Late',
      className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/40',
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Detailed insights into inventory performance, lead times, and sales trends.
        </p>
      </div>

      {/* Sales Trend Report */}
      <section>
        <div className="mb-3 flex items-center gap-2">
           <BarChart3 className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
           <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-200">Sales Trends</h2>
        </div>
        <SalesTrendReport snapshots={snapshots || []} pos={pos || []} />
      </section>

      {/* Lead Time & Variance Analysis */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800/60 bg-white dark:bg-slate-950/60 shadow-sm">
        {/* Header row */}
        <button
          type="button"
          onClick={() => setIsLeadTimeOpen((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-100">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Lead Time &amp; Variance Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onExportLeadTimeReport && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExportLeadTimeReport();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Detail</span>
              </button>
            )}
            {isLeadTimeOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>

        {isLeadTimeOpen && (
          <div className="border-t border-gray-100 dark:border-gray-800/80 px-6 pb-5 pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Analysis of how long it takes to receive inventory (Order
              Date to Received Date) and how accurate the ETA was (ETA vs
              Received Date).
            </p>

            {rows.length === 0 ? (
              <p className="mt-4 text-xs text-gray-500">
                No received purchase orders yet. Once POs are marked as
                received, this report will summarize average lead times and
                ETA variance by SKU.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800/80 bg-gray-50 dark:bg-slate-950/60">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-slate-900/60 text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-2 text-left font-medium">
                        SKU
                      </th>
                      <th className="px-4 py-2 text-left font-medium">
                        AVG ACTUAL LEAD TIME
                      </th>
                      <th className="px-4 py-2 text-left font-medium">
                        AVG VARIANCE (ETA)
                      </th>
                      <th className="px-4 py-2 text-left font-medium">
                        STATUS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const status = getStatusInfo(row.avgVarianceEta);
                      return (
                        <tr
                          key={row.sku}
                          className="border-b border-gray-100 dark:border-gray-800/60 last:border-b-0"
                        >
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {row.sku}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-200">
                            {formatDays(row.avgActualLeadTime)}
                          </td>
                          <td className="px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                            {formatDays(row.avgVarianceEta)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default ReportsView;