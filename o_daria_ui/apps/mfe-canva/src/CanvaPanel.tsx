import { Button, ErrorMessage, Spinner } from "@app/ui";
import { ExternalLink, Presentation } from "lucide-react";
import { useState } from "react";
import { useCanvaGeneration } from "./hooks/useCanvaGeneration";

export interface CanvaPanelProps {
  projectId: string;
  reportReady: boolean;
  existingCanvaLink?: string;
}

export default function CanvaPanel({ projectId, reportReady, existingCanvaLink }: CanvaPanelProps): React.ReactElement {
  const { canvaLink, isGenerating, error, generate, reset } = useCanvaGeneration(projectId);
  const displayLink = canvaLink ?? existingCanvaLink ?? null;

  if (!reportReady) {
    return (
      <div className="flex items-center gap-2 rounded-sm bg-surface-elevated px-4 py-3 font-body text-sm text-disabled" data-testid="canva-not-ready">
        <Presentation size={16} aria-hidden /> Available once the audience report is ready.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="canva-panel">
      {error && <ErrorMessage message={error} onRetry={reset} />}

      {displayLink ? (
        <div className="flex items-center gap-3 rounded-sm border border-card-border bg-card-bg px-4 py-3" data-testid="canva-link-display">
          <Presentation size={16} className="text-jade shrink-0" aria-hidden />
          <span className="font-body text-sm text-ink flex-1">Presentation ready</span>
          <a
            href={displayLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-body text-sm text-porcelain hover:underline"
            data-testid="canva-open-link"
          >
            Open in Canva <ExternalLink size={13} aria-hidden />
          </a>
        </div>
      ) : null}

      <Button
        variant={displayLink ? "secondary" : "primary"}
        isLoading={isGenerating}
        onClick={() => void generate()}
        data-testid="canva-generate-button"
      >
        {isGenerating ? "Generating…" : displayLink ? "Regenerate presentation" : "Generate presentation"}
      </Button>

      {isGenerating && (
        <p className="font-body text-xs text-disabled" data-testid="canva-progress-hint">
          This may take a moment — we're building your Canva presentation.
        </p>
      )}
    </div>
  );
}
