import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, actions, className }: DialogProps): React.ReactElement {
  return (
    <RadixDialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm" />
        <RadixDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-sm bg-surface shadow-dialog border-t-4 border-t-gold",
            "focus:outline-none",
            className
          )}
        >
          <div className="flex items-start justify-between border-b border-ivory-dark p-6 pb-4">
            <RadixDialog.Title className="font-display text-xl font-semibold text-ink">
              {title}
            </RadixDialog.Title>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="ml-4 rounded-sm p-1 text-disabled hover:text-ink focus:outline-none focus:ring-2 focus:ring-jade"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6 font-body text-sm text-ink">
            {children}
          </div>
          {actions && (
            <div className="flex justify-end gap-3 border-t border-ivory-dark px-6 py-4">
              {actions}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
