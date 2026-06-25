import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllRows } from "@/lib/fetch-all";
import { useLocalizedPrice } from "@/hooks/useLocalizedPrice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PAID = ["paid", "success", "completed", "confirmed"];

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminTaxReport() {
  const { format } = useLocalizedPrice();
  const { toast } = useToast();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [rate, setRate] = useState<number>(7.5);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["tax-orders"],
    queryFn: () => fetchAllRows<any>("orders", "id, amount, status, created_at"),
  });

  const rows = useMemo(() => {
    const r = rate / 100;
    const months = Array.from({ length: 12 }, (_, i) => ({ i, gross: 0, vat: 0, net: 0 }));
    (orders as any[]).forEach((o) => {
      if (!PAID.includes(String(o.status).toLowerCase())) return;
      const d = new Date(o.created_at);
      if (d.getFullYear() !== year) return;
      const gross = Number(o.amount || 0);
      const vat = gross * r / (1 + r);
      months[d.getMonth()].gross += gross;
      months[d.getMonth()].vat += vat;
      months[d.getMonth()].net += gross - vat;
    });
    return months;
  }, [orders, year, rate]);

  const totals = rows.reduce((acc, m) => ({ gross: acc.gross + m.gross, vat: acc.vat + m.vat, net: acc.net + m.net }), { gross: 0, vat: 0, net: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Tax report</h2>
          <p className="text-xs text-muted-foreground">VAT estimate from paid orders. Treat as guidance, not an audited statement.</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs">Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || year)} className="w-24" />
          </div>
          <div>
            <Label className="text-xs">Tax rate %</Label>
            <Input type="number" step="0.1" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} className="w-24" />
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            downloadCSV(`tax-${year}.csv`, ["Month", "Gross", "VAT", "Net"], rows.map((m) => [new Date(year, m.i, 1).toLocaleString("default", { month: "long" }), m.gross.toFixed(2), m.vat.toFixed(2), m.net.toFixed(2)]));
            toast({ title: "Exported", description: `Tax CSV for ${year} downloaded.` });
          }}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading orders...</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Month</th>
                <th className="text-right px-4 py-3 font-semibold">Gross</th>
                <th className="text-right px-4 py-3 font-semibold">VAT</th>
                <th className="text-right px-4 py-3 font-semibold">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.i} className="border-t border-border hover:bg-muted/10">
                  <td className="px-4 py-2.5">{new Date(year, m.i, 1).toLocaleString("default", { month: "long" })}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{format(m.gross)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{format(m.vat)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{format(m.net)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                <td className="px-4 py-3">Total {year}</td>
                <td className="px-4 py-3 text-right font-mono">{format(totals.gross)}</td>
                <td className="px-4 py-3 text-right font-mono">{format(totals.vat)}</td>
                <td className="px-4 py-3 text-right font-mono">{format(totals.net)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}