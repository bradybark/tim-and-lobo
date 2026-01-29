// src/views/SettingsView.jsx
import React, { useRef, useState } from 'react';
import {
  UploadCloud, Download, FileText, Users, Trash2, Image as ImageIcon, Zap, Share2,
  DollarSign, TrendingUp, Building, Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploader } from '../components/ImageUploader';
import { useInventory } from '../context/InventoryContext';

const SettingsView = ({
  onOpenVendors,
  onOpenCustomers,
  onOpenCogs,
  onLinkCloudFile,
  onExportData,
  onExportImages,
  onImportBackup,
  cloudStatus,
  onPruneData,
  onOptimizeImages,
  onCreateShareLink,
  onClearPartnerShipping,
  poBackupHandle,
  invoiceBackupHandle,
  onSetPoHandle,
  onSetInvoiceHandle
}) => {
  const { myCompany, setMyCompany, companyLogo, handleLogoUpload } = useInventory();
  const fileInputRef = useRef(null);
  const [pruneMonths, setPruneMonths] = useState(12);
  const [isShortenEnabled, setIsShortenEnabled] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const handleImportClick = () => { if (!onImportBackup) return; if (fileInputRef.current) fileInputRef.current.click(); };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !onImportBackup) return;
    const reader = new FileReader();
    reader.onload = () => { try { const json = JSON.parse(reader.result); onImportBackup(json); } catch (err) { console.error(err); toast.error('Invalid JSON'); } };
    reader.readAsText(file);
    e.target.value = '';
  };
  const handleShareClick = async () => { setIsGeneratingLink(true); await onCreateShareLink(isShortenEnabled); setIsGeneratingLink(false); }

  const handleCompanyChange = (field, value) => {
    setMyCompany(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8">

      {/* 1. Cloud Sync */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800/60 bg-white dark:bg-slate-950/60 px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <UploadCloud className="h-4 w-4" />
              </span>
              <span>Cloud Sync (Live)</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Syncs your full database (including images) to a local file for cloud backup.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <button type="button" onClick={onLinkCloudFile} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 dark:hover:bg-indigo-500/90">
            <UploadCloud className="h-4 w-4" /> <span>Link to Database File</span>
          </button>
          {cloudStatus && <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">{cloudStatus}</p>}
        </div>
      </section>

      {/* 2. Backup Locations (Local Folder Backup) */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800/60 bg-white dark:bg-slate-950/60 px-6 py-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Download className="h-4 w-4" />
          </span>
          <span>PC Backup Locations (Automated)</span>
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-slate-900/40">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Purchase Orders</h3>
            <p className="text-xs text-gray-500 mb-3">Copy generated POs here.</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono bg-white dark:bg-black/20 px-2 py-1 rounded text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                {poBackupHandle ? poBackupHandle.name : 'Not set'}
              </span>
              <button
                onClick={async () => {
                  if (!onSetPoHandle) return;
                  try {
                    const handle = await window.showDirectoryPicker();
                    onSetPoHandle(handle);
                    toast.success("PO Folder Linked");
                  } catch (e) { console.log(e); }
                }}
                className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Set Folder
              </button>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-slate-900/40">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Invoices</h3>
            <p className="text-xs text-gray-500 mb-3">Save attached invoices here.</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono bg-white dark:bg-black/20 px-2 py-1 rounded text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                {invoiceBackupHandle ? invoiceBackupHandle.name : 'Not set'}
              </span>
              <button
                onClick={async () => {
                  if (!onSetInvoiceHandle) return;
                  try {
                    const handle = await window.showDirectoryPicker();
                    onSetInvoiceHandle(handle);
                    toast.success("Invoice Folder Linked");
                  } catch (e) { console.log(e); }
                }}
                className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Set Folder
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Share Snapshot */}
      <section className="rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-900/10 px-6 py-5 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"><Share2 className="h-4 w-4" /></span>
            <span>Share Snapshot</span>
          </h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs"><input type="checkbox" checked={isShortenEnabled} onChange={(e) => setIsShortenEnabled(e.target.checked)} className="rounded" /> Shorten Link (TinyURL)</label>
            <button onClick={handleShareClick} disabled={isGeneratingLink} className="bg-white dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-3 py-1 rounded border border-indigo-200 dark:border-indigo-700 text-sm hover:bg-indigo-50">{isGeneratingLink ? '...' : 'Copy Link'}</button>
          </div>
        </div>
      </section>

      {/* 3. Business Data */}
      <section className="rounded-2xl border border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-950/10 px-6 py-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            <TrendingUp className="h-4 w-4" />
          </span>
          <span>Business Data</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button onClick={onOpenCustomers} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-gray-700 hover:shadow-md transition-all">
            <Users className="w-6 h-6 text-indigo-500" />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Customer Manager</span>
          </button>
          <button onClick={onOpenCogs} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-gray-700 hover:shadow-md transition-all">
            <DollarSign className="w-6 h-6 text-green-500" />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Cost of Goods (COGS)</span>
          </button>
          <button onClick={onOpenVendors} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-gray-700 hover:shadow-md transition-all">
            <Users className="w-6 h-6 text-amber-500" />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Vendor Manager</span>
          </button>
        </div>
      </section>

      {/* 4. Data & Image Management (BUTTONS FIXED FOR DARK MODE) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800/60 bg-white dark:bg-slate-950/60 px-6 py-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold mb-4 text-gray-900 dark:text-white"><FileText className="h-4 w-4" /> Data Management</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-slate-900/60 px-4 py-3">
              <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Data</p><p className="text-xs text-gray-500">Excludes images.</p></div>
              <button onClick={onExportData} className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-white border dark:border-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-600">Export</button>
            </div>
            <div className="flex justify-between items-center rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-slate-900/60 px-4 py-3">
              <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">Import File</p><p className="text-xs text-gray-500">Restore data.</p></div>
              <div className="relative">
                <button onClick={handleImportClick} className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-white border dark:border-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-600">Select</button>
                <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800/60 bg-white dark:bg-slate-950/60 px-6 py-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold mb-4 text-gray-900 dark:text-white"><ImageIcon className="h-4 w-4" /> Image Library</h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-slate-900/60 px-4 py-3">
              <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">Optimize</p><p className="text-xs text-gray-500">Resize all to 150px.</p></div>
              <button onClick={onOptimizeImages} className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-xs hover:bg-indigo-100">Run</button>
            </div>
            <div className="flex justify-between items-center rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-slate-900/60 px-4 py-3">
              <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Images</p><p className="text-xs text-gray-500">Backup images.</p></div>
              <button onClick={onExportImages} className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-white border dark:border-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-600">Export</button>
            </div>
          </div>
        </section>
      </div>

      {/* 5. Maintenance */}
      <section className="rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/10 px-6 py-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold mb-4 text-red-900 dark:text-red-200"><Trash2 className="h-4 w-4" /> Data Maintenance</h2>
        <div className="flex items-center justify-between gap-2">
          <select value={pruneMonths} onChange={(e) => setPruneMonths(Number(e.target.value))} className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 text-xs rounded px-2 py-1.5 dark:text-white"><option value={6}>Older than 6 Months</option><option value={12}>Older than 1 Year</option><option value={24}>Older than 2 Years</option></select>
          <button onClick={() => onPruneData && onPruneData(pruneMonths)} className="px-3 py-1.5 bg-white dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded text-xs hover:bg-red-50">Run Cleanup</button>
        </div>
        {onClearPartnerShipping && (
          <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800/30">
            <button onClick={onClearPartnerShipping} className="w-full px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded text-xs hover:bg-amber-200 flex items-center justify-center gap-2">
              <Truck className="w-3 h-3" /> Clear Partner Shipping Balance
            </button>
          </div>
        )}
      </section>

      {/* 6. Company Profile (Moved to Bottom, Added City/State/Zip) */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800/60 bg-white dark:bg-slate-950/60 px-6 py-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200">
            <Building className="h-4 w-4" />
          </span>
          <span>Company Profile (Invoice Settings)</span>
        </h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-32 flex-shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">Logo</label>
            <div className="h-32 w-32 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
              <ImageUploader currentImage={companyLogo} onUpload={(_, blob) => handleLogoUpload(blob)} className="h-full w-full object-contain" placeholder={<span className="text-xs text-gray-400 text-center px-2">Click to Upload</span>} />
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label><input type="text" value={myCompany?.name || ''} onChange={(e) => handleCompanyChange('name', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Contact</label><input type="text" value={myCompany?.contact || ''} onChange={(e) => handleCompanyChange('contact', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Email</label><input type="text" value={myCompany?.email || ''} onChange={(e) => handleCompanyChange('email', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Phone</label><input type="text" value={myCompany?.phone || ''} onChange={(e) => handleCompanyChange('phone', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Address Line 1</label><input type="text" value={myCompany?.address1 || ''} onChange={(e) => handleCompanyChange('address1', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Address Line 2</label><input type="text" value={myCompany?.address2 || ''} onChange={(e) => handleCompanyChange('address2', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>

            {/* NEW FIELDS: City, State, Zip */}
            <div><label className="block text-xs font-medium text-gray-500 mb-1">City</label><input type="text" value={myCompany?.city || ''} onChange={(e) => handleCompanyChange('city', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">State</label><input type="text" value={myCompany?.state || ''} onChange={(e) => handleCompanyChange('state', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Zip</label><input type="text" value={myCompany?.zip || ''} onChange={(e) => handleCompanyChange('zip', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default SettingsView;