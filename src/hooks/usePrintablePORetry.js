import { useEffect, useRef, useState } from 'react';
import { hasDocumentStoragePermission } from '../utils/documentStorage';
import { attachFiledPOs, ensurePrintablePO, isPrintableOrder } from '../utils/filePurchaseOrder';
import { printablePOPath } from '../utils/purchaseOrderLocations';

async function waitForFolder(operation) {
  let timeout;
  try {
    return await Promise.race([operation, new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Shared folder did not respond')), 20000);
    })]);
  } finally {
    clearTimeout(timeout);
  }
}

// The committed PO list is the durable queue, including orders made offline.
export function usePrintablePORetry({ enabled, root, folderStatus, pos, updatePOs, vendors, myCompany, companyLogo }) {
  const latest = useRef(null);
  const wake = useRef(null);
  const [filing, setFiling] = useState(false);
  useEffect(() => {
    latest.current = { pos, updatePOs, vendors, myCompany, companyLogo };
    wake.current?.();
  }, [pos, updatePOs, vendors, myCompany, companyLogo]);

  useEffect(() => {
    if (!enabled || !root) return;
    let active = true;
    let running = false;
    let requested = false;
    let timer;
    const checked = new Map();
    const failed = new Set();

    async function run() {
      if (!active || running) return;
      running = true;
      requested = false;
      try {
        if (!await waitForFolder(hasDocumentStoragePermission(root, 'readwrite')) || !active) return;
        const snapshot = latest.current;
        const completed = new Map();
        for (const order of snapshot.pos) {
          if (!active) return;
          if (!isPrintableOrder(order) || failed.has(order.id)) continue;
          const path = printablePOPath(order);
          if (path && checked.get(order.id) === path) continue;
          try {
            const work = lock => lock && active ? ensurePrintablePO(root, order, snapshot) : null;
            if (!path) setFiling(true);
            // Keep the per-order lock until the underlying write settles, even on timeout.
            const operation = navigator.locks
              ? navigator.locks.request('timothy-printable-' + order.id, { ifAvailable: true }, work)
              : work(true);
            const reference = await waitForFolder(operation);
            if (active && reference) {
              checked.set(order.id, reference.relativePath);
              if (reference !== order.generatedPOStorage) completed.set(order.id, { order, reference });
            }
          } catch (error) {
            failed.add(order.id);
            console.warn('Printable PO pending:', order.poNumber, error);
          }
        }
        if (active && completed.size) await snapshot.updatePOs(current => attachFiledPOs(current, completed));
      } catch (error) {
        console.warn('Printable PO filing will retry', error);
      } finally {
        running = false;
        if (active) {
          setFiling(false);
          if (requested) schedule();
        }
      }
    }
    function schedule() {
      requested = true;
      clearTimeout(timer);
      timer = setTimeout(run, 250);
    }
    function retry() {
      failed.clear();
      schedule();
    }
    function reconnected() {
      checked.clear();
      retry();
    }
    wake.current = schedule;
    schedule();
    window.addEventListener('online', reconnected);
    window.addEventListener('focus', retry);
    const interval = setInterval(retry, 60000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('online', reconnected);
      window.removeEventListener('focus', retry);
      wake.current = null;
      setFiling(false);
    };
  }, [enabled, root, folderStatus]);
  return filing;
}
