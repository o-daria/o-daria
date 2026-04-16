import { useState } from "react";
import { CanvaApiService } from "@app/api-client";

export function useCanvaGeneration(projectId: string) {
  const [canvaLink, setCanvaLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (): Promise<void> => {
    setIsGenerating(true);
    setError(null);
    try {
      const { sessionToken } = await CanvaApiService.canvaSetup({ projectId });
      const { canvaLink: link } = await CanvaApiService.canvaGenerate({ projectId, sessionToken });
      setCanvaLink(link);
    } catch {
      setError("Failed to generate presentation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = (): void => { setError(null); };

  return { canvaLink, isGenerating, error, generate, reset };
}
