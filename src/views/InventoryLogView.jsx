// views/InventoryLogView.jsx
import React, { useMemo } from 'react';
import { Plus, HelpCircle } from 'lucide-react';

const formatDate = (dateLike) => {
  if (!dateLike) return '-';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const TooltipHeader = ({ title, tooltip, className = '' }) => (
  <div
    className={`group relative inline-flex items-center gap-1 cursor-help ${className}`}
  >
    <span>{title}</span>
    <HelpCircle className="w-3 h-3" />
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-center font-normal normal-case border border-gray-700">
      {tooltip}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
    </div>
  </div>
);

const InventoryLogView = ({
  snapshots,
  handleAddSnapshot,
  deleteSnapshot,
  skuImages,
  pos,
  getDaysDiff,
}) => {
  // Same logic as original export: compute period metrics per snapshot
  const processedLog = useMemo(() => {
    const snapshotsBySku = {};
    snapshots.forEach((s) => {
      if (!snapshotsBySku[s.sku]) snapshotsBySku[s.sku] = [];
      snapshotsBySku[s.sku].push(s);
    });

    let allRows = [];
    Object.keys(snapshotsBySku).forEach((sku) => {
      const skusSnaps = snapshotsBySku[sku].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      skusSnaps.forEach((snap, index) => {
        let prevDate = '-';
        let prevQty = '-';
        let purchases = 0;
        let daysInPeriod = '-';
        let unitsSold = '-';
        let dailyRate = '-';

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
            .reduce((sum, p) => sum + parseInt(p.qty, 10), 0);

          daysInPeriod = getDaysDiff(prevDate, snap.date);
          unitsSold = prevQty + purchases - snap.qty;
          dailyRate = daysInPeriod > 0 ? (unitsSold / daysInPeriod).toFixed(2) : 0;
        }

        allRows.push({
          ...snap,
          prevDate,
          prevQty,
          purchases,
          daysInPeriod,
          unitsSold,
          dailyRate,
        });
      });
    });

    return allRows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [snapshots, pos, getDaysDiff]);

  return (
    <div className="space-y-6">
      {/* Add physical count */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Add Physical Count
        </h3>
        <form
          onSubmit={handleAddSnapshot}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date Checked
            </label>
            <input
              required
              type="date"
              name="date"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 border"
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              SKU
            </label>
            <input
              required
              type="text"
              name="sku"
              placeholder="e.g. MST12"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ending Qty
            </label>
            <input
              required
              type="number"
              name="qty"
              placeholder="0"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 border"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Log Count
          </button>
        </form>
      </div>

      {/* Log table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto custom-scroll">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Product
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  <TooltipHeader
                    title="Ending Inv"
                    tooltip="Counted quantity on this date"
                  />
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  <TooltipHeader
                    title="Purchases"
                    tooltip="Stock received since previous count"
                  />
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  <TooltipHeader
                    title="Prev Date"
                    tooltip="Date of the previous count"
                  />
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  <TooltipHeader
                    title="Prev Inv"
                    tooltip="Inventory amount at previous count"
                  />
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  <TooltipHeader
                    title="Days"
                    tooltip="Days elapsed since previous count"
                  />
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  <TooltipHeader
                    title="Sold"
                    tooltip="Units sold in this period"
                  />
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  <TooltipHeader
                    title="Daily Rate"
                    tooltip="Calculated daily sales rate for this specific period"
                  />
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {processedLog.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {formatDate(s.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center">
                      {skuImages[s.sku] && (
                        <img
                          src={skuImages[s.sku]}
                          alt=""
                          className="w-6 h-6 rounded mr-2 object-cover border dark:border-gray-600"
                        />
                      )}
                      {s.sku}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white">
                    {s.qty.toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">
                    {s.purchases > 0 ? `+${s.purchases}` : '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                    {formatDate(s.prevDate)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                    {s.prevQty !== '-' ? s.prevQty.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                    {s.daysInPeriod}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-200">
                    {s.unitsSold}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600 dark:text-blue-400">
                    {s.dailyRate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      type="button"
                      onClick={() => deleteSnapshot(s.id)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {processedLog.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No snapshots logged yet. Add a physical count to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryLogView;
