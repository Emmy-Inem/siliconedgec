import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Award, Search, Loader2, Download, Trash2, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function AdminCertificates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ["admin-certificates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificates").select("*").order("issued_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-cert-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, title")).data ?? [],
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-cert-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("user_id, full_name")).data ?? [],
  });

  const courseTitle = (id: string) => courses.find((c: any) => c.id === id)?.title ?? "—";
  const profileName = (id: string) => profiles.find((p: any) => p.user_id === id)?.full_name ?? "—";

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("certificates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-certificates"] });
      toast({ title: "Certificate revoked" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    if (!search) return certs;
    const q = search.toLowerCase();
    return certs.filter((c: any) =>
      c.verification_code.toLowerCase().includes(q) ||
      profileName(c.user_id).toLowerCase().includes(q) ||
      courseTitle(c.course_id).toLowerCase().includes(q)
    );
  }, [certs, search, courses, profiles]);

  const exportCsv = () => {
    const header = ["Verification Code", "Student", "Course", "Issued At"];
    const lines = filtered.map((c: any) => [
      c.verification_code, profileName(c.user_id), courseTitle(c.course_id), new Date(c.issued_at).toISOString(),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificates-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Award className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Certificates Manager</h1>
            <p className="text-sm text-muted-foreground">{certs.length} issued · search, verify, revoke</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </motion.div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by verification code, student or course..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No certificates yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Verification Code</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">{c.verification_code}</TableCell>
                    <TableCell className="text-sm">{profileName(c.user_id)}</TableCell>
                    <TableCell className="text-sm max-w-[260px] truncate">{courseTitle(c.course_id)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.issued_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <a href={`/verify/${c.verification_code}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Verify
                          </a>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => {
                          if (confirm(`Revoke certificate ${c.verification_code}? This cannot be undone.`)) revoke.mutate(c.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                        </Button>
                      </div>
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