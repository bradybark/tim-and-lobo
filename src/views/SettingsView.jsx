// src/views/SettingsView.jsx
import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Download,
  FileText,
  Users,
  Trash2, 
  Image as ImageIcon,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

const SettingsView = ({
  onOpenVendors,
  onLinkCloudFile,
  onExportData,    
  onExportImages,  
  onImportBackup,
  cloudStatus,
  onPruneData,
  onOptimizeImages, // <--- NEW PROP
}) => {
  const fileInputRef = useRef(null);
  const [pruneMonths, setPruneMonths] = useState(12);

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
    reader.onload = (event) => {
      try {
        const json = JSON.parse(reader.result);
        onImportBackup(json);
      } catch (err) {
        console.error('Failed to parse backup file', err);
        toast.error('Failed to read backup file. Please make sure it is a valid JSON export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8">
      {/* Cloud Sync */}
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
                Syncs your full database (including images) to a local file for cloud backup.
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
            {cloudStatus && (
              <p className="mt-1 text-[11px] text-emerald-400">
                {cloudStatus}
              </p>
            )}
          </div>
        </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Manual Data Backup */}
        <section className="rounded-2xl border border-gray-800/60 bg-slate-950/60 px-6 py-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-100">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-700/40 text-slate-100">
              <FileText className="h-4 w-4" />
            </span>
            <span>Data Management</span>
          </h2>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-gray-800/80 bg-slate-900/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-100">Export Data</p>
                <p className="text-xs text-gray-400">Excludes images (Small file).</p>
              </div>
              <button
                type="button"
                onClick={onExportData}
                className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-800/80 bg-slate-900/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-100">Import File</p>
                <p className="text-xs text-gray-400">Restores data or images.</p>
              </div>
              <button
                type="button"
                onClick={handleImportClick}
                className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-slate-800"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Select</span>
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

        {/* Image Archive */}
        <section className="rounded-2xl border border-gray-800/60 bg-slate-950/60 px-6 py-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-100">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-700/40 text-slate-100">
              <ImageIcon className="h-4 w-4" />
            </span>
            <span>Image Library</span>
          </h2>

          <div className="mt-4 space-y-3">
            {/* Optimize Button (New) */}
            <div className="flex items-center justify-between rounded-xl border border-gray-800/80 bg-slate-900/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-100">Optimize Library</p>
                <p className="text-xs text-gray-400">Resize all images to 150px.</p>
              </div>
              <button
                type="button"
                onClick={onOptimizeImages}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-500/50 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Run</span>
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-800/80 bg-slate-900/60 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-100">Export Images</p>
                <p className="text-xs text-gray-400">Save all product photos.</p>
              </div>
              <button
                type="button"
                onClick={onExportImages}
                className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-gray-100 hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            </div>
            
            <div className="px-4 py-2">
                <p className="text-[11px] text-gray-500">
                    * To restore images, simply use the "Import File" button on the left and select your image backup file.
                </p>
            </div>
          </div>
        </section>
      </div>

      {/* Maintenance & Vendors */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-red-900/30 bg-red-950/10 px-6 py-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-900/20 text-red-400">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-100">
                  Data Maintenance
                </h3>
                <p className="text-xs text-gray-400">
                  Clear out old history to reduce file size.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={pruneMonths}
                onChange={(e) => setPruneMonths(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value={6}>Older than 6 Months</option>
                <option value={12}>Older than 1 Year</option>
                <option value={24}>Older than 2 Years</option>
                <option value={36}>Older than 3 Years</option>
              </select>

              <button
                type="button"
                onClick={() => onPruneData && onPruneData(pruneMonths)} 
                className="inline-flex items-center gap-2 rounded-full border border-red-800/50 bg-red-900/20 px-4 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/40 hover:text-white transition-colors"
              >
                Run Cleanup
              </button>
            </div>
          </div>
        </section>

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
              Manage
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;