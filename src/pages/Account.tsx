import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Profile { full_name: string | null; avatar_url: string | null }
interface Order { id: string; reference: string; amount: number; currency: string; status: string; created_at: string; course_id: string }
interface Notif { id: string; title: string; message: string | null; type: string | null; link: string | null; is_read: boolean; created_at: string }

export default function Account() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile>({ full_name: "", avatar_url: "" });
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: o }, { data: n }] = await Promise.all([
        supabase.from("profiles").select("full_name,avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id,reference,amount,currency,status,created_at,course_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("notifications").select("id,title,message,type,link,is_read,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (p) setProfile({ full_name: p.full_name, avatar_url: p.avatar_url });
      setOrders((o as Order[]) ?? []);
      setNotifs((n as Notif[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/sign-in?redirect=/account" replace />;

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    else toast({ title: "Profile saved" });
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My Account" description="Manage your profile, orders, and notifications." canonical="/account" />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 py-12 max-w-4xl">
        <h1 className="font-heading text-3xl font-bold mb-6">My Account</h1>
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="grid gap-4 max-w-md">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email ?? ""} disabled />
              </div>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input id="avatar" value={profile.avatar_url ?? ""} onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} />
              </div>
              <Button onClick={saveProfile} disabled={saving} className="w-fit">{saving ? "Saving…" : "Save changes"}</Button>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : orders.length === 0 ? (
              <p className="text-muted-foreground">No orders yet. <Link to="/courses" className="text-primary underline">Browse courses</Link>.</p>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t border-border">
                        <td className="p-3 font-mono text-xs">{o.reference}</td>
                        <td className="p-3">{o.currency} {Number(o.amount).toLocaleString()}</td>
                        <td className="p-3 capitalize">{o.status}</td>
                        <td className="p-3">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="p-3"><Link to={`/orders/${o.id}`} className="text-primary text-xs">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="mt-6 space-y-2">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : notifs.length === 0 ? (
              <p className="text-muted-foreground">No notifications.</p>
            ) : notifs.map((n) => (
              <div key={n.id} className={`rounded-xl border p-4 ${n.is_read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    {n.message && <p className="text-sm text-muted-foreground mt-1">{n.message}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {n.link && <Link to={n.link} className="text-xs text-primary underline">Open</Link>}
                    {!n.is_read && <button onClick={() => markRead(n.id)} className="text-xs text-muted-foreground hover:text-primary">Mark read</button>}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}