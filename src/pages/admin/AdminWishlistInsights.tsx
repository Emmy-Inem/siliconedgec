import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Bookmark, Loader2, Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminWishlistInsights() {
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["admin-bookmarks"],
    queryFn: async () => (await supabase.from("bookmarks").select("*").order("created_at", { ascending: false }).limit(2000)).data ?? [],
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-bm-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, title, price")).data ?? [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-bm-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("user_id, full_name")).data ?? [],
  });
  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-bm-enrollments"],
    queryFn: async () => (await supabase.from("enrollments").select("user_id, course_id")).data ?? [],
  });

  const courseTitle = (id: string) => courses.find((c: any) => c.id === id)?.title ?? "—";
  const userName = (id: string) => profiles.find((p: any) => p.user_id === id)?.full_name ?? id.slice(0, 8);
  const enrolled = useMemo(() => new Set(enrollments.map((e: any) => `${e.user_id}_${e.course_id}`)), [enrollments]);

  const topCourses = useMemo(() => {
    const counts: Record<string, number> = {};
    bookmarks.forEach((b: any) => { counts[b.course_id] = (counts[b.course_id] ?? 0) + 1; });
    return Object.entries(counts).map(([id, count]) => ({ id, count, title: courseTitle(id) }))
      .sort((a, b) => b.count - a.count).slice(0, 20);
  }, [bookmarks, courses]);

  const abandoned = useMemo(() =>
    bookmarks.filter((b: any) => !enrolled.has(`${b.user_id}_${b.course_id}`)).slice(0, 200)
  , [bookmarks, enrolled]);

  const exportCsv = () => {
    const header = ["User", "Course", "Bookmarked At"];
    const lines = abandoned.map((b: any) => [userName(b.user_id), courseTitle(b.course_id), new Date(b.created_at).toISOString()]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `wishlist-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Bookmark className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Wishlist Insights</h1>
            <p className="text-sm text-muted-foreground">{bookmarks.length} total bookmarks · retarget abandoned interest</p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export Abandoned</Button>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="font-heading text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Top wishlisted courses</h2>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
              <div className="space-y-1.5">
                {topCourses.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{i + 1}. {c.title}</span>
                    <Badge variant="secondary" className="text-[10px]">{c.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <h2 className="font-heading text-sm font-semibold">Abandoned interest <span className="text-muted-foreground">(bookmarked, not enrolled)</span></h2>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abandoned.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-sm">{userName(b.user_id)}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{courseTitle(b.course_id)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}