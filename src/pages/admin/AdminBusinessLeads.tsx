import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Briefcase, Mail, Phone, Users, Clock, Eye, GripVertical, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const STATUSES = [
  { id: "new", label: "New", color: "border-t-blue-500" },
  { id: "contacted", label: "Contacted", color: "border-t-amber-500" },
  { id: "qualified", label: "Qualified", color: "border-t-purple-500" },
  { id: "converted", label: "Converted", color: "border-t-green-500" },
  { id: "lost", label: "Lost", color: "border-t-red-500" },
] as const;

export default function AdminBusinessLeads() {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-business-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("business_leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-leads"] });
      toast({ title: "Lead moved" });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, internal_notes }: { id: string; internal_notes: string }) => {
      const { error } = await supabase.from("business_leads").update({ internal_notes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-leads"] });
      toast({ title: "Notes saved" });
    },
  });

  const onDragStart = (id: string) => setDraggedId(id);
  const onDragOver = (e: React.DragEvent, status: string) => { e.preventDefault(); setOverCol(status); };
  const onDrop = (status: string) => {
    if (draggedId) {
      const lead = leads?.find((l) => l.id === draggedId);
      if (lead && lead.status !== status) updateStatus.mutate({ id: draggedId, status });
    }
    setDraggedId(null); setOverCol(null);
  };

  const openLead = (lead: any) => {
    setSelectedLead(lead);
    setNotes(lead.internal_notes ?? "");
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Business Leads CRM</h1>
          <p className="text-sm text-muted-foreground">
            Drag leads between stages to update status ({leads?.length ?? 0} total)
          </p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto pb-4">
          {STATUSES.map((col) => {
            const colLeads = leads?.filter((l) => l.status === col.id) ?? [];
            return (
              <div
                key={col.id}
                onDragOver={(e) => onDragOver(e, col.id)}
                onDrop={() => onDrop(col.id)}
                className={`bg-muted/30 rounded-xl p-3 min-h-[400px] border-t-4 ${col.color} ${overCol === col.id ? "bg-muted/60 ring-2 ring-primary/30" : ""}`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-heading font-semibold text-sm">{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{colLeads.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => onDragStart(lead.id)}
                      onClick={() => openLead(lead)}
                      className="bg-card rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{lead.company_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.contact_name}</p>
                          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{lead.email}</p>
                          {lead.company_size && (
                            <Badge variant="outline" className="text-[10px] mt-2">{lead.company_size}</Badge>
                          )}
                          {lead.internal_notes && (
                            <StickyNote className="h-3 w-3 text-amber-500 mt-1.5 inline" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!colLeads.length && (
                    <div className="text-center text-xs text-muted-foreground/40 py-6">Drop leads here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{selectedLead?.company_name}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{selectedLead.contact_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
              </div>
              {selectedLead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedLead.phone}</span>
                </div>
              )}
              {selectedLead.company_size && <div><strong>Team Size:</strong> {selectedLead.company_size}</div>}
              {selectedLead.industry && <div><strong>Industry:</strong> {selectedLead.industry}</div>}
              {selectedLead.training_needs && (
                <div>
                  <strong>Training Needs:</strong>
                  <p className="mt-1 text-muted-foreground">{selectedLead.training_needs}</p>
                </div>
              )}
              <div>
                <strong className="block mb-1">Internal Notes</strong>
                <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Track conversations, next steps…" />
                <Button size="sm" className="mt-2" onClick={() => updateNotes.mutate({ id: selectedLead.id, internal_notes: notes })} disabled={updateNotes.isPending}>
                  Save Notes
                </Button>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">{new Date(selectedLead.created_at).toLocaleString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
