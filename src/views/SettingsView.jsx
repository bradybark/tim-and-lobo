// src/views/SettingsView.jsx
import React, { useRef, useState } from 'react';
import {
  UploadCloud, Download, FileText, Users, Trash2, Image as ImageIcon, Share2,
  DollarSign, TrendingUp, Building, Truck, Database, Briefcase, Shield, Clock, FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploader } from '../components/ImageUploader';
import { useInventory } from '../context/InventoryContext';
import {
  getDocumentStorageRootName,
  getOrganizationDocumentStoragePath,
  initializeDocumentStorageRoot,
  isDocumentStorageRootName,
} from '../utils/documentStorage';

const SETTINGS_SECTIONS = [
  { id: 'sync', label: 'Sync & Backup', icon: UploadCloud },
  { id: 'sharing', label: 'Sharing', icon: Share2 },
  { id: 'business', label: 'Business Data', icon: Briefcase },
  { id: 'data', label: 'Data Management', icon: Database },
  { id: 'maintenance', label: 'Maintenance', icon: Shield },
  { id: 'company', label: 'Company Profile', icon: Building },
];

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
  documentStorageRootHandle,
  onSetDocumentStorageRoot,
  autoBackupEnabled,
  onToggleAutoBackup,
  lastAutoBackupTime,
  autoBackupFolderHandle,
  onSetAutoBackupFolder
}) => {
  const {
    orgKey,
    myCompany,
    setMyCompany,
    companyLogo,
    handleLogoUpload,
    companyProfileStorageStatus,
    documentStorageLocationLabel,
    updateDocumentStorageLocationLabel,
  } = useInventory();
  const fileInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState('sync');
  const [pruneMonths, setPruneMonths] = useState(12);
  const [isShortenEnabled, setIsShortenEnabled] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [documentStorageLocationDraft, setDocumentStorageLocationDraft] = useState(documentStorageLocationLabel || '');
  const rootNeedsReconnect = companyProfileStorageStatus === 'reconnect-required';
  const rootConnectionLabel = !documentStorageRootHandle
    ? 'Not connected'
    : rootNeedsReconnect
      ? 'Reconnect required'
      : 'Connected';

  const handleImportClick = () => { if (!onImportBackup) return; if (fileInputRef.current) fileInputRef.current.click(); };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !onImportBackup) return;
    const reader = new FileReader();
    reader.onload = () => { try { const json = JSON.parse(reader.result); onImportBackup(json, { forceOverwrite: true }); } catch (err) { console.error(err); toast.error('Invalid JSON'); } };
    reader.readAsText(file);
    e.target.value = '';
  };
  const handleShareClick = async () => { setIsGeneratingLink(true); await onCreateShareLink(isShortenEnabled); setIsGeneratingLink(false); }

  const handleCompanyChange = (field, value) => {
    setMyCompany(prev => ({ ...prev, [field]: value }));
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'sync':
        return (
          <div className="space-y-6">
            {/* Cloud Sync */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cloud Sync (Live)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Syncs your full database (including images) to a local file for cloud backup.
              </p>
              <button type="button" onClick={onLinkCloudFile} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 dark:hover:bg-indigo-500/90">
                <UploadCloud className="h-4 w-4" /> <span>Link to Database File</span>
              </button>
              {cloudStatus && <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{cloudStatus}</p>}
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Permanent Document Storage */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Permanent Document Storage</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connect the single <span className="font-mono">document-storage</span> folder that holds the permanent records for both organizations. Company profiles, uploaded PDFs, and generated document sources are routed automatically.
              </p>
              <div className="space-y-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-slate-900/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <FolderOpen className="h-5 w-5 shrink-0 text-indigo-500" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Shared root folder</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${documentStorageRootHandle && !rootNeedsReconnect
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          {rootConnectionLabel}
                        </span>
                      </div>
                      <p className="mt-1 break-all text-xs font-mono text-gray-600 dark:text-gray-300">
                        {documentStorageRootHandle ? documentStorageRootHandle.name : 'No folder selected'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!onSetDocumentStorageRoot) return;
                      if (!window.showDirectoryPicker) {
                        toast.error('Use Chrome or Edge to connect document-storage.');
                        return;
                      }
                      try {
                        const handle = await window.showDirectoryPicker({
                          id: 'tim-and-lobo-document-storage',
                          mode: 'readwrite',
                        });
                        if (!isDocumentStorageRootName(handle.name)) {
                          toast.error(`Select the folder named ${getDocumentStorageRootName()}.`);
                          return;
                        }
                        await initializeDocumentStorageRoot(handle);
                        await onSetDocumentStorageRoot(handle);
                        toast.success('Shared document-storage root connected');
                      } catch (error) {
                        if (error?.name !== 'AbortError') {
                          console.error(error);
                          toast.error(error?.message || 'Could not connect document-storage.');
                        }
                      }
                    }}
                    className="shrink-0 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    {documentStorageRootHandle ? 'Reconnect' : 'Connect Root'}
                  </button>
                </div>

                {documentStorageRootHandle && (
                  <div className="rounded-lg border border-gray-200 bg-white/70 px-3 py-2 dark:border-gray-700 dark:bg-black/20">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">This organization saves under</p>
                    <p className="mt-1 break-all text-xs font-mono text-gray-800 dark:text-gray-200">
                      {getOrganizationDocumentStoragePath(documentStorageRootHandle, orgKey)}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="document-storage-location-label" className="block text-xs font-medium text-gray-800 dark:text-gray-200">
                    OneDrive location label
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="document-storage-location-label"
                      type="text"
                      value={documentStorageLocationDraft}
                      onChange={(event) => setDocumentStorageLocationDraft(event.target.value)}
                      placeholder="OneDrive > Surplus Tools > Tim and Lobo Business Documents > document-storage"
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!updateDocumentStorageLocationLabel) return;
                        await updateDocumentStorageLocationLabel(documentStorageLocationDraft);
                        toast.success('Document-storage location label saved');
                      }}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                    >
                      Save label
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                    Browsers do not reveal a folder's full Windows path. Save a label here so you can identify the connected OneDrive location.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Auto-Backup Toggle */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Auto-Backup (Every 30 min)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatically downloads a backup file to your Downloads folder every 30 minutes while the app is open.
              </p>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Periodic Auto-Backup</p>
                    {lastAutoBackupTime && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Last backup: {lastAutoBackupTime}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onToggleAutoBackup && onToggleAutoBackup(!autoBackupEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoBackupEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoBackupEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                </button>
              </div>
              {/* Folder Picker */}
              <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-slate-900/40">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Backup Folder</h4>
                <p className="text-xs text-gray-500 mb-3">Choose where auto-backups are saved. If no folder is set, backups download to your Downloads folder.</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono bg-white dark:bg-black/20 px-2 py-1 rounded text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                    {autoBackupFolderHandle ? autoBackupFolderHandle.name : 'Not set (Downloads)'}
                  </span>
                  <button
                    onClick={onSetAutoBackupFolder}
                    className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Set Folder
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'sharing':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Share Snapshot</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Generate a read-only URL link of your current dashboard state to share with others.
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={isShortenEnabled} onChange={(e) => setIsShortenEnabled(e.target.checked)} className="rounded" />
                Shorten Link (TinyURL)
              </label>
              <button onClick={handleShareClick} disabled={isGeneratingLink} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {isGeneratingLink ? 'Generating...' : 'Copy Share Link'}
              </button>
            </div>
          </div>
        );

      case 'business':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Business Data</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage your customers, vendors, and cost of goods data.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={onOpenCustomers} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                <Users className="w-6 h-6 text-indigo-500" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Customer Manager</span>
              </button>
              <button onClick={onOpenCogs} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                <DollarSign className="w-6 h-6 text-green-500" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Cost of Goods (COGS)</span>
              </button>
              <button onClick={onOpenVendors} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                <Users className="w-6 h-6 text-amber-500" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Vendor Manager</span>
              </button>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            {/* Data Management */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Data Management</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/60 px-4 py-3">
                  <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Data</p><p className="text-xs text-gray-500">Download JSON (excludes images).</p></div>
                  <button onClick={onExportData} className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-white border dark:border-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-600">Export</button>
                </div>
                <div className="flex justify-between items-center rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/60 px-4 py-3">
                  <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">Import File</p><p className="text-xs text-gray-500">Restore from backup.</p></div>
                  <div className="relative">
                    <button onClick={handleImportClick} className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-white border dark:border-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-600">Select</button>
                    <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Image Library */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Image Library</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/60 px-4 py-3">
                  <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">Optimize</p><p className="text-xs text-gray-500">Resize all images to 150px.</p></div>
                  <button onClick={onOptimizeImages} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60">Run</button>
                </div>
                <div className="flex justify-between items-center rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/60 px-4 py-3">
                  <div><p className="text-sm font-medium text-gray-900 dark:text-gray-100">Export Images</p><p className="text-xs text-gray-500">Backup all SKU images.</p></div>
                  <button onClick={onExportImages} className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-white border dark:border-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-600">Export</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'maintenance':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Data Maintenance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Clean up old data to improve performance.
            </p>

            <div className="p-4 rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-200">Prune Old Data</p>
                  <p className="text-xs text-red-700 dark:text-red-400">Permanently delete old snapshots and POs.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={pruneMonths} onChange={(e) => setPruneMonths(Number(e.target.value))} className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 text-xs rounded px-2 py-1.5 dark:text-white">
                    <option value={6}>Older than 6 Months</option>
                    <option value={12}>Older than 1 Year</option>
                    <option value={24}>Older than 2 Years</option>
                  </select>
                  <button onClick={() => onPruneData && onPruneData(pruneMonths)} className="px-3 py-1.5 bg-white dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded text-xs hover:bg-red-50 dark:hover:bg-red-900/60">Run</button>
                </div>
              </div>
            </div>

            {onClearPartnerShipping && (
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Clear Partner Shipping Balance</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">Reset the shipping balance counter.</p>
                  </div>
                  <button onClick={onClearPartnerShipping} className="px-3 py-1.5 bg-white dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded text-xs hover:bg-amber-100 dark:hover:bg-amber-900/60 flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'company':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Company Profile</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This information appears on generated invoices and POs.
            </p>
            <p className={`text-xs ${companyProfileStorageStatus === 'saved'
              ? 'text-emerald-600 dark:text-emerald-400'
              : companyProfileStorageStatus === 'saving'
                ? 'text-indigo-600 dark:text-indigo-400'
                : companyProfileStorageStatus === 'reconnect-required' || companyProfileStorageStatus === 'error'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
              {companyProfileStorageStatus === 'saved' && 'Saved permanently to document-storage.'}
              {companyProfileStorageStatus === 'saving' && 'Saving company profile to document-storage…'}
              {companyProfileStorageStatus === 'reconnect-required' && 'Reconnect document-storage in Sync & Backup to restore permanent saving.'}
              {companyProfileStorageStatus === 'error' && 'Permanent company-profile save failed. Check the connected root.'}
              {companyProfileStorageStatus === 'browser-only' && 'Currently stored in this browser. Connect document-storage for permanent saving.'}
            </p>

            <div className="flex flex-col md:flex-row gap-6 pt-2">
              <div className="w-32 flex-shrink-0">
                <label className="block text-xs font-medium text-gray-500 mb-1">Logo</label>
                <div className="h-32 w-32 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
                  <ImageUploader preserveOriginal currentImage={companyLogo} onUpload={(_, blob) => handleLogoUpload(blob)} className="h-full w-full object-contain" placeholder={<span className="text-xs text-gray-400 text-center px-2">Click to Upload</span>} />
                </div>
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label><input type="text" value={myCompany?.name || ''} onChange={(e) => handleCompanyChange('name', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Contact</label><input type="text" value={myCompany?.contact || ''} onChange={(e) => handleCompanyChange('contact', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Email</label><input type="text" value={myCompany?.email || ''} onChange={(e) => handleCompanyChange('email', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Phone</label><input type="text" value={myCompany?.phone || ''} onChange={(e) => handleCompanyChange('phone', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Address Line 1</label><input type="text" value={myCompany?.address1 || ''} onChange={(e) => handleCompanyChange('address1', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
                <div className="md:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">Address Line 2</label><input type="text" value={myCompany?.address2 || ''} onChange={(e) => handleCompanyChange('address2', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">City</label><input type="text" value={myCompany?.city || ''} onChange={(e) => handleCompanyChange('city', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">State</label><input type="text" value={myCompany?.state || ''} onChange={(e) => handleCompanyChange('state', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Zip</label><input type="text" value={myCompany?.zip || ''} onChange={(e) => handleCompanyChange('zip', e.target.value)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm" /></div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar - hidden on mobile, shown on lg+ */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <nav className="sticky top-6 space-y-1">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                {section.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile tabs - shown on mobile, hidden on lg+ */}
      <div className="lg:hidden overflow-x-auto -mx-6 px-6">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl min-w-max">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isActive
                  ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <main className="flex-1 min-w-0">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-950/60 p-6 shadow-sm">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default SettingsView;
