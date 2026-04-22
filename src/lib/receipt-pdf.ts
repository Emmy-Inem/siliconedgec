import jsPDF from "jspdf";
import { formatNaira } from "./format-currency";

export interface ReceiptLine {
  title: string;
  amount: number;
}

export interface ReceiptInput {
  reference: string;
  customerName: string;
  customerEmail: string;
  lines: ReceiptLine[];
  total: number;
  currency?: string;
  date?: Date;
}

export function generateReceiptPdf(input: ReceiptInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  // Header band
  doc.setFillColor(99, 102, 241); // indigo
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Silicon Edge Consulting", margin, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Payment Receipt", margin, 72);

  y = 130;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Receipt No.", margin, y);
  doc.text("Date", pageWidth - margin - 120, y);
  doc.setFont("helvetica", "normal");
  doc.text(input.reference, margin, y + 14);
  doc.text((input.date ?? new Date()).toLocaleString(), pageWidth - margin - 120, y + 14);

  y += 50;
  doc.setFont("helvetica", "bold");
  doc.text("Billed To", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(input.customerName || "—", margin, y + 14);
  doc.text(input.customerEmail, margin, y + 28);

  y += 64;
  // Table header
  doc.setFillColor(245, 245, 250);
  doc.rect(margin, y, pageWidth - margin * 2, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Item", margin + 12, y + 17);
  doc.text("Amount", pageWidth - margin - 12, y + 17, { align: "right" });
  y += 32;

  doc.setFont("helvetica", "normal");
  for (const line of input.lines) {
    if (y > 720) { doc.addPage(); y = margin; }
    const wrapped = doc.splitTextToSize(line.title, pageWidth - margin * 2 - 130);
    doc.text(wrapped, margin + 12, y);
    doc.text(formatNaira(line.amount), pageWidth - margin - 12, y, { align: "right" });
    y += Math.max(18, wrapped.length * 14);
    doc.setDrawColor(230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total Paid", margin + 12, y);
  doc.text(formatNaira(input.total), pageWidth - margin - 12, y, { align: "right" });

  y += 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Thank you for choosing Silicon Edge Consulting.", margin, y);
  doc.text("Need help? Email support@siliconedgeconsulting.com", margin, y + 14);

  return doc;
}

export function downloadReceiptPdf(input: ReceiptInput) {
  const doc = generateReceiptPdf(input);
  doc.save(`receipt-${input.reference}.pdf`);
}