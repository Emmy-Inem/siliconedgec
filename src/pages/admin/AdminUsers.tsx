import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const columns: Column<Profile>[] = [
  { key: "full_name", label: "Name", render: (p) => p.full_name || "—" },
  { key: "user_id", label: "User ID", render: (p) => <span className="font-mono text-xs">{p.user_id.slice(0, 8)}...</span> },
  { key: "bio", label: "Bio", render: (p) => <span className="line-clamp-1 max-w-xs">{p.bio || "—"}</span> },
  { key: "created_at", label: "Joined", render: (p) => new Date(p.created_at).toLocaleDateString() },
];

export default function AdminUsers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: "", bio: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("profiles").update(form).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setDialogOpen(false); toast({ title: "User updated" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast({ title: "User profile deleted" }); },
  });

  return (
    <>
      <AdminCrudTable title="Users" data={data} columns={columns} isLoading={isLoading} addLabel="(Users self-register)"
        onAdd={() => toast({ title: "Info", description: "Users create accounts via the Sign Up page." })}
        onEdit={(p) => { setEditing(p); setForm({ full_name: p.full_name ?? "", bio: p.bio ?? "" }); setDialogOpen(true); }}
        onDelete={(id) => del.mutate(id)}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit User Profile</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div><label className="text-sm font-medium block mb-1">Full Name</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div><label className="text-sm font-medium block mb-1">Bio</label><textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
