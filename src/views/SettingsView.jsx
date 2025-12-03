// views/SettingsView.jsx
import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';

const SettingsView = ({
  onOpenVendors,
  onLinkCloudFile,
  onExportBackup,
  onImportBackup,
  cloudStatus,
  leadTimeStats,
  onExportLeadTimeReport,
}) => {
  const fileInputRef = useRef(null);
  const [isLeadTimeOpen, setIsLeadTimeOpen] = useState(false); // collapsed by default

  const handleImportClick = () => {
    if (!onImportBackup) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !onImportBackup) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        onImportBackup(json);
      } catch (err) {
        console.error('Failed to parse backup file', err);
        alert(
          'Failed to read backup file. Please make sure it is a valid JSON export.'
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const rows = leadTimeStats?.rows || [];

  const formatDays = (value) => {
    if (value == null || Number.isNaN(value)) return '—';
    return `${value.toFixed(1)} Days`;
  };

  // ✅ Treat variance <= 0 as "On Avg Early"
  const getStatusInfo = (variance) => {
    if (variance == null || Number.isNaN(variance)) {
      return {
        label: 'No Data',
        className:
          'bg-gray-700/60 text-gray-100 border border-gray-600/60',
      };
    }

    if (variance <= 0) {
      return {
        label: 'On Avg Early',
        className:
          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40',
      };
    }

    return {
      label: 'On Avg Late',
      className:
        'bg-amber-500/10 text-amber-400 border border-amber-500/40',
    };
  };

  const handleExportLeadTimeClick = () => {
    if (onExportLeadTimeReport) {
      onExportLeadTimeReport();
    }
  };

  return (
    <div className="space-y-8">
      {/* Cloud Sync + Manual Backup */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cloud Sync (Live) */}
        <section className="rounded-2xl border border-gray-800/60 bg-slate-950/60 px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-100">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
                  <UploadCloud className="h-4 w-4" />
                </span>
                <span>Cloud Sync (Live)</span>
              </h2>
              <p className="text-xs text-gray-400">
                Link to a file in your Google Drive or Dropbox folder to
                enable auto-backup. Each change you make will be
                periodically written to that file.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={onLinkCloudFile}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Link to Database File</span>
            </button>

            <p className="mt-2 text-[11px] text-gray-500">
              * Requires Chrome, Edge, or Opera. If using Safari/Firefox,
              use manual export/import below.
            </p>
            {cloudStatus && (
              <p className="mt-1 text-[11px] text-emerald-400">
                {cloudStatus}
              </p>
            )}
          </div>
        </section>

        {/* Manual Backup */}
        <section className="rounded-2xl border border-gray-800/60 bg-slate-950/60 px-6 py-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-100">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-700/40 text-slate-100">
              <FileText className="h-4 w-4" />
            </span>
            <span>Manual Backup</span>
          </h2>

          <div className="mt-4 space-y-3">
            {/* Export row */}
            <div className="flex items-center justify-between rounded-xl border border-gray-800/80 bg-slate-900/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-100">
                  Export Backup
                </p>
                <p className="text-xs text-gray-400">
                  Download a copy of your local database.
                </p>
              </div>
              <button
                type="button"
                onClick={onExportBackup}
                className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>
            </div>

            {/* Import row */}
            <div className="flex items-center justify-between rounded-xl border border-gray-800/80 bg-slate-900/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-100">
                  Import Backup
                </p>
                <p className="text-xs text-gray-400">
                  Restore from a previously exported file.
                </p>
              </div>
              <button
                type="button"
                onClick={handleImportClick}
                className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-slate-800"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Select File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Vendor Management */}
      <section className="rounded-2xl border border-gray-800/60 bg-slate-950/60 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-100">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-100">
                Vendor Management
              </h3>
              <p className="text-xs text-gray-400">
                Add, edit, or remove vendor contact details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenVendors}
            className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-slate-800"
          >
            Manage Vendors
          </button>
        </div>
      </section>

      {/* Detailed Reports */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-200">
          Detailed Reports
        </h2>

        {/* Lead Time & Variance Analysis card */}
        <div className="rounded-2xl border border-gray-800/60 bg-slate-950/60 shadow-sm">
          {/* Header row */}
          <button
            type="button"
            onClick={() => setIsLeadTimeOpen((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-100">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-100">
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
                    handleExportLeadTimeClick();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-slate-800"
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
            <div className="border-t border-gray-800/80 px-6 pb-5 pt-4">
              <p className="text-xs text-gray-400">
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
                <div className="mt-4 overflow-x-auto rounded-xl border border-gray-800/80 bg-slate-950/60">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-slate-900/60 text-gray-400">
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
                            className="border-b border-gray-800/60 last:border-b-0"
                          >
                            <td className="px-4 py-2 text-sm font-medium text-gray-100">
                              {row.sku}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-200">
                              {formatDays(row.avgActualLeadTime)}
                            </td>
                            <td className="px-4 py-2 text-sm text-emerald-400">
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
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
