// src/views/POView.jsx
import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { VendorCell } from '../components/VendorCell';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { SkuImage } from '../components/SkuImage'; // Import added

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

const POView = ({
  pos,
  handleAddPO,
  toggleReceivePO,
  updateReceivedDate,
  deletePO,
  skuImages,
  vendors,
  updatePOVendor,
  addVendor,
}) => {
  const getDiffColor = (days) => {
    if (days > 0) return 'text-green-600 dark:text-green-400';
    if (days < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  const getDiffText = (days) => {
    if (days > 0) return `${days} Days Early`;
    if (days < 0) return `${Math.abs(days)} Days Late`;
    return 'On Time';
  };

  const preparedPos = useMemo(() => {
    return pos.map(p => {
      let daysDiff = null;
      let status = p.received ? 'Received' : 'On Order';
      if (p.received && p.receivedDate && p.eta) {
        const etaDate = new Date(p.eta);
        const recvDate = new Date(p.receivedDate);
        const timeDiff = etaDate - recvDate;
        daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      }
      return { ...p, daysDiff, status };
    });
  }, [pos]);

  const { processedData, sortConfig, handleSort, filters, handleFilter } = useTable(preparedPos, { key: 'orderDate', direction: 'desc' });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Create Purchase Order
        </h3>
        <form
          onSubmit={handleAddPO}
          className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              PO #
            </label>
            <input
              required
              type="text"
              name="poNumber"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 border"
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
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Order Date
            </label>
            <input
              required
              type="date"
              name="orderDate"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 border"
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Qty
            </label>
            <input
              required
              type="number"
              name="qty"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              ETA
            </label>
            <input
              required
              type="date"
              name="eta"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 border"
            />
          </div>

          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add PO
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto custom-scroll pb-4">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <SortableHeaderCell label="PO #" sortKey="poNumber" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.poNumber} />
                <SortableHeaderCell label="Product" sortKey="sku" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.sku} />
                <SortableHeaderCell label="Vendor" sortKey="vendor" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.vendor} />
                <SortableHeaderCell label="Order Date" sortKey="orderDate" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.orderDate} />
                <SortableHeaderCell label="Qty" sortKey="qty" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.qty} className="text-right" />
                <SortableHeaderCell label="ETA" sortKey="eta" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.eta} />
                <SortableHeaderCell label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.status} className="text-center" />
                <SortableHeaderCell label="Received Date" sortKey="receivedDate" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.receivedDate} className="text-center" />
                <SortableHeaderCell label="Late/Early" sortKey="daysDiff" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.daysDiff} className="text-center" />
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {processedData.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      className={
                        p.received
                          ? 'bg-gray-50 dark:bg-gray-900 opacity-75'
                          : 'bg-white dark:bg-gray-800'
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {p.poNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          {skuImages[p.sku] && (
                            /* UPDATED: Using SkuImage component */
                            <SkuImage
                              data={skuImages[p.sku]}
                              className="w-6 h-6 rounded mr-2 object-cover border dark:border-gray-600"
                            />
                          )}
                          {p.sku}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white z-50">
                        <VendorCell
                          currentVendor={p.vendor}
                          allVendors={vendors}
                          onSelect={(v) => updatePOVendor(p.id, v)}
                          onAddVendor={addVendor}
                        />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(p.orderDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        {p.qty.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(p.eta)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {p.received ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Received
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            On Order
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {p.received ? (
                          <input
                            type="date"
                            value={p.receivedDate || ''}
                            onChange={(e) =>
                              updateReceivedDate(p.id, e.target.value)
                            }
                            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        {p.daysDiff !== null ? (
                          <span className={getDiffColor(p.daysDiff)}>
                            {getDiffText(p.daysDiff)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          type="button"
                          onClick={() => toggleReceivePO(p.id)}
                          className={`text-xs px-2 py-1 rounded border ${
                            p.received
                              ? 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              : 'border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900'
                          }`}
                        >
                          {p.received ? 'Undo' : 'Receive'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePO(p.id)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {processedData.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No purchase orders found. Create a new PO to get started.
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

export default POView;