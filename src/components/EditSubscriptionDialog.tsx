"use client";

import { SubscriptionForm } from "@/components/SubscriptionForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Subscription } from "@/lib/subscriptions";

interface EditSubscriptionDialogProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditSubscriptionDialog({
  subscription,
  open,
  onOpenChange,
  onSuccess,
}: EditSubscriptionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border-white/[0.08] bg-[#111114] sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] text-white">编辑订阅</DialogTitle>
        </DialogHeader>
        {subscription && (
          <SubscriptionForm
            subscription={subscription}
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

