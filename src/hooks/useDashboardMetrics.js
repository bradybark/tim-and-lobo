// src/hooks/useDashboardMetrics.js
import { useMemo } from 'react';
import { getDaysDiff, addDays } from '../utils/date';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

export function useDashboardMetrics({ snapshots, pos, settings }) {
  // 1. Planner Calculations
  const plannerData = useMemo(() => {
    // FIX: Collect unique SKUs from ALL sources, not just snapshots
    const allSkus = new Set([
      ...snapshots.map(s => s.sku),
      ...pos.map(p => p.sku),
      ...settings.map(s => s.sku)
    ]);

    // Group snapshots for easy lookup
    const snapshotsBySku = {};
    snapshots.forEach((s) => {
      if (!snapshotsBySku[s.sku]) snapshotsBySku[s.sku] = [];
      snapshotsBySku[s.sku].push(s);
    });

    const today = new Date();

    return Array.from(allSkus)
      .sort() // Alphabetical sort
      .map((sku) => {
        // Safe access: Product might exist in POs but have no snapshots yet
        const skuSnaps = (snapshotsBySku[sku] || []).sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        
        const currentSnap = skuSnaps[0];
        // FIX: If no snapshot exists, assume 0 inventory
        const currentInv = currentSnap ? currentSnap.qty : 0;
        const prevSnap = skuSnaps[1];

        let dailyRate = 0;
        // Only calculate rate if we have at least 2 snapshots to compare
        if (currentSnap && prevSnap) {
          const prevDate = prevSnap.date;
          const purchases = pos
            .filter(
              (p) =>
                p.sku === sku &&
                p.received &&
                p.receivedDate > prevDate &&
                p.receivedDate <= currentSnap.date
            )
            .reduce((sum, p) => sum + Number(p.qty || 0), 0);

          const daysInPeriod = getDaysDiff(prevDate, currentSnap.date);
          const unitsSold = prevSnap.qty + purchases - currentSnap.qty;
          dailyRate = daysInPeriod > 0 ? Math.max(0, unitsSold / daysInPeriod) : 0;
        }

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
        
        // Logic check: If target is 0 (no rate), don't suggest negative reorder
        const reorderQty = Math.max(0, targetUnitLevel - (currentInv + onOrder));

        const daysUntilOrder = daysToZero - (leadTimeDays + minDays);
        const needsAction =
          daysToZero !== Infinity && // Only urgent if we are actually selling
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
        };
      })
      .sort((a, b) => {
        if (a.needsAction && !b.needsAction) return -1;
        if (!a.needsAction && b.needsAction) return 1;
        return a.sku.localeCompare(b.sku);
      });
  }, [snapshots, pos, settings]);

  // 2. Lead Time Stats
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