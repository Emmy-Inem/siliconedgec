import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { motion } from "framer-motion";
import { Bookmark, Loader2, Download, TrendingUp, Eye, Copy, ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AdminWishlistInsights() {
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["admin-bookmarks"],
    queryFn: async () => await fetchAllRows<any>("bookmarks", "*"),
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-bm-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, title, price")).data ?? [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-bm-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("user_id, full_name, bio")).data ?? [],
  });
  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-bm-enrollments"],
    queryFn: async () => await fetchAllRows<any>("enrollments", "user_id, course_id"),
  });

  const courseTitle = (id: string) => courses.find((c: any) => c.id === id)?.title ?? "—";
  const userName = (id: string) => profiles.find((p: any) => p.user_id === id)?.full_name ?? id.slice(0, 8);
  const enrolled = useMemo(() => new Set(enrollments.map((e: any) => `${e.user_id}_${e.course_id}`)), [enrollments]);
  const profileFor = (id: string) => profiles.find((p: any) => p.user_id === id);

  const openUserBookmarks = useMemo(() => {
    if (!openUserId) return [];
    return bookmarks.filter((b: any) => b.user_id === openUserId);
  }, [openUserId, bookmarks]);

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
                    <TableRow key={b.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpenUserId(b.user_id)}>
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

      <Dialog open={!!openUserId} onOpenChange={(o) => !o && setOpenUserId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">{openUserId ? userName(openUserId) : "User"}</DialogTitle>
          </DialogHeader>
          {openUserId && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{openUserBookmarks.length} bookmark(s)</Badge>
                <Badge variant="outline">{openUserBookmarks.filter((b: any) => enrolled.has(`${b.user_id}_${b.course_id}`)).length} converted</Badge>
              </div>
              {profileFor(openUserId)?.bio && (
                <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2 italic">{profileFor(openUserId)?.bio}</p>
              )}
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Wishlist</p>
                {openUserBookmarks.map((b: any) => {
                  const isEnrolled = enrolled.has(`${b.user_id}_${b.course_id}`);
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-md bg-muted/40">
                      <span className="truncate">{courseTitle(b.course_id)}</span>
                      {isEnrolled ? (
                        <Badge className="text-[9px] gap-1 shrink-0"><CheckCircle2 className="h-2.5 w-2.5" /> Enrolled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] gap-1 shrink-0"><Circle className="h-2.5 w-2.5" /> Pending</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(openUserId!); toast({ title: "Copied user ID" }); }}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy ID
                </Button>
                <Button size="sm" asChild>
                  <Link to={`/admin/analytics?tab=user-activity&user=${openUserId}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View activity
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}