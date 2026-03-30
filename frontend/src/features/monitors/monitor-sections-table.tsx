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
    <div className="space-y-6">
      {sections.map(({ service, monitors }) => (
        <div key={service.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">{service.name}</h2>
            </div>
            <Button onClick={() => onCreateMonitor(service.id)} size="sm" variant="outline">
              <Plus className="size-4" />
              Add monitor
            </Button>
          </div>

          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[34%] min-w-[220px]">Target</TableHead>
                <TableHead className="w-[110px]">Type</TableHead>
                <TableHead className="w-[90px]">Interval</TableHead>
                <TableHead className="w-[140px]">Last status</TableHead>
                <TableHead className="w-[110px]">Response</TableHead>
                <TableHead className="w-[150px]">Last checked</TableHead>
                <TableHead className="w-[140px]">Sparkline</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monitors.map((monitor) => (
                <TableRow key={monitor.id}>
                  <TableCell className="max-w-0">
                    <p className="truncate text-sm font-medium">{monitor.url}</p>
                  </TableCell>
                  <TableCell className="w-[110px]">
                    <MonitorTypeBadge type={monitor.type} />
                  </TableCell>
                  <TableCell className="w-[90px] text-sm text-muted-foreground">{monitor.interval_seconds}s</TableCell>
                  <TableCell className="w-[140px]">
                    <StatusBadge status={monitorStatusToServiceStatus(monitor)} />
                  </TableCell>
                  <TableCell className="w-[110px] text-sm text-muted-foreground">
                    {monitor.latest_check ? `${monitor.latest_check.response_time_ms}ms` : "-"}
                  </TableCell>
                  <TableCell className="w-[150px] text-sm text-muted-foreground">
                    {monitor.latest_check ? formatRelativePrecise(monitor.latest_check.checked_at) : "Never"}
                  </TableCell>
                  <TableCell className="w-[140px]">
                    <MonitorSparkline monitor={monitor} />
                  </TableCell>
                  <TableCell className="w-[150px]">
                    <div className="flex items-center justify-end gap-2">
                      <Button onClick={() => onEditMonitor(monitor)} size="sm" variant="ghost">
                        <Pencil className="size-4" />
                        Edit
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete monitor</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes monitor checks and alert history for {monitor.url}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancelButton>Cancel</AlertDialogCancelButton>
                            <AlertDialogActionButton onClick={() => void onDeleteMonitor(monitor)}>
                              Delete monitor
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
