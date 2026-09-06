import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Trash2, AlertTriangle, User, LogOut } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export function ProfileSettings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, bio, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, bio, avatar_url: avatarUrl })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("course-thumbnails")
      .upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
    toast({ title: "Avatar uploaded — don't forget to save." });
  };

  const handleDelete = async () => {
    if (!user) return;
    if (confirmText !== "DELETE") {
      toast({ title: "Confirmation required", description: "Type DELETE to confirm.", variant: "destructive" });
      return;
    }
    // Soft-delete: anonymise profile + sign out. Hard auth deletion needs an edge function with service role.
    const { error: profileErr } = await supabase.from("profiles").update({
      full_name: "Deleted user",
      bio: null,
      avatar_url: null,
    }).eq("user_id", user.id);
    const { error: bookmarksErr } = await supabase.from("bookmarks").delete().eq("user_id", user.id);
    const { error: cartErr } = await supabase.from("cart_items").delete().eq("user_id", user.id);
    const failures = [
      profileErr && "profile",
      bookmarksErr && "bookmarks",
      cartErr && "cart",
    ].filter(Boolean);
    if (failures.length) {
      toast({
        title: "Couldn't fully remove account data",
        description: `Failed: ${failures.join(", ")}. Please try again or contact support.`,
        variant: "destructive",
      });
      return;
    }
    await signOut();
    toast({ title: "Account data removed", description: "You've been signed out." });
    navigate("/");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-primary" /> Profile settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Profile picture</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={() => document.getElementById("avatar-upload")?.click()}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                {uploading ? "Uploading…" : "Upload new"}
              </Button>
              {avatarUrl && (
                <Button size="sm" variant="ghost" onClick={() => setAvatarUrl("")}>Remove</Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} disabled />
          <p className="text-[11px] text-muted-foreground">Email is managed by your sign-in provider.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a bit about yourself…" />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save changes
          </Button>
        </div>

        <div className="border-t border-border pt-5 mt-5">
          <h4 className="font-heading font-semibold text-sm mb-1">Active sessions</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Lost a device? Sign out everywhere except this browser to protect your account.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const { error } = await supabase.auth.signOut({ scope: "others" });
              if (error) toast({ title: "Couldn't sign out other sessions", description: error.message, variant: "destructive" });
              else toast({ title: "Signed out of other devices" });
            }}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out other devices
          </Button>
        </div>

        <div className="border-t border-border pt-5 mt-5">
          <h4 className="font-heading font-semibold text-sm flex items-center gap-2 text-destructive mb-1">
            <AlertTriangle className="h-4 w-4" /> Danger zone
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Removing your account anonymises your profile and clears your cart and bookmarks. Course enrolments and certificates remain for legal/audit reasons.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete my account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action can't be undone. Type <strong>DELETE</strong> below to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Delete forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
