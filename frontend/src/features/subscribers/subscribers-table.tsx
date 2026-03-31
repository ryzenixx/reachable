import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelative } from "@/lib/dates";
import type { Subscriber } from "@/types/api";

type SubscribersTableProps = {
  onDeleteSubscriber: (subscriber: Subscriber) => Promise<void>;
  subscribers: Subscriber[];
};

export function SubscribersTable({ onDeleteSubscriber, subscribers }: SubscribersTableProps): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-neutral-100">
          <TableHead className="">Email</TableHead>
          <TableHead className="">Status</TableHead>
          <TableHead className="">Subscribed</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {subscribers.map((subscriber) => (
          <TableRow key={subscriber.id} className="border-neutral-100">
            <TableCell className="text-sm font-medium text-neutral-900">{subscriber.email}</TableCell>
            <TableCell>
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                subscriber.confirmed_at ? "text-green-600" : "text-neutral-400",
              )}>
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  subscriber.confirmed_at ? "bg-green-500" : "bg-neutral-300",
                )} />
                {subscriber.confirmed_at ? "Confirmed" : "Pending"}
              </span>
            </TableCell>
            <TableCell className="text-xs text-neutral-400">{formatRelative(subscriber.created_at)}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="h-7 px-2 text-neutral-400 hover:text-red-600" size="sm" variant="ghost">
                      <Trash2 className="size-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove subscriber</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes {subscriber.email} from future notifications.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                      <AlertDialogActionButton onClick={() => void onDeleteSubscriber(subscriber)}>
                        Remove
                      </AlertDialogActionButton>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
