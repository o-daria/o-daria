import { useRef, useState } from "react";
import { Dialog, Button } from "@app/ui";
import { useStartAnalysis } from "../hooks/useProjects";
import { Project } from "@app/api-client";

const MAX_FILES = 50;
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface StartAnalysisDialogProps {
  open: boolean;
  project: Project;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StartAnalysisDialog({
  open,
  project,
  onSuccess,
  onCancel,
}: StartAnalysisDialogProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { mutateAsync: startAnalysis, isPending, error: mutationError, reset } = useStartAnalysis(project);

  const handleClose = (): void => {
    setValidationError(null);
    reset();
    onCancel();
  };

  const handleSubmit = async (): Promise<void> => {
    setValidationError(null);
    const files = Array.from(inputRef.current?.files ?? []);

    if (files.length === 0) {
      setValidationError("Please select at least one image file.");
      return;
    }
    if (files.length > MAX_FILES) {
      setValidationError(`You can upload at most ${MAX_FILES} files at once.`);
      return;
    }
    const oversized = files.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      setValidationError(
        `${oversized.length} file(s) exceed the ${MAX_FILE_SIZE_MB} MB limit: ${oversized.map((f) => f.name).join(", ")}`
      );
      return;
    }

    await startAnalysis(files);
    onSuccess();
  };

  const displayError = validationError ?? (mutationError ? "Something went wrong. Please try again." : null);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Start analysis"
      actions={
        <>
          <Button variant="secondary" onClick={handleClose} data-testid="start-analysis-cancel-button">
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isPending}
            onClick={() => void handleSubmit()}
            data-testid="start-analysis-submit-button"
          >
            Start analysis
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4" data-testid="start-analysis-dialog">
        <p className="font-body text-sm text-ink">
          Upload profile images to analyse. You can upload up to {MAX_FILES} files ({MAX_FILE_SIZE_MB} MB each).
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          data-testid="file-upload-input"
          className="block w-full font-body text-sm text-ink file:mr-3 file:rounded-sm file:border-0 file:bg-button-primary-bg file:px-3 file:py-1.5 file:font-body file:text-sm file:text-ivory hover:file:bg-button-primary-hover"
        />
        {displayError && (
          <p className="font-body text-xs text-error" data-testid="start-analysis-error">
            {displayError}
          </p>
        )}
      </div>
    </Dialog>
  );
}
