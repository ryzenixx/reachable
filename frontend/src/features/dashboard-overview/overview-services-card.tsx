import { StatusBadge } from "@/components/status/status-badge";
import type { Service } from "@/types/api";

type OverviewServicesCardProps = {
  services: Service[];
};

export function OverviewServicesCard({ services }: OverviewServicesCardProps): React.JSX.Element {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-neutral-900">Services</h3>
      </div>
      {services.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-neutral-400">No services yet.</p>
      ) : (
        <div className="px-5 pb-3">
          {services.slice(0, 6).map((service) => (
            <div key={service.id} className="flex items-center justify-between py-3 border-b border-neutral-50 last:border-0">
              <span className="text-sm text-neutral-700">{service.name}</span>
              <StatusBadge status={service.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
