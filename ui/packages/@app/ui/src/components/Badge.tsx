import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 font-body text-xs font-medium",
  {
    variants: {
      variant: {
        draft: "bg-disabled/20 text-ink",
        processing: "bg-badge-processing-bg text-porcelain-dark",
        "report-ready": "bg-badge-success-bg text-jade-dark",
        "presentation-ready": "bg-gold/20 text-gold-dark",
        error: "bg-red-100 text-error",
      },
    },
    defaultVariants: {
      variant: "draft",
    },
  }
);

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  label: string;
  className?: string;
}

export function Badge({ label, variant, className }: BadgeProps): React.ReactElement {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {label}
    </span>
  );
}
