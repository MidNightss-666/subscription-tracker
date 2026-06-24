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
      <DialogContent className="rounded-lg border-border/70 bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xl sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] text-foreground">编辑订阅</DialogTitle>
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
