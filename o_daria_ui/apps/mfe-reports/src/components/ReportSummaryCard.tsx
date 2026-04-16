import { Card } from "@app/ui";
import type { ReportMetric } from "@app/api-client";

export function ReportSummaryCard({ metric }: { metric: ReportMetric }): React.ReactElement {
  return (
    <Card decorative className="flex flex-col gap-1 p-4">
      <dt className="font-body text-xs font-medium text-disabled uppercase tracking-wide">{metric.label}</dt>
      <dd className="font-display text-2xl font-semibold text-ink">
        {metric.value}{metric.unit ? <span className="ml-1 font-body text-sm text-disabled">{metric.unit}</span> : null}
      </dd>
    </Card>
  );
}
