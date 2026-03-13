import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCrudTable, Column } from "@/components/admin/AdminCrudTable";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Shield, ShieldCheck, User } from "lucide-react";
import { logAdminActivity } from "@/lib/admin-logger";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface ProfileWithRole extends Profile {
  role?: string;
}

const ROLE_BADGE: Record<string, { icon: typeof Shield; class: string; label: string }> = {
  admin: { icon: ShieldCheck, label: "Admin", class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  moderator: { icon: Shield, label: "Moderator", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  user: { icon: User, label: "User", class: "bg-muted text-muted-foreground" },
};

const columns: Column<ProfileWithRole>[] = [
  { key: "full_name", label: "Name", render: (p) => p.full_name || "—" },
  { key: "user_id", label: "User ID", render: (p) => <span className="font-mono text-xs">{p.user_id.slice(0, 8)}...</span> },
  {
    key: "role", label: "Role", render: (p) => {
      const r = ROLE_BADGE[p.role ?? "user"] ?? ROLE_BADGE.user;
      const Icon = r.icon;
      return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${r.class}`}>
          <Icon className="h-3 w-3" /> {r.label}
        </span>
      );
    }
  },
  { key: "bio", label: "Bio", render: (p) => <span className="line-clamp-1 max-w-xs">{p.bio || "—"}</span> },
  { key: "created_at", label: "Joined", render: (p) => new Date(p.created_at).toLocaleDateString() },
];

export default function AdminUsers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileWithRole | null>(null);
  const [form, setForm] = useState({ full_name: "", bio: "", role: "user" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const roleMap = new Map<string, string>();
      (rolesRes.data ?? []).forEach((r) => roleMap.set(r.user_id, r.role));

      return (profilesRes.data ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.user_id) ?? "user",
      })) as ProfileWithRole[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error: profileErr } = await supabase.from("profiles").update({ full_name: form.full_name, bio: form.bio }).eq("id", editing.id);
      if (profileErr) throw profileErr;

      const currentRole = editing.role ?? "user";
      if (form.role !== currentRole) {
        await supabase.from("user_roles").delete().eq("user_id", editing.user_id);
        if (form.role !== "user") {
          const { error: roleErr } = await supabase.from("user_roles").insert({
            user_id: editing.user_id,
            role: form.role as "admin" | "moderator" | "user",
          });
          if (roleErr) throw roleErr;
        }
        await logAdminActivity("update_role", "user", editing.user_id, { from: currentRole, to: form.role });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setDialogOpen(false); toast({ title: "User updated" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <AdminCrudTable title="Users" data={data} columns={columns} isLoading={isLoading} addLabel="(Users self-register)"
        onAdd={() => toast({ title: "Info", description: "Users create accounts via the Sign Up page." })}
        onEdit={(p) => { setEditing(p); setForm({ full_name: p.full_name ?? "", bio: p.bio ?? "", role: p.role ?? "user" }); setDialogOpen(true); }}
        onDelete={() => toast({ title: "Not allowed", description: "User profiles cannot be deleted from the admin panel for security reasons.", variant: "destructive" })}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit User Profile</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Full Name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Role</label>
              <div className="flex gap-2">
                {(["user", "moderator", "admin"] as const).map((r) => {
                  const badge = ROLE_BADGE[r];
                  const Icon = badge.icon;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        form.role === r
                          ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {badge.label}
                    </button>
                  );
                })}
              </div>
            </div>
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
