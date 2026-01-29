// src/hooks/useDashboardMetrics.js
import { useMemo } from 'react';
import { getDaysDiff, addDays } from '../utils/date';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

// Helper: Find the snapshot closest to a specific target date
const findClosestSnapshot = (snapshots, targetDate) => {
  if (!snapshots || snapshots.length === 0) return null;
  const target = new Date(targetDate).getTime();

  return snapshots.reduce((prev, curr) => {
    const prevDiff = Math.abs(new Date(prev.date).getTime() - target);
    const currDiff = Math.abs(new Date(curr.date).getTime() - target);
    return currDiff < prevDiff ? curr : prev;
  });
};

export function useDashboardMetrics({ snapshots, pos, settings, rateParams }) {
  // rateParams = { timeframe: 'last-period' | '3m' | '6m' | '1y' | 'custom', customStart, customEnd }

  // 1. Planner Calculations (Optimized)
  const plannerData = useMemo(() => {
    // Normalize POS: Handle both flat (legacy) and document-based (new) PO structures
    const normalizedPos = pos.flatMap(p => {
      if (p.items && Array.isArray(p.items)) {
        // New Document Structure
        const isReceived = p.status === 'Received' || p.status === 'Paid';
        return p.items.map(item => ({
          ...item,
          id: item.id || `${p.id}-${item.sku}`, // Ensure unique ID
          poId: p.id,
          orderDate: p.orderDate,
          received: isReceived,
          receivedDate: p.receivedDate, // Needs to be captured in PO doc
          eta: p.eta, // Capture ETA in PO doc if needed
          vendor: p.vendorId // or resolve name if needed
        }));
      }
      return p;
    });

    // A. Pre-group data by SKU (O(N))
    const snapshotsBySku = {};
    snapshots.forEach((s) => {
      if (!snapshotsBySku[s.sku]) snapshotsBySku[s.sku] = [];
      snapshotsBySku[s.sku].push(s);
    });

    const posBySku = {};
    normalizedPos.forEach((p) => {
      if (!posBySku[p.sku]) posBySku[p.sku] = [];
      posBySku[p.sku].push(p);
    });

    const settingsBySku = {};
    settings.forEach((s) => {
      settingsBySku[s.sku] = s;
    });

    const allSkus = new Set([
      ...Object.keys(snapshotsBySku),
      ...Object.keys(posBySku),
      ...Object.keys(settingsBySku)
    ]);

    const today = new Date();

    // B. Calculate metrics per SKU (O(1) lookup inside loop)
    return Array.from(allSkus).sort().map((sku) => {
      const skuSnaps = (snapshotsBySku[sku] || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      const skuPos = posBySku[sku] || [];

      const currentSnap = skuSnaps[0];
      const currentInv = currentSnap ? currentSnap.qty : 0;

      // --- RATE CALCULATION LOGIC ---
      let dailyRate = 0;
      let usedPeriodLabel = "No Data";

      if (skuSnaps.length >= 2) {
        let startSnap = skuSnaps[0]; // Newest
        let endSnap = skuSnaps[1];   // Oldest

        if (rateParams.timeframe === 'last-period') {
          startSnap = skuSnaps[0];
          endSnap = skuSnaps[1];
          usedPeriodLabel = "Last Period";
        } else {
          let targetDate = new Date();
          if (rateParams.timeframe === 'custom' && rateParams.customStart && rateParams.customEnd) {
            const pStart = new Date(rateParams.customStart);
            const pEnd = new Date(rateParams.customEnd);
            endSnap = findClosestSnapshot(skuSnaps, pStart);
            startSnap = findClosestSnapshot(skuSnaps, pEnd);
            usedPeriodLabel = "Custom Range";
          } else {
            if (rateParams.timeframe === '3m') targetDate.setMonth(today.getMonth() - 3);
            if (rateParams.timeframe === '6m') targetDate.setMonth(today.getMonth() - 6);
            if (rateParams.timeframe === '1y') targetDate.setFullYear(today.getFullYear() - 1);
            endSnap = findClosestSnapshot(skuSnaps, targetDate);
            startSnap = skuSnaps[0];
            usedPeriodLabel = rateParams.timeframe;
          }
        }

        if (startSnap && endSnap && startSnap.id !== endSnap.id) {
          if (new Date(endSnap.date) > new Date(startSnap.date)) {
            [startSnap, endSnap] = [endSnap, startSnap];
          }

          const prevDate = endSnap.date;
          const currDate = startSnap.date;

          // Optimization: Use pre-filtered skuPos
          const purchases = skuPos
            .filter(
              (p) =>
                p.received &&
                p.receivedDate > prevDate &&
                p.receivedDate <= currDate
            )
            .reduce((sum, p) => sum + Number(p.qty || 0), 0);

          const daysInPeriod = getDaysDiff(prevDate, currDate);
          const unitsSold = endSnap.qty + purchases - startSnap.qty;
          dailyRate = daysInPeriod > 0 ? Math.max(0, unitsSold / daysInPeriod) : 0;
        }
      }

      // Optimization: Use pre-filtered skuPos
      const onOrder = skuPos
        .filter((p) => !p.received)
        .reduce((sum, p) => sum + Number(p.qty || 0), 0);

      const s = settingsBySku[sku] || {
        sku,
        leadTime: 90,
        minDays: 60,
        targetMonths: 6,
      };

      const leadTimeDays = Number(s.leadTime) || 0;
      const minDays = Number(s.minDays) || 0;
      const targetMonths = Number(s.targetMonths) || 0;
      const targetDays = targetMonths * 30;

      const daysToZero = dailyRate > 0 ? currentInv / dailyRate : Infinity;
      const zeroDate = dailyRate > 0 ? addDays(today, Math.round(daysToZero)) : null;

      const reorderTriggerLevel = dailyRate * (leadTimeDays + minDays);
      const targetUnitLevel = dailyRate * (leadTimeDays + minDays + targetDays);
      const reorderQty = Math.max(0, targetUnitLevel - (currentInv + onOrder));

      const daysUntilOrder = daysToZero - (leadTimeDays + minDays);
      const needsAction =
        daysToZero !== Infinity &&
        (daysUntilOrder <= 0 || currentInv <= reorderTriggerLevel);

      const suggestOrderDate =
        !Number.isFinite(daysUntilOrder) || daysUntilOrder <= 0
          ? today
          : addDays(today, Math.floor(daysUntilOrder));

      return {
        sku,
        currentInv,
        dailyRate,
        daysRemaining: daysToZero,
        settings: s,
        reorderTriggerLevel,
        targetUnitLevel,
        onOrder,
        reorderQty,
        zeroDate,
        suggestOrderDate,
        needsAction,
        usedPeriodLabel,
      };
    })
      .sort((a, b) => {
        if (a.needsAction && !b.needsAction) return -1;
        if (!a.needsAction && b.needsAction) return 1;
        return a.sku.localeCompare(b.sku);
      });
  }, [snapshots, pos, settings, rateParams]);

  // 2. Lead Time Stats (Unchanged logic, just ensure consistency)
  const leadTimeStats = useMemo(() => {
    const received = pos.filter(
      (p) => p.received && p.orderDate && p.receivedDate
    );

    if (!received.length) return null;

    const bySku = {};
    let totalVariance = 0;
    let countVariance = 0;
    let onTimeCount = 0;

    received.forEach((p) => {
      const actualLead = getDaysDiff(p.orderDate, p.receivedDate);
      let varianceEta = null;
      if (p.eta) {
        const etaDate = new Date(p.eta);
        const receivedDate = new Date(p.receivedDate);
        if (!Number.isNaN(etaDate.getTime()) && !Number.isNaN(receivedDate.getTime())) {
          varianceEta = (receivedDate - etaDate) / MILLIS_PER_DAY;
        }
      }

      if (!bySku[p.sku]) {
        bySku[p.sku] = {
          sku: p.sku,
          totalActual: 0,
          countActual: 0,
          totalVarianceEta: 0,
          countVarianceEta: 0,
        };
      }

      const skuEntry = bySku[p.sku];
      if (Number.isFinite(actualLead)) {
        skuEntry.totalActual += actualLead;
        skuEntry.countActual += 1;
      }
      if (varianceEta != null && Number.isFinite(varianceEta)) {
        skuEntry.totalVarianceEta += varianceEta;
        skuEntry.countVarianceEta += 1;
        totalVariance += varianceEta;
        countVariance += 1;
        if (varianceEta <= 0) onTimeCount += 1;
      }
    });

    const rows = Object.values(bySku)
      .map((entry) => ({
        sku: entry.sku,
        avgActualLeadTime:
          entry.countActual > 0 ? entry.totalActual / entry.countActual : null,
        avgVarianceEta:
          entry.countVarianceEta > 0
            ? entry.totalVarianceEta / entry.countVarianceEta
            : null,
      }))
      .sort((a, b) => a.sku.localeCompare(b.sku));

    return {
      totalPOs: pos.length,
      evaluatedPOs: received.length,
      avgVariance: countVariance > 0 ? totalVariance / countVariance : null,
      onTimePct: countVariance > 0 ? (onTimeCount / countVariance) * 100 : null,
      rows,
    };
  }, [pos]);

  return { plannerData, leadTimeStats };
}