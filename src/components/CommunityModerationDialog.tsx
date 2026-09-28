import { useState } from "react";
import { ShieldX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export type CommunityModerationAction = "hide" | "delete";

type CommunityModerationDialogProps = {
  messageId: string | null;
  action: CommunityModerationAction;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void | Promise<void>;
};

export function CommunityModerationDialog({
  messageId,
  action,
  onOpenChange,
  onCompleted,
}: CommunityModerationDialogProps) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const permanent = action === "delete";
  const valid = reason.trim().length >= 3 && (!permanent || confirmation === "EXCLUIR");

  function close() {
    if (busy) return;
    setReason("");
    setConfirmation("");
    onOpenChange(false);
  }

  async function submit() {
    if (!messageId || !valid) return;
    setBusy(true);
    const { error } = await supabase.rpc("moderate_community_message", {
      _message_id: messageId,
      _action: action,
      _reason: reason.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("administradores") ? "Acesso restrito aos administradores." : "Não foi possível moderar a mensagem.");
      return;
    }
    toast.success(permanent ? "Mensagem excluída definitivamente." : "Mensagem ocultada pela moderação.");
    setReason("");
    setConfirmation("");
    onOpenChange(false);
    await onCompleted();
  }

  return (
    <Dialog open={messageId !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-lg bg-card p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {permanent ? <Trash2 className="size-5 text-destructive" /> : <ShieldX className="size-5 text-primary" />}
            {permanent ? "Excluir definitivamente?" : "Ocultar pela moderação?"}
          </DialogTitle>
          <DialogDescription>
            {permanent
              ? "A mensagem será apagada e não poderá ser recuperada. O histórico administrativo será preservado."
              : "O conteúdo ficará oculto para todos e poderá ser consultado somente no histórico administrativo."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            aria-label="Motivo da moderação"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            placeholder="Informe o motivo"
          />
          {permanent && (
            <div>
              <label htmlFor="delete-confirmation" className="text-xs font-medium text-muted-foreground">Digite EXCLUIR para confirmar</label>
              <input
                id="delete-confirmation"
                className="ep-input mt-1"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
                autoComplete="off"
              />
            </div>
          )}
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2 sm:space-x-0">
          <Button variant="outline" disabled={busy} onClick={close}>Cancelar</Button>
          <Button variant={permanent ? "destructive" : "default"} disabled={busy || !valid} onClick={() => void submit()}>
            {busy ? "Aguarde…" : permanent ? "Excluir" : "Ocultar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}