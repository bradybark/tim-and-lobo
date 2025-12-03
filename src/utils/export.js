// src/utils/export.js
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toIsoDate, getDaysDiff } from './date';

const addSheetFromRows = (workbook, sheetName, rows) => {
  const sheet = workbook.addWorksheet(sheetName);
  if (!rows.length) return sheet;

  const headers = Object.keys(rows[0]);
  sheet.addRow(headers);
  rows.forEach((row) => {
    sheet.addRow(headers.map((h) => row[h]));
  });

  sheet.columns.forEach((col) => {
    let maxLength = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value ? String(cell.value) : '';
      maxLength = Math.max(maxLength, val.length);
    });
    col.width = maxLength + 2;
  });

  return sheet;
};

// Helper: Transform raw data for Planner sheet
const buildPlannerRows = (plannerData) =>
  plannerData.map((row) => ({
    SKU: row.sku,
    'Current Inventory': row.currentInv,
    'Daily Rate': Number(row.dailyRate.toFixed(2)),
    'Days Remaining':
      row.daysRemaining === Infinity ? '' : Number(row.daysRemaining.toFixed(0)),
    'Lead Time Days': row.settings.leadTime,
    'Min Inventory Days': row.settings.minDays,
    'Target Months': row.settings.targetMonths,
    'Reorder Trigger Qty': Math.round(row.reorderTriggerLevel),
    'Target Qty': Math.round(row.targetUnitLevel),
    'On Order': row.onOrder,
    'Reorder Qty': Math.ceil(row.reorderQty),
    'Suggested Order Date': toIsoDate(row.suggestOrderDate),
    'Forecast Zero Date': toIsoDate(row.zeroDate),
  }));

// Helper: Transform raw data for Inventory Log
const buildInventoryExportRows = (snapshots, pos) => {
  const snapshotsBySku = {};
  snapshots.forEach((s) => {
    if (!snapshotsBySku[s.sku]) snapshotsBySku[s.sku] = [];
    snapshotsBySku[s.sku].push(s);
  });

  let rows = [];
  Object.keys(snapshotsBySku).forEach((sku) => {
    const skusSnaps = snapshotsBySku[sku].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    skusSnaps.forEach((snap, index) => {
      let prevDate = null;
      let prevQty = null;
      let purchases = 0;
      let daysInPeriod = null;
      let unitsSold = null;
      let dailyRate = null;

      if (index < skusSnaps.length - 1) {
        const prevSnap = skusSnaps[index + 1];
        prevDate = prevSnap.date;
        prevQty = prevSnap.qty;

        purchases = pos
          .filter(
            (p) =>
              p.sku === sku &&
              p.received &&
              p.receivedDate > prevDate &&
              p.receivedDate <= snap.date
          )
          .reduce((sum, p) => sum + Number(p.qty || 0), 0);

        daysInPeriod = getDaysDiff(prevDate, snap.date);
        unitsSold = prevQty + purchases - snap.qty;
        dailyRate = daysInPeriod > 0 ? unitsSold / daysInPeriod : 0;
      }

      rows.push({
        Date: toIsoDate(snap.date),
        SKU: sku,
        'Ending Qty': snap.qty,
        Purchases: purchases || '',
        'Prev Date': prevDate ? toIsoDate(prevDate) : '',
        'Prev Qty': prevQty ?? '',
        'Days in Period': daysInPeriod ?? '',
        'Units Sold': unitsSold ?? '',
        'Daily Rate': typeof dailyRate === 'number' ? dailyRate : '',
      });
    });
  });

  return rows.sort((a, b) => new Date(b.Date) - new Date(a.Date));
};

const buildPORows = (pos) =>
  [...pos]
    .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
    .map((p) => ({
      'PO #': p.poNumber,
      SKU: p.sku,
      Vendor: p.vendor || '',
      'Order Date': toIsoDate(p.orderDate),
      Qty: p.qty,
      ETA: toIsoDate(p.eta),
      Received: p.received ? 'Yes' : 'No',
      'Received Date': toIsoDate(p.receivedDate),
    }));

export const exportPlannerExcel = async (plannerData, fileName) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const rows = buildPlannerRows(plannerData);
    addSheetFromRows(workbook, 'Reorder Planner', rows);
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
  } catch (err) {
    console.error('Export Error:', err);
  }
};

export const exportFullWorkbook = async ({ plannerData, snapshots, pos }, fileName) => {
  try {
    const workbook = new ExcelJS.Workbook();
    addSheetFromRows(workbook, 'Reorder Planner', buildPlannerRows(plannerData));
    addSheetFromRows(workbook, 'Inventory Log', buildInventoryExportRows(snapshots, pos));
    addSheetFromRows(workbook, 'Purchase Orders', buildPORows(pos));
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
  } catch (err) {
    console.error('Export Error:', err);
  }
};

export const exportLeadTimeReport = async ({ pos, settings }, fileName) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Lead Time Variance');
    sheet.addRow([
      'PO #', 'SKU', 'Vendor', 'Order Date', 'ETA', 'Received Date',
      'Planned Lead Time (days)', 'Actual Lead Time (days)', 'Variance (Actual - Planned)'
    ]);

    pos.filter((p) => p.received && p.orderDate && p.receivedDate).forEach((p) => {
      const setting = settings.find((s) => s.sku === p.sku);
      const planned = setting ? Number(setting.leadTime) || null : null;
      const actual = getDaysDiff(p.orderDate, p.receivedDate);
      const variance = planned != null && Number.isFinite(planned) ? actual - planned : null;
      sheet.addRow([
        p.poNumber, p.sku, p.vendor || '', toIsoDate(p.orderDate),
        toIsoDate(p.eta), toIsoDate(p.receivedDate), planned, actual, variance
      ]);
    });
    
    // Auto-width columns
    sheet.columns.forEach((col) => {
        let maxLength = 10;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const val = cell.value ? String(cell.value) : '';
          maxLength = Math.max(maxLength, val.length);
        });
        col.width = maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
  } catch (err) {
    console.error('Export Error:', err);
  }
};

export const exportJsonBackup = (data, fileName) => {
  try {
    const json = JSON.stringify(data, null, 2);
    saveAs(new Blob([json], { type: 'application/json' }), fileName);
  } catch (err) {
    console.error('Backup Error:', err);
  }
};