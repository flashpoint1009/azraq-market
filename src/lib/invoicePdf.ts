import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { TENANT_CONFIG } from '../config/tenant';
import { formatCurrency, formatDate, unitLabels } from './labels';
import type { Order } from '../types/database';

export async function downloadInvoicePdf(order: Order) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const qrDataUrl = await QRCode.toDataURL(order.id, { margin: 1, width: 96 });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(TENANT_CONFIG.brandName, pageWidth - 40, 46, { align: 'right' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #${order.id.slice(0, 8)}`, pageWidth - 40, 70, { align: 'right' });
  doc.text(formatDate(order.created_at), pageWidth - 40, 88, { align: 'right' });
  doc.addImage(qrDataUrl, 'PNG', 40, 38, 72, 72);

  const customerLines = [
    `Customer: ${order.profiles?.full_name || '-'}`,
    `Phone: ${order.profiles?.phone || '-'}`,
    `Address: ${order.address || order.profiles?.address || '-'}`,
  ];
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Details', pageWidth - 40, 130, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  customerLines.forEach((line, index) => doc.text(line, pageWidth - 40, 152 + index * 18, { align: 'right' }));

  autoTable(doc, {
    startY: 225,
    head: [['Total', 'Unit Price', 'Qty', 'Unit', 'Product']],
    body: (order.order_items || []).map((item) => [
      formatCurrency(item.line_total),
      formatCurrency(item.unit_price_snapshot),
      String(item.quantity),
      unitLabels[item.unit_type_snapshot],
      item.product_name_snapshot,
    ]),
    styles: { font: 'helvetica', halign: 'right', fontSize: 10 },
    headStyles: { fillColor: [43, 91, 116], textColor: 255 },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 250;
  const totals = [
    ['Subtotal', formatCurrency(Number(order.total_amount || 0) + Number(order.discount_amount || 0))],
    ['Discount', formatCurrency(order.discount_amount || 0)],
    ['Delivery', formatCurrency(order.delivery_fee || 0)],
    ['Grand Total', formatCurrency(order.total_amount)],
  ];
  totals.forEach(([label, value], index) => {
    const y = finalY + 30 + index * 22;
    doc.setFont('helvetica', index === totals.length - 1 ? 'bold' : 'normal');
    doc.text(label, 180, y);
    doc.text(value, 40, y);
  });

  doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
}
