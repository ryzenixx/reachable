"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { formatRelativePrecise } from "@/lib/dates";
import type { Monitor, Service } from "@/types/api";
import { MonitorTypeBadge } from "@/components/status/monitor-type-badge";
import { StatusBadge } from "@/components/status/status-badge";
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
import { MonitorSparkline } from "./monitor-sparkline";
import { monitorStatusToServiceStatus } from "./monitor-status";

type MonitorSection = {
  service: Service;
  monitors: Monitor[];
};

type MonitorSectionsTableProps = {
  sections: MonitorSection[];
  onCreateMonitor: (serviceId?: string) => void;
  onDeleteMonitor: (monitor: Monitor) => Promise<void>;
  onEditMonitor: (monitor: Monitor) => void;
};

export function MonitorSectionsTable({
  sections,
  onCreateMonitor,
  onDeleteMonitor,
  onEditMonitor,
}: MonitorSectionsTableProps): React.JSX.Element {
  return (
    <div className="space-y-8">
      {sections.map(({ service, monitors }) => (
        <div key={service.id}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-900">{service.name}</h2>
            <Button className="h-7 text-xs" onClick={() => onCreateMonitor(service.id)} size="sm" variant="ghost">
              <Plus className="size-3" />
              Add
            </Button>
          </div>

          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-neutral-100">
                <TableHead className="w-[34%] min-w-[200px] text-xs font-medium uppercase tracking-wider text-neutral-400">Target</TableHead>
                <TableHead className="w-[80px] text-xs font-medium uppercase tracking-wider text-neutral-400">Type</TableHead>
                <TableHead className="w-[80px] text-xs font-medium uppercase tracking-wider text-neutral-400">Interval</TableHead>
                <TableHead className="w-[120px] text-xs font-medium uppercase tracking-wider text-neutral-400">Status</TableHead>
                <TableHead className="w-[90px] text-xs font-medium uppercase tracking-wider text-neutral-400">Response</TableHead>
                <TableHead className="w-[130px] text-xs font-medium uppercase tracking-wider text-neutral-400">Checked</TableHead>
                <TableHead className="w-[120px] text-xs font-medium uppercase tracking-wider text-neutral-400">Trend</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {monitors.map((monitor) => (
                <TableRow key={monitor.id} className="border-neutral-100">
                  <TableCell className="max-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{monitor.url}</p>
                  </TableCell>
                  <TableCell>
                    <MonitorTypeBadge type={monitor.type} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-neutral-500">{monitor.interval_seconds}s</TableCell>
                  <TableCell>
                    <StatusBadge status={monitorStatusToServiceStatus(monitor)} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-neutral-500">
                    {monitor.latest_check ? `${monitor.latest_check.response_time_ms}ms` : "\u2014"}
                  </TableCell>
                  <TableCell className="text-xs text-neutral-400">
                    {monitor.latest_check ? formatRelativePrecise(monitor.latest_check.checked_at) : "Never"}
                  </TableCell>
                  <TableCell>
                    <MonitorSparkline monitor={monitor} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button className="h-7 px-2 text-neutral-500" onClick={() => onEditMonitor(monitor)} size="sm" variant="ghost">
                        <Pencil className="size-3" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="h-7 px-2 text-neutral-400 hover:text-red-600" size="sm" variant="ghost">
                            <Trash2 className="size-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete monitor</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes check history for {monitor.url}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                            <AlertDialogActionButton onClick={() => void onDeleteMonitor(monitor)}>
                              Delete
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
        </div>
      ))}
    </div>
  );
}
