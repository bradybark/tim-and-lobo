import React from 'react';
import { DatabaseBackup, FileText, Monitor } from 'lucide-react';

const locations = [
  { key: 'browser', label: 'Browser', icon: Monitor, color: 'text-sky-700 dark:text-sky-300', description: 'PO saved in this browser' },
  { key: 'backup', label: 'JSON backup', icon: DatabaseBackup, color: 'text-emerald-700 dark:text-emerald-300', description: 'Matching PO in a verified JSON backup file' },
  { key: 'file', label: 'PO file', icon: FileText, color: 'text-violet-700 dark:text-violet-300', description: 'Printable PO written to the shared document folder' },
];

export function PurchaseOrderLocationKey() {
  return (
    <div aria-label="Save location key" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4 text-gray-600 dark:text-gray-300">
      {locations.map(({ key, label, icon: Icon, color, description }) => (
        <span key={key} title={description} className="inline-flex items-center gap-1">
          <Icon size={13} className={color} aria-hidden="true" />{label}
        </span>
      ))}
    </div>
  );
}

export function PurchaseOrderLocations({ browser, backups, file }) {
  const labels = {
    browser: browser && locations[0].description,
    backup: backups?.length && `Matching PO in ${backups.join(', ')}`,
    file: file && `Printable PO saved to ${file}`,
  };
  return (
    <td className="w-px whitespace-nowrap px-2 py-1">
      <div className="grid w-max grid-cols-[repeat(3,13px)] items-center gap-x-0.5">
        {locations.map(({ key, icon: Icon, color }, index) => labels[key] ? (
          <span key={key} role="img" aria-label={labels[key]} title={labels[key]} className={color} style={{ gridColumn: index + 1 }}>
            <Icon size={13} aria-hidden="true" />
          </span>
        ) : null)}
        {!browser && !backups?.length && !file && <span title="No confirmed save location" aria-label="No confirmed save location" className="text-xs text-gray-500">—</span>}
      </div>
    </td>
  );
}
