// src/components/SalesTrendReport.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Calendar, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getDaysDiff } from '../utils/date';

const TIME_RANGES = [
  { label: 'Last 3 Months', value: '3m' },
  { label: 'Last 6 Months', value: '6m' },
  { label: 'Last 1 Year', value: '1y' },
  { label: 'Custom Range', value: 'custom' },
];

export function SalesTrendReport({ snapshots, pos }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState('');
  // FIXED: Corrected typo 'XH' to 'setTimeframe' so the onChange handler works
  const [timeframe, setTimeframe] = useState('3m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Extract unique SKUs
  const uniqueSkus = useMemo(() => {
    const skus = new Set(snapshots.map((s) => s.sku));
    return Array.from(skus).sort();
  }, [snapshots]);

  // Set default SKU if not selected
  // FIXED: Changed useMemo to useEffect for setting state side-effect
  useEffect(() => {
    if (!selectedSku && uniqueSkus.length > 0) {
      setSelectedSku(uniqueSkus[0]);
    }
  }, [uniqueSkus, selectedSku]);

  // Calculate Data Points
  const chartData = useMemo(() => {
    if (!selectedSku) return [];

    // Filter snapshots for SKU and sort by Date Descending (Newest first)
    const skuSnaps = snapshots
      .filter((s) => s.sku === selectedSku)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const points = [];

    // Iterate backwards to calculate periods (InventoryLogView logic)
    for (let i = 0; i < skuSnaps.length - 1; i++) {
      const currentSnap = skuSnaps[i]; // End of period
      const prevSnap = skuSnaps[i + 1]; // Start of period

      const prevDate = prevSnap.date;
      const currentDate = currentSnap.date;

      // Calculate purchases in this window
      const purchases = pos
        .filter(
          (p) =>
            p.sku === selectedSku &&
            p.received &&
            p.receivedDate > prevDate &&
            p.receivedDate <= currentDate
        )
        .reduce((sum, p) => sum + Number(p.qty || 0), 0);

      const daysInPeriod = getDaysDiff(prevDate, currentDate);
      const unitsSold = prevSnap.qty + purchases - currentSnap.qty;
      const dailyRate = daysInPeriod > 0 ? unitsSold / daysInPeriod : 0;

      points.push({
        date: currentDate, // Plot at the end date of the period
        unitsSold,
        dailyRate,
        daysInPeriod,
      });
    }

    return points.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort Ascending for Graph
  }, [snapshots, pos, selectedSku]);

  // Filter Data by Timeframe
  const filteredData = useMemo(() => {
    if (!chartData.length) return [];

    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (timeframe === 'custom') {
      if (!customStart || !customEnd) return chartData; // Show all if incomplete
      start = new Date(customStart);
      end = new Date(customEnd);
      // Adjust end to include the full day
      end.setHours(23, 59, 59, 999);
    } else {
      if (timeframe === '3m') start.setMonth(now.getMonth() - 3);
      if (timeframe === '6m') start.setMonth(now.getMonth() - 6);
      if (timeframe === '1y') start.setFullYear(now.getFullYear() - 1);
    }

    return chartData.filter((d) => {
      const dDate = new Date(d.date);
      return dDate >= start && dDate <= end;
    });
  }, [chartData, timeframe, customStart, customEnd]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalSold = filteredData.reduce((acc, curr) => acc + curr.unitsSold, 0);
    const avgRate =
      filteredData.length > 0
        ? filteredData.reduce((acc, curr) => acc + curr.dailyRate, 0) /
          filteredData.length
        : 0;
    return { totalSold, avgRate };
  }, [filteredData]);

  // SVG Chart Helper
  const renderChart = () => {
    if (filteredData.length < 2) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm italic border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
          Not enough data points in this range to graph.
        </div>
      );
    }

    const height = 250;
    const width = 600;
    const padding = 40;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const maxRate = Math.max(...filteredData.map((d) => d.dailyRate)) * 1.1 || 10;
    const minDate = new Date(filteredData[0].date).getTime();
    const maxDate = new Date(filteredData[filteredData.length - 1].date).getTime();
    const timeSpan = maxDate - minDate || 1;

    // FIXED: Renamed parameter yb -> d for clarity
    const getX = (d) =>
      padding + ((new Date(d.date).getTime() - minDate) / timeSpan) * chartW;
    const getY = (val) => height - padding - (val / maxRate) * chartH;

    // Generate Path
    let pathD = `M ${getX(filteredData[0])} ${getY(filteredData[0].dailyRate)}`;
    filteredData.slice(1).forEach((d) => {
      pathD += ` L ${getX(d)} ${getY(d.dailyRate)}`;
    });

    return (
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[600px] bg-white dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700"
        >
          {/* Grid Lines (Horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = height - padding - t * chartH;
            return (
              <g key={t}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  className="dark:stroke-gray-700"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-gray-400"
                >
                  {(maxRate * t).toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Path */}
          <path
            d={pathD}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {filteredData.map((d, i) => (
            <circle
              key={i}
              cx={getX(d)}
              cy={getY(d.dailyRate)}
              r="4"
              className="fill-indigo-600 dark:fill-indigo-400 hover:r-6 transition-all cursor-pointer"
            >
              <title>
                {d.date}: {d.dailyRate.toFixed(2)} / day
              </title>
            </circle>
          ))}

          {/* X Axis Labels (Start/End) */}
          <text
            x={padding}
            y={height - 15}
            textAnchor="middle"
            className="text-[10px] fill-gray-400"
          >
            {filteredData[0].date}
          </text>
          <text
            x={width - padding}
            y={height - 15}
            textAnchor="middle"
            className="text-[10px] fill-gray-400"
          >
            {filteredData[filteredData.length - 1].date}
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-800/60 bg-slate-950/60 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-100">
            <LineChart className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-100">
              SKU Sales Trend Analysis
            </p>
          </div>
        </div>
        <div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-800/80 px-6 pb-6 pt-4 space-y-6">
          <p className="text-xs text-gray-400">
            Analyze daily sales rates over time derived from inventory snapshots.
          </p>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Select SKU
              </label>
              <select
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="w-full bg-slate-900 border border-gray-700 text-white text-sm rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {uniqueSkus.map((sku) => (
                  <option key={sku} value={sku}>
                    {sku}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-slate-900 border border-gray-700 text-white text-sm rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {TIME_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {timeframe === 'custom' && (
            <div className="flex flex-wrap gap-4 items-end bg-slate-900/50 p-3 rounded-md border border-gray-800">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-gray-800 border border-gray-600 text-white text-sm rounded p-1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-gray-800 border border-gray-600 text-white text-sm rounded p-1"
                />
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <div className="text-xs text-indigo-300 uppercase font-semibold">
                Total Units Sold
              </div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {summary.totalSold.toLocaleString()}
              </div>
              <div className="text-[10px] text-indigo-300/60 mt-1">
                in selected period
              </div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-xs text-emerald-300 uppercase font-semibold">
                Avg Daily Rate
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {summary.avgRate.toFixed(2)}
              </div>
              <div className="text-[10px] text-emerald-300/60 mt-1">
                units / day
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3 ml-1">
              Sales Velocity Trend (Units/Day)
            </h4>
            {renderChart()}
          </div>
        </div>
      )}
    </div>
  );
}