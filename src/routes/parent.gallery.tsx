import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveChildData } from "@/lib/hooks/useChildren";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/parent/gallery")({
  component: Gallery,
});

function Gallery() {
  const { data: child } = useActiveChildData();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["gallery", child?.id],
    enabled: !!child?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drawing_gallery")
        .select("id, title, image_data_url, activity_type, created_at")
        .eq("child_id", child!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    await supabase.from("drawing_gallery").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["gallery"] });
    toast.success("Removed");
  }

  if (isLoading) return <p className="text-center text-muted-foreground">Loading…</p>;
  if (!data || data.length === 0) {
    return <div className="rounded-3xl bg-card p-8 text-center text-muted-foreground">No drawings yet. Open the Draw tab to make some art! 🎨</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 pb-4">
      {data.map((d) => (
        <div key={d.id} className="overflow-hidden rounded-3xl bg-card shadow-md">
          <img src={d.image_data_url} alt={d.title} className="aspect-square w-full object-cover" />
          <div className="flex items-center justify-between p-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{d.title}</p>
              <p className="text-[10px] uppercase text-muted-foreground">{d.activity_type}</p>
            </div>
            <button onClick={() => remove(d.id)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}