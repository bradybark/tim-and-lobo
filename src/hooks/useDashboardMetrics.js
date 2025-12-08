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

  // 1. Planner Calculations
  const plannerData = useMemo(() => {
    const allSkus = new Set([
      ...snapshots.map(s => s.sku),
      ...pos.map(p => p.sku),
      ...settings.map(s => s.sku)
    ]);

    const snapshotsBySku = {};
    snapshots.forEach((s) => {
      if (!snapshotsBySku[s.sku]) snapshotsBySku[s.sku] = [];
      snapshotsBySku[s.sku].push(s);
    });

    const today = new Date();

    return Array.from(allSkus).sort().map((sku) => {
      // Sort Descending (Newest First)
      const skuSnaps = (snapshotsBySku[sku] || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      
      const currentSnap = skuSnaps[0]; // Always use the REAL current inventory
      const currentInv = currentSnap ? currentSnap.qty : 0;

      // --- NEW RATE CALCULATION LOGIC ---
      let dailyRate = 0;
      let usedPeriodLabel = "No Data";

      // We need at least 2 snapshots to calc a rate (Start -> End)
      if (skuSnaps.length >= 2) {
        let startSnap = skuSnaps[0]; // "End" of the period (Newest)
        let endSnap = skuSnaps[1];   // "Start" of the period (Oldest)

        // Determine which snapshots to compare based on user selection
        if (rateParams.timeframe === 'last-period') {
          // Default behavior: compare newest [0] vs second newest [1]
          startSnap = skuSnaps[0];
          endSnap = skuSnaps[1];
          usedPeriodLabel = "Last Period";
        } else {
          // Time-based averaging
          let targetDate = new Date();
          
          if (rateParams.timeframe === 'custom' && rateParams.customStart && rateParams.customEnd) {
            // For custom, we find the snapshots closest to the user's Start/End range
            // Note: We swap start/end in variable naming because "startSnap" in calc logic 
            // usually refers to the 'later' date in the formula (End of Period Inv), 
            // but let's stick to time: 
            // Period Start (Old) -> Period End (New)
            const pStart = new Date(rateParams.customStart);
            const pEnd = new Date(rateParams.customEnd);
            
            endSnap = findClosestSnapshot(skuSnaps, pStart); // Oldest
            startSnap = findClosestSnapshot(skuSnaps, pEnd); // Newest
            usedPeriodLabel = "Custom Range";
          } else {
            // Preset ranges (3m, 6m, 1y) relative to TODAY
            if (rateParams.timeframe === '3m') targetDate.setMonth(today.getMonth() - 3);
            if (rateParams.timeframe === '6m') targetDate.setMonth(today.getMonth() - 6);
            if (rateParams.timeframe === '1y') targetDate.setFullYear(today.getFullYear() - 1);
            
            // "endSnap" is the older one (Start of period)
            endSnap = findClosestSnapshot(skuSnaps, targetDate); 
            // "startSnap" is the current one (End of period)
            startSnap = skuSnaps[0]; 
            usedPeriodLabel = rateParams.timeframe;
          }
        }

        // Logic Check: Ensure we have two distinct snapshots and they are in correct time order
        if (startSnap && endSnap && startSnap.id !== endSnap.id) {
          // Ensure startSnap is the NEWER one
          if (new Date(endSnap.date) > new Date(startSnap.date)) {
            [startSnap, endSnap] = [endSnap, startSnap];
          }

          const prevDate = endSnap.date; // Old Date
          const currDate = startSnap.date; // New Date

          // Calculate Purchases specifically within this window
          const purchases = pos
            .filter(
              (p) =>
                p.sku === sku &&
                p.received &&
                p.receivedDate > prevDate &&
                p.receivedDate <= currDate
            )
            .reduce((sum, p) => sum + Number(p.qty || 0), 0);

          const daysInPeriod = getDaysDiff(prevDate, currDate);
          
          // Core Formula: (OldQty + Purchases - NewQty) = Sales
          const unitsSold = endSnap.qty + purchases - startSnap.qty;
          
          dailyRate = daysInPeriod > 0 ? Math.max(0, unitsSold / daysInPeriod) : 0;
        }
      }
      // ----------------------------------

      const onOrder = pos
        .filter((p) => p.sku === sku && !p.received)
        .reduce((sum, p) => sum + Number(p.qty || 0), 0);

      const s = settings.find((row) => row.sku === sku) || {
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
        usedPeriodLabel, // Exported for debugging if needed
      };
    })
    .sort((a, b) => {
      if (a.needsAction && !b.needsAction) return -1;
      if (!a.needsAction && b.needsAction) return 1;
      return a.sku.localeCompare(b.sku);
    });
  }, [snapshots, pos, settings, rateParams]);

  // 2. Lead Time Stats (Unchanged)
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