// src/views/VendorManagerView.jsx
import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  XCircle,
  Check,
} from 'lucide-react';
import { useTable } from '../hooks/useTable';
import { SortableHeaderCell } from '../components/SortableHeaderCell';

const safeName = (v) =>
  typeof v?.name === 'object' && v.name?.name ? v.name.name : v.name;

const VendorManagerView = ({ vendors, updateVendors, onBack }) => {
  const [editingVendor, setEditingVendor] = useState(null); // null = list, object = edit/add
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | success | error
  const [errorMsg, setErrorMsg] = useState('');

  // Normalize data for sorting (handle safeName issue)
  const preparedVendors = React.useMemo(() => {
    return vendors.map(v => ({
      ...v,
      displayName: safeName(v) // Add a flat field for easier sorting/filtering
    }));
  }, [vendors]);

  const { processedData, sortConfig, handleSort, filters, handleFilter } = useTable(preparedVendors, { key: 'displayName', direction: 'asc' });

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newVendor = {
      id: editingVendor.id || Date.now(),
      name: formData.get('name').trim(),
      contact: formData.get('contact'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      country: formData.get('country'),
      email: formData.get('email'),
    };

    if (!newVendor.name) {
      setErrorMsg('Vendor Name is required.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    let updatedList;
    if (editingVendor.id) {
      // Edit
      updatedList = vendors.map((v) =>
        v.id === newVendor.id ? newVendor : v
      );
    } else {
      // Add
      updatedList = [...vendors, newVendor];
    }

    updateVendors(updatedList);
    setSaveStatus('success');
    setTimeout(() => {
      setSaveStatus('idle');
      setEditingVendor(null);
    }, 1000);
  };

  const deleteVendor = (id) => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Are you sure? This will remove the vendor from the list.')) {
      updateVendors(vendors.filter((v) => v.id !== id));
    }
  };

  if (editingVendor) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {editingVendor.id ? 'Edit Vendor' : 'Add New Vendor'}
          </h3>
          <button
            type="button"
            onClick={() => setEditingVendor(null)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Company Name *
              </label>
              <input
                name="name"
                defaultValue={safeName(editingVendor)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Contact Person
              </label>
              <input
                name="contact"
                defaultValue={editingVendor.contact}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number
              </label>
              <input
                name="phone"
                defaultValue={editingVendor.phone}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                name="email"
                defaultValue={editingVendor.email}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Physical Address
              </label>
              <input
                name="address"
                defaultValue={editingVendor.address}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Country of Manufacturing
              </label>
              <input
                name="country"
                defaultValue={editingVendor.country}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border"
              />
            </div>
          </div>

          <div className="flex justify-end items-center gap-4 pt-4">
            {saveStatus === 'error' && (
              <span className="text-red-500 text-sm flex items-center gap-1 font-medium">
                <XCircle className="w-4 h-4" />
                {errorMsg}
              </span>
            )}
            {saveStatus === 'success' && (
              <span className="text-green-500 text-sm flex items-center gap-1 animate-bounce-short font-medium">
                <Check className="w-4 h-4" />
                Successfully Saved
              </span>
            )}
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-medium"
            >
              Save Vendor
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List mode
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Planner
        </button>
        <button
          type="button"
          onClick={() => setEditingVendor({})}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <SortableHeaderCell label="Company" sortKey="displayName" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.displayName} />
              <SortableHeaderCell label="Contact" sortKey="contact" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.contact} />
              <SortableHeaderCell label="Email" sortKey="email" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.email} />
              <SortableHeaderCell label="Country" sortKey="country" currentSort={sortConfig} onSort={handleSort} onFilter={handleFilter} filterValue={filters.country} />
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {processedData.map((v) => (
              <tr
                key={v.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {v.displayName || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {v.contact || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {v.email || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {v.country || '-'}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingVendor(v)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteVendor(v.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {processedData.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No vendors found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VendorManagerView;