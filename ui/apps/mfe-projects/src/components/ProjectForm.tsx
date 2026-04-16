import { Button, Input } from "@app/ui";
import { useFormik } from "formik";
import * as yup from "yup";
import type { ProjectInput } from "@app/api-client";

const schema = yup.object({
  name: yup.string().required("Brand name is required").max(100),
  brand_input: yup.string().required("Brand values are required").max(2000),
});

interface ProjectFormProps {
  initialValues?: Partial<ProjectInput>;
  onSubmit: (values: ProjectInput) => Promise<void>;
  submitLabel: string;
}

export function ProjectForm({ initialValues, onSubmit, submitLabel }: ProjectFormProps): React.ReactElement {
  const formik = useFormik<ProjectInput>({
    initialValues: {
      name: initialValues?.name ?? "",
      brand_input: initialValues?.brand_input ?? "",
    },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await onSubmit(values);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="flex flex-col gap-5" data-testid="project-form">
      <Input
        label="Brand name"
        data-testid="project-name-input"
        {...formik.getFieldProps("name")}
        {...(formik.touched.name && formik.errors.name ? { error: formik.errors.name } : {})}
      />
      <div className="flex flex-col gap-1">
        <label className="font-body text-sm font-medium text-ink">Brand values</label>
        <textarea
          rows={3}
          data-testid="project-brand-values-input"
          placeholder="Describe the brand's values, tone, positioning…"
          className="w-full rounded-sm border border-input-border bg-card-bg px-3 py-2 font-body text-sm text-ink focus:outline-none focus:ring-2 focus:ring-input-focus-border"
          {...formik.getFieldProps("brand_input")}
        />
        {formik.touched.brand_input && formik.errors.brand_input && (
          <p className="text-xs text-error">{formik.errors.brand_input}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        isLoading={formik.isSubmitting}
        data-testid="project-form-submit-button"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
