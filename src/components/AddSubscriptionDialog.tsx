"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubscriptionForm } from "@/components/SubscriptionForm";

interface AddSubscriptionDialogProps {
  onSuccess?: () => void;
}

export function AddSubscriptionDialog({
  onSuccess,
}: AddSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-2 bg-white text-black hover:bg-zinc-200 font-medium text-[13px] h-9 px-4 rounded-lg">
            <Plus className="h-4 w-4" />
            添加订阅
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[440px] bg-[#111114] border-white/[0.08] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-white text-[16px]">
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
