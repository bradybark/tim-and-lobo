import { imageToDataUrl } from './imageDataUrl.js';

export const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
};

export const formatDate = (dateLike) => {
    if (!dateLike) return '-';
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateLike) ? dateLike + 'T12:00:00' : dateLike);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const escapeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export const renderPurchaseOrder = async (po, vendor, myCompany, companyLogo) => {
    const vendorName = vendor?.name?.name || vendor?.name || 'Unknown Vendor';
    const vendorAddress = vendor?.address || '';
    const vendorEmail = vendor?.email || '';

    // Use PO-specific addresses
    const shipAddr = po.shipAddress || '';
    const shipAddr2 = po.shipAddress2 || '';
    const shipCity = po.shipCity || '';
    const shipState = po.shipState || '';
    const shipZip = po.shipZip || '';

    const billAddr = po.billAddress || '';
    const billAddr2 = po.billAddress2 || '';
    const billCity = po.billCity || '';
    const billState = po.billState || '';
    const billZip = po.billZip || '';

    // Prepare Logo
    let logoImgTag = '';
    if (companyLogo) {
        try {
            const base64 = await imageToDataUrl(companyLogo);
            logoImgTag = base64 ? `<img src="${escapeText(base64)}" class="logo-img" alt="Logo" />` : '';
        } catch (e) {
            console.error("Logo processing error", e);
        }
    }

    // Terms String
    const paymentTerms = po.termType === 'Custom' ? `Net ${po.termDays}` : po.termType;

    const itemsRows = po.items.map(i => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px;">${escapeText(i.sku)}</td>
            <td style="padding: 10px;">${escapeText(i.description || '')}</td>
            <td style="padding: 10px; text-align: right;">${escapeText(i.qty)}</td>
            <td style="padding: 10px; text-align: right;">${formatMoney(i.unitPrice)}</td>
            <td style="padding: 10px; text-align: right;">${formatMoney(i.qty * i.unitPrice)}</td>
        </tr>
    `).join('');

    return `
    <html>
    <head>
        <title>Purchase Order ${escapeText(po.poNumber)}</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #184833; padding-bottom: 20px; }
            .logo-container { margin-bottom: 15px; }
            .logo-img { max-height: 80px; max-width: 200px; }
            .company-name { font-size: 24px; font-weight: 900; letter-spacing: 1px; margin-bottom: 5px; text-transform: uppercase; color: #184833; }
            .company-details { font-size: 13px; color: #555; line-height: 1.4; }
            .po-meta { text-align: right; }
            .po-title { font-size: 32px; color: #184833; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; }
            .meta-row { display: flex; justify-content: flex-end; gap: 15px; font-size: 14px; margin-bottom: 5px; }
            .meta-label { font-weight: bold; color: #666; }

            .address-section { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 30px; }
            .address-box { flex: 1; background: #f9f9f9; padding: 20px; border-radius: 5px; }
            .address-box h3 { font-size: 12px; text-transform: uppercase; color: #888; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 0 0 10px 0; }
            .address-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
            .address-info { font-size: 14px; line-height: 1.5; color: #444; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; background: #184833; color: white; padding: 12px 10px; font-size: 12px; font-weight: bold; text-transform: uppercase; }

            .totals { display: flex; justify-content: flex-end; }
            .totals-box { width: 300px; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; }
            .total-row.final { border-top: 2px solid #184833; border-bottom: none; font-weight: 900; font-size: 20px; margin-top: 10px; padding-top: 15px; color: #184833; }

            .notes-box { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px; border-left: 3px solid #184833; font-size: 13px; }
            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 13px; color: #888; }

            @media print {
                body { padding: 20px; }
                @page { size: letter portrait; margin: 0.5in; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="logo-container">
                    ${logoImgTag}
                </div>
                <div class="company-name">${escapeText(myCompany?.name || 'Company Name')}</div>
                <div class="company-details">
                    ${escapeText(myCompany?.address1 || '')}<br>
                    ${myCompany?.address2 ? `${escapeText(myCompany.address2)}<br>` : ''}
                    ${myCompany?.city ? `${escapeText(myCompany.city)}, ` : ''}${escapeText(myCompany?.state || '')} ${escapeText(myCompany?.zip || '')}<br>
                    ${escapeText(myCompany?.email || '')}<br>
                    ${escapeText(myCompany?.phone || '')}
                </div>
            </div>
            <div class="po-meta">
                <div class="po-title">Purchase Order</div>
                <div class="meta-row"><span class="meta-label">PO #:</span> <span>${escapeText(po.poNumber)}</span></div>
                <div class="meta-row"><span class="meta-label">DATE:</span> <span>${formatDate(po.orderDate)}</span></div>
                <div class="meta-row"><span class="meta-label">TERMS:</span> <span>${escapeText(paymentTerms)}</span></div>
            </div>
        </div>

        <div class="address-section">
            <div class="address-box">
                <h3>Vendor</h3>
                <div class="address-name">${escapeText(vendorName)}</div>
                <div class="address-info">
                    ${escapeText(vendorAddress)}${vendorAddress ? '<br>' : ''}
                    ${escapeText(vendorEmail)}
                </div>
            </div>
            <div class="address-box">
                <h3>Ship To</h3>
                <div class="address-name">${escapeText(po.isDropShip && po.dropShipRecipient ? po.dropShipRecipient : (myCompany?.name || ''))}</div>
                <div class="address-info">
                    ${escapeText(shipAddr)}${shipAddr ? '<br>' : ''}
                    ${shipAddr2 ? `${escapeText(shipAddr2)}<br>` : ''}
                    ${escapeText(shipCity)}${shipCity && shipState ? ', ' : ''}${escapeText(shipState)} ${escapeText(shipZip)}
                </div>
            </div>
            <div class="address-box">
                <h3>Bill To</h3>
                <div class="address-name">${escapeText(myCompany?.name || '')}</div>
                <div class="address-info">
                    ${escapeText(billAddr)}${billAddr ? '<br>' : ''}
                    ${billAddr2 ? `${escapeText(billAddr2)}<br>` : ''}
                    ${escapeText(billCity)}${billCity && billState ? ', ' : ''}${escapeText(billState)} ${escapeText(billZip)}
                </div>
            </div>
        </div>

        <table>
            <thead><tr><th>SKU</th><th>Description</th><th style="text-align: right;">Qty</th><th style="text-align: right;">Unit Price</th><th style="text-align: right;">Amount</th></tr></thead>
            <tbody>${itemsRows}</tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 40px;">
            ${po.notes ? `
            <div class="notes-box" style="flex: 1; margin-top: 0;">
                <strong>Notes:</strong><br>${escapeText(po.notes)}
            </div>` : '<div style="flex: 1;"></div>'}
            <div class="totals-box">
                <div class="total-row">
                    <span>Subtotal</span>
                    <span>${formatMoney(po.totalAmount)}</span>
                </div>
                <div class="total-row final">
                    <span>TOTAL</span>
                    <span>${formatMoney(po.totalAmount)}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            Thank you for your business! Please ship as soon as possible and provide tracking information once shipped.
        </div>
    </body>
    </html>
`;
};
