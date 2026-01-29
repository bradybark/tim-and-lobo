// src/views/CustomerManagerView.jsx
import React, { useState } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, DollarSign, CheckCircle2 } from 'lucide-react';
import PricingRecordView from './PricingRecordView';

const CustomerManagerView = ({ customers, setCustomers, cogs, settings, onBack }) => {
  const [editingId, setEditingId] = useState(null);
  const [pricingCustomerId, setPricingCustomerId] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newCust = {
      id: editingId === 'new' ? Date.now() : editingId,
      company: fd.get('company'),
      contact: fd.get('contact'),
      emailAcct: fd.get('emailAcct'),
      emailPurch: fd.get('emailPurch'),
      // Bill To
      billAddress1: fd.get('billAddress1'),
      billCity: fd.get('billCity'),
      billState: fd.get('billState'),
      billZip: fd.get('billZip'),
      // Ship To
      shipAddress1: fd.get('shipAddress1'),
      shipCity: fd.get('shipCity'),
      shipState: fd.get('shipState'),
      shipZip: fd.get('shipZip'),

      // Legacy Backups (optional, for safety)
      billAddress: fd.get('billAddress1'),
      shipAddress: fd.get('shipAddress1'),
      type: fd.get('type'),
      paymentTerms: fd.get('paymentTerms'), // NEW
      invoicePrefix: fd.get('invoicePrefix') || '', // NEW
      isPartner: fd.get('isPartner') === 'on', // NEW
      isAmazon: fd.get('isAmazon') === 'on',   // NEW
      pricingRecords: editingId !== 'new' ? customers.find(c => c.id === editingId)?.pricingRecords || [] : []
    };

    if (!newCust.company) return;

    if (editingId === 'new') {
      setCustomers(prev => [...prev, newCust]);
    } else {
      setCustomers(prev => prev.map(c => c.id === editingId ? newCust : c));
    }
    setEditingId(null);
  };

  const deleteCustomer = (id) => {
    if (confirm('Delete this customer?')) {
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleUpdatePricing = (customerId, newRecords) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, pricingRecords: newRecords } : c
    ));
  };

  if (pricingCustomerId) {
    const customer = customers.find(c => c.id === pricingCustomerId);
    if (!customer) return null;
    return (
      <PricingRecordView
        customer={customer}
        cogs={cogs}
        settings={settings}
        onSave={(records) => handleUpdatePricing(customer.id, records)}
        onBack={() => setPricingCustomerId(null)}
      />
    );
  }

  if (editingId) {
    const cust = customers.find(c => c.id === editingId) || {};
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow max-w-3xl mx-auto">
        <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">
          {editingId === 'new' ? 'Add New Customer' : 'Edit Customer'}
        </h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label><input name="company" defaultValue={cust.company} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Contact Person</label><input name="contact" defaultValue={cust.contact} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Accounting Email</label><input name="emailAcct" defaultValue={cust.emailAcct} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Purchasing Email</label><input name="emailPurch" defaultValue={cust.emailPurch} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Account Type</label>
              <select name="type" defaultValue={cust.type} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="Wholesale">Wholesale</option>
                <option value="Direct Resale">Direct Resale (Retail)</option>
                <option value="Contractor">Contractor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment Terms</label>
              <select name="paymentTerms" defaultValue={cust.paymentTerms || 'Due on Receipt'} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Prefix (Optional)</label>
              <input name="invoicePrefix" defaultValue={cust.invoicePrefix} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. INV-" />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bill To */}
              <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-1 mb-2">Bill To Address</h4>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Street Address</label><input name="billAddress1" defaultValue={cust.billAddress1 || cust.billAddress} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">City</label><input name="billCity" defaultValue={cust.billCity} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">State</label><input name="billState" defaultValue={cust.billState} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" /></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Zip Code</label><input name="billZip" defaultValue={cust.billZip} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" /></div>
              </div>

              {/* Ship To */}
              <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600 pb-1 mb-2">Ship To Address</h4>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Street Address</label><input name="shipAddress1" defaultValue={cust.shipAddress1 || cust.shipAddress || cust.address} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">City</label><input name="shipCity" defaultValue={cust.shipCity} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">State</label><input name="shipState" defaultValue={cust.shipState} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" /></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Zip Code</label><input name="shipZip" defaultValue={cust.shipZip} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" /></div>
              </div>
            </div>

            {/* NEW CHECKBOXES */}
            <div className="md:col-span-2 flex gap-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isPartner" defaultChecked={cust.isPartner} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Partner Company (Sister Company)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isAmazon" defaultChecked={cust.isAmazon} className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Amazon Customer (FBA)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            {editingId !== 'new' && (
              <button type="button" onClick={() => setPricingCustomerId(editingId)} className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300">
                <DollarSign className="w-4 h-4" /> Pricing Record
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 text-gray-500">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Save Customer</button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400"><ArrowLeft className="w-4 h-4 mr-1" /> Back</button>
        <button onClick={() => setEditingId('new')} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Customer</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Flags</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{c.company}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{c.type}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    {c.isPartner && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">PARTNER</span>}
                    {c.isAmazon && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">AMAZON</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                  <button onClick={() => setEditingId(c.id)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteCustomer(c.id)} className="text-red-600 hover:text-red-900 dark:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No customers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerManagerView;