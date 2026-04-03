// src/views/POView.jsx
import React, { useMemo } from 'react';
import { Plus, Trash2, Package, Check, X } from 'lucide-react';
import { VendorCell } from '../components/VendorCell';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';
import { SkuImage } from '../components/SkuImage';

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
  cogs = {}, setCogs,
  snapshots = [], setSnapshots,
  cogsHistory = [], setCogsHistory,
  shipments = [], setShipments,
  updatePOs
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState('orders');
  const [receivingPO, setReceivingPO] = React.useState(null);
  const [receiveForm, setReceiveForm] = React.useState({ receivedQty: 0, cogs: 0, currentShelfQty: 0 });

  const formatMoney = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
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

  const handleOpenReceive = (p) => {
      const snaps = snapshots.filter(s => s.sku === p.sku).sort((a,b) => new Date(b.date) - new Date(a.date));
      const currentStock = snaps[0]?.qty || 0;
      setReceiveForm({
          receivedQty: p.qty,
          cogs: cogs[p.sku] || 0,
          currentShelfQty: currentStock
      });
      setReceivingPO(p);
  };

  const handleConfirmReceive = () => {
      const now = new Date().toISOString();
      const poUpdates = [...pos];
      const poIndex = poUpdates.findIndex(p => p.id === receivingPO.id);
      
      let newCogsState = { ...cogs };
      let newSnapshots = [...snapshots];
      let newCogsHistory = [...(cogsHistory || [])];
      
      const receivedQty = Number(receiveForm.receivedQty) || 0;
      const shipmentCogs = Number(receiveForm.cogs) || 0;
      const currentStock = Number(receiveForm.currentShelfQty) || 0;
      const currentAvgCogs = Number(cogs[receivingPO.sku]) || 0;

      const totalCurrentValue = currentStock * currentAvgCogs;
      const totalReceivedValue = receivedQty * shipmentCogs;
      const newTotalStock = currentStock + receivedQty;
      const newAvgCogs = newTotalStock > 0 ? (totalCurrentValue + totalReceivedValue) / newTotalStock : shipmentCogs;

      // 1. Update Global COGS
      newCogsState[receivingPO.sku] = newAvgCogs;

      // 2. Log History
      newCogsHistory.push({
          id: Date.now() + Math.random(),
          sku: receivingPO.sku,
          date: now,
          poNumber: receivingPO.poNumber,
          oldAvgCogs: currentAvgCogs,
          receivedCogs: shipmentCogs,
          newAvgCogs: newAvgCogs,
          receivedQty,
          previousQty: currentStock
      });

      // 3. Update Snapshot
      newSnapshots.push({
          id: Date.now() + Math.random(),
          sku: receivingPO.sku,
          qty: newTotalStock,
          date: now.split('T')[0]
      });

      // 4. Shipments trace
      const newShipments = [...(shipments || [])];
      newShipments.push({
          poId: receivingPO.id,
          poNumber: receivingPO.poNumber,
          vendorId: receivingPO.vendor, // In POView, vendor might just be name or ID string
          date: now,
          items: [{ sku: receivingPO.sku, qty: receivedQty, cogs: shipmentCogs }]
      });

      // Update PO Status
      if (poIndex > -1) {
          poUpdates[poIndex] = {
              ...poUpdates[poIndex],
              received: true,
              receivedDate: now.split('T')[0]
          };
      }

      if (setCogs) setCogs(newCogsState);
      if (setSnapshots) setSnapshots(newSnapshots);
      if (setCogsHistory) setCogsHistory(newCogsHistory);
      if (setShipments) setShipments(newShipments);
      if (updatePOs) updatePOs(poUpdates);
      
      setReceivingPO(null);
  };

  const renderOrdersList = () => (
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
              {processedData.map((p, index) => {
                  return (
                    <tr
                      key={p.id}
                      className={
                        p.received
                          // FIX: Removed opacity-75 to fix stacking context issues with dropdowns
                          ? 'bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400' 
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {p.poNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        <div className="flex items-center">
                          {skuImages[p.sku] && (
                            <SkuImage
                              data={skuImages[p.sku]}
                              className="w-6 h-6 rounded mr-2 object-cover border dark:border-gray-600"
                            />
                          )}
                          {p.sku}
                        </div>
                      </td>

                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm"
                        // FIX: Descending z-index ensures top rows float above bottom rows
                        style={{ position: 'relative', zIndex: processedData.length - index + 10 }}
                      >
                        <VendorCell
                          currentVendor={p.vendor}
                          allVendors={vendors}
                          onSelect={(v) => updatePOVendor(p.id, v)}
                          onAddVendor={addVendor}
                        />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(p.orderDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {p.qty.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                        {p.received ? (
                          <button
                            type="button"
                            onClick={() => toggleReceivePO(p.id)}
                            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReceive(p)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900"
                          >
                             <Package className="w-3 h-3" /> Receive
                          </button>
                        )}
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

  const renderShipments = () => (
    <div className="space-y-6">
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shipments History</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Track incoming items and COGS changes over time</p>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Received</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {(!shipments || shipments.length === 0) ? (
                            <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm">No shipments received yet. Receive a PO to log a shipment.</td></tr>
                        ) : shipments.sort((a,b) => new Date(b.date) - new Date(a.date)).map((shipment, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatDate(shipment.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{shipment.poNumber}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                    <div className="flex flex-col gap-1">
                                        {shipment.items.map((i, iidx) => (
                                            <div key={iidx} className="flex justify-between max-w-xs text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
                                                <span className="font-semibold px-2">{i.sku}</span>
                                                <span className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 font-medium border-l border-gray-200 dark:border-gray-700">{i.qty} units @ {formatMoney(i.cogs || 0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );

  return (
      <div className="space-y-6">
          {/* Tab Bar */}
          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
              <button 
                  onClick={() => setActiveSubTab('orders')} 
                  className={`pb-2 px-4 font-medium ${activeSubTab === 'orders' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                  Purchase Orders
              </button>
              <button 
                  onClick={() => setActiveSubTab('shipments')} 
                  className={`pb-2 px-4 font-medium ${activeSubTab === 'shipments' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                  Shipments History
              </button>
          </div>

          {activeSubTab === 'orders' && renderOrdersList()}
          {activeSubTab === 'shipments' && renderShipments()}

          {/* Receive Modal */}
          {receivingPO && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                      <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-xl">
                          <div>
                              <h2 className="text-xl font-bold dark:text-white">Receive Shipment</h2>
                              <p className="text-sm text-gray-500">PO: {receivingPO.poNumber}</p>
                          </div>
                          <button onClick={() => setReceivingPO(null)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                      </div>
                      <div className="p-6 overflow-y-auto flex-1">
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 border border-blue-100 dark:border-blue-800">
                              <p className="text-sm text-blue-800 dark:text-blue-300">
                                  <strong>How perfectly weighted average COGS works here:</strong> Input the unit cost you paid (COGS). Verify your 'Current Shelf Qty' is accurate before saving. We'll automatically adjust the global COGS using pure math!
                              </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                                  <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded border dark:border-gray-700 font-medium dark:text-white text-sm">{receivingPO.sku}</div>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Received Qty</label>
                                  <input 
                                      type="number" 
                                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                      value={receiveForm.receivedQty}
                                      onChange={(e) => setReceiveForm({...receiveForm, receivedQty: e.target.value})}
                                  />
                                  <div className="text-xs text-gray-500 mt-1">Expected: {receivingPO.qty}</div>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Incoming COGS (EA)</label>
                                  <div className="relative">
                                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                                      <input 
                                          type="number" step="0.01" 
                                          className="w-full p-2 pl-6 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                          value={receiveForm.cogs}
                                          onChange={(e) => setReceiveForm({...receiveForm, cogs: e.target.value})}
                                      />
                                  </div>
                              </div>
                              <div className="col-span-2">
                                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Current Shelf Qty</label>
                                  <input 
                                      type="number" 
                                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                      value={receiveForm.currentShelfQty}
                                      onChange={(e) => setReceiveForm({...receiveForm, currentShelfQty: e.target.value})}
                                  />
                                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Pre-filled from your latest inventory snapshot.</div>
                              </div>
                          </div>
                      </div>
                      <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 rounded-b-xl">
                          <button onClick={() => setReceivingPO(null)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition">Cancel</button>
                          <button onClick={handleConfirmReceive} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow flex items-center gap-2 font-medium transition">
                              <Check className="w-4 h-4" /> Save Receipt & Update Info
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};

export default POView;