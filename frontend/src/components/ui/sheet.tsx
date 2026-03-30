"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>): React.JSX.Element {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

export function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>): React.JSX.Element {
  return <DialogPrimitive.Overlay data-slot="sheet-overlay" className={cn("fixed inset-0 z-50 bg-black/35", className)} {...props} />;
}

type SheetContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
};

export function SheetContent({ className, children, side = "right", ...props }: SheetContentProps): React.JSX.Element {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-4 border bg-background p-6 shadow-sm",
          side === "right" && "inset-y-0 right-0 h-full w-full max-w-md",
          side === "left" && "inset-y-0 left-0 h-full w-full max-w-md",
          side === "top" && "inset-x-0 top-0 h-auto w-full",
          side === "bottom" && "inset-x-0 bottom-0 h-auto w-full",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return <div data-slot="sheet-header" className={cn("space-y-1.5", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>): React.JSX.Element {
  return <DialogPrimitive.Title data-slot="sheet-title" className={cn("text-base font-semibold", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>): React.JSX.Element {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex items-center justify-end gap-2", className)} {...props} />;
}
