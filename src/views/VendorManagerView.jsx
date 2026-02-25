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

const VendorEditor = ({ vendor, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [vendorProducts, setVendorProducts] = useState(vendor.products || []);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddProduct = () => {
    setVendorProducts([...vendorProducts, { id: Date.now(), sku: '', description: '', price: 0 }]);
  };

  const updateProduct = (id, field, value) => {
    setVendorProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeProduct = (id) => {
    setVendorProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newVendor = {
      id: vendor.id || Date.now(),
      name: fd.get('name').trim(),
      contact: fd.get('contact'),
      phone: fd.get('phone'),
      address: fd.get('address'),
      country: fd.get('country'),
      email: fd.get('email'),
      poPrefix: fd.get('poPrefix')?.trim() || '',
      products: vendorProducts
    };

    if (!newVendor.name) {
      setErrorMsg('Vendor Name is required.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    onSave(newVendor);
    setSaveStatus('success');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {vendor.id ? 'Edit Vendor' : 'Add New Vendor'}
        </h3>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button type="button" onClick={() => setActiveTab('details')} className={`px-3 py-1 text-sm rounded-md transition-all ${activeTab === 'details' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Details</button>
            <button type="button" onClick={() => setActiveTab('products')} className={`px-3 py-1 text-sm rounded-md transition-all ${activeTab === 'products' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Product Catalog</button>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 ml-4"
          >
            Cancel
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div className={activeTab === 'details' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name *</label>
              <input name="name" defaultValue={safeName(vendor)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person</label>
              <input name="contact" defaultValue={vendor.contact} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
              <input name="phone" defaultValue={vendor.phone} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <input name="email" defaultValue={vendor.email} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Physical Address</label>
              <input name="address" defaultValue={vendor.address} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country of Manufacturing</label>
              <input name="country" defaultValue={vendor.country} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">PO Prefix</label>
              <input name="poPrefix" defaultValue={vendor.poPrefix || ''} placeholder="e.g. LIFT-" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 border" />
              <p className="mt-1 text-xs text-gray-400">Auto-numbers POs as PREFIX001, PREFIX002, etc.</p>
            </div>
          </div>
        </div>

        <div className={activeTab === 'products' ? 'block' : 'hidden'}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Catalog</h4>
              <button type="button" onClick={handleAddProduct} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400">
                + Add Product
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {vendorProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2">
                        <input
                          value={p.sku}
                          onChange={(e) => updateProduct(p.id, 'sku', e.target.value)}
                          className="w-full text-sm border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1"
                          placeholder="SKU"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={p.description}
                          onChange={(e) => updateProduct(p.id, 'description', e.target.value)}
                          className="w-full text-sm border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1"
                          placeholder="Description"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          value={p.price}
                          onChange={(e) => updateProduct(p.id, 'price', parseFloat(e.target.value))}
                          className="w-full text-sm text-right border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-1"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => removeProduct(p.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {vendorProducts.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-400 text-sm">No products in catalog.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
          {saveStatus === 'error' && <span className="text-red-500 text-sm flex items-center gap-1 font-medium"><XCircle className="w-4 h-4" />{errorMsg}</span>}
          {saveStatus === 'success' && <span className="text-green-500 text-sm flex items-center gap-1 animate-bounce-short font-medium"><Check className="w-4 h-4" />Successfully Saved</span>}
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-medium">Save Vendor</button>
        </div>
      </form>
    </div>
  );
};

const VendorManagerView = ({ vendors, updateVendors, onBack }) => {
  const [editingVendor, setEditingVendor] = useState(null); // null = list, object = edit/add

  // Normalize data for sorting (handle safeName issue)
  const preparedVendors = React.useMemo(() => {
    return vendors.map(v => ({
      ...v,
      displayName: safeName(v) // Add a flat field for easier sorting/filtering
    }));
  }, [vendors]);

  const { processedData, sortConfig, handleSort, filters, handleFilter } = useTable(preparedVendors, { key: 'displayName', direction: 'asc' });

  const handleUpdate = (newVendor) => {
    let updatedList;
    if (newVendor.id && vendors.some(v => v.id === newVendor.id)) { // Check if it's an existing vendor
      // Edit
      updatedList = vendors.map((v) =>
        v.id === newVendor.id ? newVendor : v
      );
    } else {
      // Add
      updatedList = [...vendors, { ...newVendor, id: Date.now() }]; // Ensure new vendor has an ID
    }

    updateVendors(updatedList);
    // Be sure to close after a delay if desired, or let the user close manually. 
    // The previous logic closed it after 1s.
    setTimeout(() => {
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
    return <VendorEditor vendor={editingVendor} onSave={handleUpdate} onCancel={() => setEditingVendor(null)} />;
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
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteVendor(v.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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