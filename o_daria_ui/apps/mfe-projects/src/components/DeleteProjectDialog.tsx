import { Button, Dialog } from "@app/ui";

interface Props {
  open: boolean;
  projectName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteProjectDialog({ open, projectName, isDeleting, onConfirm, onCancel }: Props): React.ReactElement {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Delete project"
      actions={
        <>
          <Button variant="secondary" onClick={onCancel} data-testid="delete-cancel-button">Cancel</Button>
          <Button variant="destructive" isLoading={isDeleting} onClick={onConfirm} data-testid="delete-confirm-button">
            Delete
          </Button>
        </>
      }
    >
      <p className="font-body text-sm text-ink">
        Are you sure you want to delete <strong>{projectName}</strong>? This action cannot be undone.
      </p>
    </Dialog>
  );
}
