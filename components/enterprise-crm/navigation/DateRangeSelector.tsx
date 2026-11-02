export type DateRangeOption = { value: string; label: string };

export function DateRangeSelector({
  value,
  options,
  onChange,
  disabled = false,
  label = "Reporting range",
}: {
  value: string;
  options: readonly DateRangeOption[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <label className="crm-select-field">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange?.(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
