"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubscriptionForm } from "@/components/SubscriptionForm";

interface AddSubscriptionDialogProps {
  onSuccess?: () => void;
}

export function AddSubscriptionDialog({ onSuccess }: AddSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-9 gap-2 rounded-lg bg-white px-4 text-[13px] font-medium text-black hover:bg-zinc-200">
            <Plus className="h-4 w-4" />
            添加订阅
          </Button>
        }
      />
      <DialogContent className="rounded-lg border-white/[0.08] bg-[#111114] sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] text-white">
            添加新订阅
          </DialogTitle>
        </DialogHeader>
        <SubscriptionForm
          subscription={null}
          onSuccess={() => {
            onSuccess?.();
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

