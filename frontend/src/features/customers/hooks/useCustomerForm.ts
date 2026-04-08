import { useState, useCallback } from "react";
import type { CustomerFormDraft } from "../mappers/customerFormMapper";

type Initializer = () => CustomerFormDraft;

/**
 * Local customer modal form state. Persistence still flows through the repository on save.
 */
export function useCustomerForm(initializer: Initializer) {
  const [form, setForm] = useState<CustomerFormDraft>(() => initializer());

  const patchField = useCallback(<K extends keyof CustomerFormDraft>(key: K, value: CustomerFormDraft[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  return { form, setForm, patchField };
}
