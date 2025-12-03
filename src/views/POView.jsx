// views/POView.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, XCircle, Check, ChevronDown } from 'lucide-react';

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

// Reusable vendor dropdown cell (with inline add-new modal)
const VendorCell = ({ currentVendor, allVendors, onSelect, onAddVendor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | success | error
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveNew = () => {
    const trimmed = newVendorName.trim();
    if (!trimmed) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return;
    }
    if (allVendors.some((v) => v.name === trimmed)) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return;
    }

    onAddVendor(trimmed);
    setSaveStatus('success');
    setTimeout(() => {
      setSaveStatus('idle');
      setShowModal(false);
      setNewVendorName('');
      setIsOpen(false);
    }, 1000);
  };

  const renderVendorName = (v) => {
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v.name) return v.name;
    return 'Unknown Vendor';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="cursor-pointer px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:border-indigo-500 shadow-sm"
      >
        {currentVendor || (
          <span className="text-gray-400 italic">Select Vendor</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
          <div className="max-h-40 overflow-y-auto">
            {allVendors.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  onSelect(renderVendorName(v));
                  setIsOpen(false);
                }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
              >
                {renderVendorName(v)}
              </div>
            ))}
            {allVendors.length === 0 && (
              <div className="px-4 py-2 text-xs text-gray-400">
                No vendors yet
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowModal(true);
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 border-t border-gray-200 dark:border-gray-600"
          >
            <Plus className="w-3 h-3" />
            Add New Vendor
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Add Vendor
            </h3>
            <input
              type="text"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              placeholder="Vendor Name"
              className="w-full border rounded p-2 mb-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            />
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {saveStatus === 'error' && (
                  <span className="text-red-500 text-sm flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Error
                  </span>
                )}
                {saveStatus === 'success' && (
                  <span className="text-green-500 text-sm flex items-center gap-1 animate-bounce-short">
                    <Check className="w-4 h-4" />
                    Saved
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveNew}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
    if (days > 0) return 'text-green-600 dark:text-green-400'; // early
    if (days < 0) return 'text-red-600 dark:text-red-400'; // late
    return 'text-gray-500 dark:text-gray-400';
  };

  const getDiffText = (days) => {
    if (days > 0) return `${days} Days Early`;
    if (days < 0) return `${Math.abs(days)} Days Late`;
    return 'On Time';
  };

  return (
    <div className="space-y-6">
      {/* Create PO */}
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

      {/* PO table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto custom-scroll">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  PO #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Order Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  ETA
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Received Date
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Late/Early
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[...pos]
                .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
                .map((p) => {
                  let daysDiff = null;
                  if (p.received && p.receivedDate && p.eta) {
                    const etaDate = new Date(p.eta);
                    const recvDate = new Date(p.receivedDate);
                    const timeDiff = etaDate - recvDate;
                    daysDiff = Math.ceil(
                      timeDiff / (1000 * 60 * 60 * 24)
                    );
                  }

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
                            <img
                              src={skuImages[p.sku]}
                              alt=""
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
                        {daysDiff !== null ? (
                          <span className={getDiffColor(daysDiff)}>
                            {getDiffText(daysDiff)}
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default POView;
