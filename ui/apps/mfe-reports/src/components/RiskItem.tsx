import { AlertTriangle } from "lucide-react";
import type { ReportRisk } from "@app/api-client";

export function RiskItem({ risk }: { risk: ReportRisk }): React.ReactElement {
  return (
    <li className="flex gap-3 rounded-sm border border-gold/15 border-l-2 border-l-warning bg-surface-elevated/5 px-4 py-3">
      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-body text-2xl font-semibold text-ivory/90">{risk.label}</p>
        <p className="font-body text-lg text-ivory/55 leading-relaxed">{risk.detail}</p>
      </div>
    </li>
  );
}
