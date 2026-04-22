import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ShoppingCart, Search, Loader2, Mail, Clock, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNaira } from "@/lib/format-currency";

export default function AdminCartAbandonment() {
  const [search, setSearch] = useState("");
  const [minAgeHours, setMinAgeHours] = useState(24);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-cart-items"],
    queryFn: async () => (await supabase.from("cart_items").select("*").order("created_at", { ascending: false }).limit(1000)).data ?? [],
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-cart-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, title, price")).data ?? [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-cart-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("user_id, full_name")).data ?? [],
  });

  const courseFor = (id: string) => courses.find((c: any) => c.id === id);
  const userName = (id: string) => profiles.find((p: any) => p.user_id === id)?.full_name ?? id.slice(0, 8);

  const grouped = useMemo(() => {
    const cutoff = Date.now() - minAgeHours * 3600_000;
    const byUser: Record<string, any[]> = {};
    items.forEach((it: any) => {
      if (+new Date(it.created_at) > cutoff) return;
      (byUser[it.user_id] ||= []).push(it);
    });
    return Object.entries(byUser).map(([uid, list]) => ({
      user_id: uid,
      name: userName(uid),
      count: list.length,
      total: list.reduce((s, x) => s + Number(courseFor(x.course_id)?.price ?? 0), 0),
      oldest: Math.min(...list.map((x) => +new Date(x.created_at))),
      titles: list.map((x) => courseFor(x.course_id)?.title ?? "—"),
    })).filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.oldest - b.oldest);
  }, [items, minAgeHours, search, courses, profiles]);

  const exportCsv = () => {
    const header = ["User", "Items", "Total Value", "Oldest Item", "Courses"];
    const lines = grouped.map((g) => [g.name, g.count, g.total, new Date(g.oldest).toISOString(), g.titles.join("; ")]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `cart-abandonment-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Cart Abandonment</h1>
            <p className="text-sm text-muted-foreground">Carts older than {minAgeHours}h that never converted</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by user..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Input type="number" min={1} value={minAgeHours} onChange={(e) => setMinAgeHours(Math.max(1, Number(e.target.value) || 1))} />
          <span className="text-xs text-muted-foreground">hrs</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
          ) : grouped.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No abandoned carts in this window.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Cart Value</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Oldest</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((g) => (
                  <TableRow key={g.user_id}>
                    <TableCell className="font-medium text-sm">{g.name}</TableCell>
                    <TableCell>{g.count}</TableCell>
                    <TableCell className="font-medium">{formatNaira(g.total)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">{g.titles.join(", ")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(g.oldest).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`mailto:?subject=Complete your purchase on Silicon Edge&body=Hi ${g.name},%0D%0A%0D%0AYou left ${g.count} item(s) in your cart...`}>
                          <Mail className="h-3.5 w-3.5 mr-1" /> Recover
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}