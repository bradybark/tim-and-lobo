// src/views/PricingRecordView.jsx
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useInventory } from '../context/InventoryContext';

// Helper to convert blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const PricingRecordView = ({ customer, cogs, settings, onSave, onBack }) => {
  const { myCompany, companyLogo, skuDescriptions } = useInventory();
  const [records, setRecords] = useState(customer.pricingRecords || []);
  const allSkus = useMemo(() => settings.map(s => s.sku), [settings]);

  const handleAdd = () => {
    setRecords(prev => [...prev, { sku: allSkus[0] || '', price: 0, moq: 1 }]);
  };

  const handleChange = (index, field, val) => {
    const newRecords = [...records];
    newRecords[index] = { ...newRecords[index], [field]: val };
    setRecords(newRecords);
  };

  const handleDelete = (index) => {
    setRecords(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(records);
    toast.success('Pricing saved');
  };

  const handlePrint = async () => {
    let logoImgTag = '';
    if (companyLogo) {
      try {
        const base64 = await blobToBase64(companyLogo);
        // Updated to be black background for lobo logo if needed, but styling allows it to be flexible.
        logoImgTag = `<img src="${base64}" style="max-height: 80px; display: block; margin-bottom: 10px;" alt="Logo" />`;
      } catch (e) {
        console.error("Logo processing error", e);
      }
    }

    const todayDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const itemsRows = records.map(rec => {
      const desc = skuDescriptions?.[rec.sku] || '';
      return `
        <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 12px;">${rec.sku}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 12px;">${desc}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 12px;">${rec.moq}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px;">$${parseFloat(rec.price).toFixed(2)}</td>
        </tr>
    `}).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Pricing Record - ${customer.company || customer.name || 'Customer'}</title>
            <style>
                @page { size: portrait; margin: 0.5in; }
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; margin: 0; color: #333; -webkit-print-color-adjust: exact; background: white; }
                .content-wrapper { max-width: 800px; margin: 0 auto; padding: 20px; }
                
                .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
                .company-info { font-size: 11px; line-height: 1.4; color: #555; }
                .company-name { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
                
                .po-title { text-align: right; }
                .po-title h1 { margin: 0 0 10px 0; font-size: 28px; color: #333; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; }
                .po-details { font-size: 12px; line-height: 1.5; color: #555; }
                
                .grid-container { display: flex; gap: 20px; margin-bottom: 30px; margin-top: 30px; }
                .flex-1 { flex: 1; }
                .address-box { background: #f9f9f9; padding: 15px; border-radius: 4px; min-height: 100px; }
                .section-title { font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
                .address-block { font-size: 12px; line-height: 1.4; color: #333; }
                .address-name { font-weight: bold; color: #111; font-size: 13px; margin-bottom: 2px; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th { background-color: #333; color: #fff; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
                
                .footer { text-align: center; margin-top: 50px; color: #888; font-size: 11px; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="content-wrapper">
                <div class="header">
                    <div>
                        ${logoImgTag}
                        <div class="company-name">${myCompany?.name || 'LOBO TOOL COMPANY'}</div>
                        <div class="company-info">
                            ${myCompany?.address1 || ''}<br>
                            ${myCompany?.address2 ? `${myCompany.address2}<br>` : ''}
                            ${myCompany?.city ? `${myCompany.city}, ` : ''}${myCompany?.state || ''} ${myCompany?.zip || ''}<br>
                            ${myCompany?.email || ''}
                        </div>
                    </div>
                    <div class="po-title">
                        <h1>PRICING RECORD</h1>
                        <div class="po-details">
                            <strong>VALID AS OF:</strong> ${todayDate}<br>
                        </div>
                    </div>
                </div>

                <div class="grid-container">
                    <div class="flex-1">
                        <div class="address-box">
                            <div class="section-title">CUSTOMER:</div>
                            <div class="address-block">
                                <div class="address-name">${customer.company || customer.name || ''}</div>
                                ${customer.billAddress1 || customer.billAddress ? `${customer.billAddress1 || customer.billAddress}<br>` : ''}
                                ${customer.billCity ? `${customer.billCity}, ` : ''}${customer.billState ? `${customer.billState} ` : ''}${customer.billZip ? `${customer.billZip}<br>` : (customer.billCity || customer.billState ? '<br>' : '')}
                                <div style="margin-top: 5px;"></div>
                                ${customer.contact ? `${customer.contact}<br>` : ''}
                                ${customer.emailAcct ? `${customer.emailAcct}<br>` : ''}
                                ${customer.emailPurch && customer.emailPurch !== customer.emailAcct ? `${customer.emailPurch}<br>` : ''}
                                ${customer.phone ? `${customer.phone}<br>` : ''}
                                ${customer.address && !customer.billAddress1 && !customer.billAddress ? `${customer.address}<br>` : ''}
                                ${customer.email && !customer.emailAcct ? `${customer.email}<br>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex-1">
                        <!-- Empty box to match the two-column invoice layout if desired, or can be left out. Kept empty for balance. -->
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>DESCRIPTION</th>
                            <th style="text-align: center;">MOQ</th>
                            <th style="text-align: right;">UNIT PRICE</th>
                        </tr>
                    </thead>
                    <tbody>${itemsRows}</tbody>
                </table>
                
                <div class="footer">
                    Thank you for your business!<br>
                    Questions? Contact us at ${myCompany?.email || 'info@lobotools.com'}
                </div>
            </div>
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      toast.error('Please allow popups to print records.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Pricing Record: {customer.company}
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="bg-white text-indigo-600 border border-indigo-600 px-4 py-2 rounded hover:bg-indigo-50 flex items-center gap-2 transition-colors">
            <Printer className="w-4 h-4" /> Print Record
          </button>
          <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2 transition-colors">
            <Save className="w-4 h-4" /> Save Record
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">COGS (Base)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Customer Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Profit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin %</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">MOQ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {records.map((rec, idx) => {
              const baseCost = cogs[rec.sku] || 0;
              const price = parseFloat(rec.price) || 0;
              const profit = price - baseCost;
              const margin = price > 0 ? (profit / price) * 100 : 0;

              return (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <select
                      value={rec.sku}
                      onChange={(e) => handleChange(idx, 'sku', e.target.value)}
                      // FIX: Added dark:bg-gray-700 and dark:text-white to ensure visibility in dropdown
                      className="bg-transparent border border-gray-300 dark:border-gray-600 rounded p-1.5 text-sm text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {allSkus.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                    ${baseCost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={rec.price}
                      onChange={(e) => handleChange(idx, 'price', e.target.value)}
                      className="w-24 text-right p-1.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </td>
                  <td className={`px-6 py-4 text-right text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${profit.toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 text-right text-sm font-medium ${margin >= 20 ? 'text-green-600' : 'text-amber-500'}`}>
                    {margin.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input
                      type="number"
                      value={rec.moq}
                      onChange={(e) => handleChange(idx, 'moq', e.target.value)}
                      className="w-16 text-right p-1.5 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(idx)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button onClick={handleAdd} className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:underline">
            <Plus className="w-4 h-4" /> Add Item Row
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingRecordView;