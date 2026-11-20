import React from 'react';
import { DatabaseBackup, FileText, Monitor, Receipt } from 'lucide-react';

const purchaseLocations = [
  { key: 'browser', label: 'Browser', icon: Monitor, color: 'text-sky-700 dark:text-sky-300', description: 'PO saved in this browser' },
  { key: 'backup', label: 'JSON backup', icon: DatabaseBackup, color: 'text-emerald-700 dark:text-emerald-300', description: 'Matching PO in a verified JSON backup file' },
  { key: 'file', label: 'PO file', icon: FileText, color: 'text-violet-700 dark:text-violet-300', description: 'Printable PO written to the shared document folder' },
];

const outgoingLocations = [
  { ...purchaseLocations[0], description: 'Order saved in this browser' },
  { ...purchaseLocations[1], description: 'Matching order in a verified JSON backup file' },
  { ...purchaseLocations[2], label: 'PO file', description: 'Uploaded customer PO saved in the shared document folder' },
  { key: 'invoice', label: 'Invoice file', icon: Receipt, color: 'text-amber-700 dark:text-amber-300', description: 'Uploaded invoice saved in the shared document folder' },
];

export function OrderLocationKey({ outgoing = false }) {
  const locations = outgoing ? outgoingLocations : purchaseLocations;
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

export function OrderLocations({ outgoing = false, browser, backups, file, invoice }) {
  const locations = outgoing ? outgoingLocations : purchaseLocations;
  const labels = {
    browser: browser && locations[0].description,
    backup: backups?.length && `Matching ${outgoing ? 'order' : 'PO'} in ${backups.join(', ')}`,
    file: file && `${outgoing ? 'Customer PO' : 'Printable PO'} saved to ${file}`,
    invoice: invoice && `Invoice saved to ${invoice}`,
  };
  return (
    <td className="w-px whitespace-nowrap px-2 py-1">
      <div className="grid w-max items-center gap-x-0.5" style={{ gridTemplateColumns: `repeat(${locations.length}, 13px)` }}>
        {locations.map(({ key, icon: Icon, color }, index) => labels[key] ? (
          <span key={key} role="img" aria-label={labels[key]} title={labels[key]} className={color} style={{ gridColumn: index + 1 }}>
            <Icon size={13} aria-hidden="true" />
          </span>
        ) : null)}
        {!browser && !backups?.length && !file && !invoice && <span title="No confirmed save location" aria-label="No confirmed save location" className="text-xs text-gray-500">—</span>}
      </div>
    </td>
  );
}
