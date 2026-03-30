import { Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Confirmed</TableHead>
          <TableHead>Subscribed</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subscribers.map((subscriber) => (
          <TableRow key={subscriber.id}>
            <TableCell className="text-sm font-medium">{subscriber.email}</TableCell>
            <TableCell>
              <Badge
                className={
                  subscriber.confirmed_at
                    ? "bg-green-500/15 text-green-700 dark:text-green-300"
                    : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300"
                }
              >
                {subscriber.confirmed_at ? "Confirmed" : "Pending"}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatRelative(subscriber.created_at)}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="size-4" />
                      Remove
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
                        Remove subscriber
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
