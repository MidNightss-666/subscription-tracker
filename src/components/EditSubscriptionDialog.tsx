"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubscriptionForm } from "@/components/SubscriptionForm";
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
      <DialogContent className="sm:max-w-[440px] bg-[#111114] border-white/[0.08] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-white text-[16px]">
            编辑订阅
          </DialogTitle>
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
