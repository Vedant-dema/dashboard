import { forwardRef, useId, type InputHTMLAttributes } from "react";

export type SuggestTextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "list"> & {
  /** Werte für natives Dropdown (bestehende Datensätze) — kein Browser-Autofill. */
  suggestions?: readonly string[];
};

/**
 * Textfeld mit optionaler Vorschlagsliste (`<datalist>`).
 * Uses a non-standard autoComplete value so browsers don't show their own
 * autofill UI but also don't suppress the <datalist> dropdown (Chrome 83+
 * suppresses datalist when autoComplete="off").
 */
export const SuggestTextInput = forwardRef<HTMLInputElement, SuggestTextInputProps>(
  ({ suggestions, id, autoComplete = "nope", className, ...rest }, ref) => {
    const uid = useId().replace(/:/g, "");
    const listId = `dema-sug-${uid}`;
    const hasList = Boolean(suggestions && suggestions.length > 0);

    return (
      <>
        {hasList ? (
          <datalist id={listId}>
            {suggestions!.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        ) : null}
        <input
          ref={ref}
          id={id}
          list={hasList ? listId : undefined}
          autoComplete={autoComplete}
          className={className}
          {...rest}
        />
      </>
    );
  }
);

SuggestTextInput.displayName = "SuggestTextInput";
