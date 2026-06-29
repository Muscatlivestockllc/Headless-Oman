import { useEffect, useState } from "react";
import type { GloboOption, GloboOptionSet } from "~/lib/globo";

interface Props {
  optionSets: GloboOptionSet[];
  onChange: (attributes: Array<{ key: string; value: string }>) => void;
}

export function GloboProductOptions({ optionSets, onChange }: Props) {
  // keyed by elementId so conditional logic can reference sibling fields
  const [selections, setSelections] = useState<Record<string, string>>({});

  function isVisible(opt: GloboOption): boolean {
    if (!opt.conditional) return true;
    const { match, conditions, display } = opt.conditional;
    const results = conditions.map((c) => {
      const val = selections[c.selectId] ?? "";
      switch (c.where) {
        case "EQUALS": return val === c.value;
        case "NOT_EQUALS": return val !== c.value;
        case "CONTAINS": return val.includes(c.value);
        default: return true;
      }
    });
    const met = match === "all" ? results.every(Boolean) : results.some(Boolean);
    return display === "show" ? met : !met;
  }

  useEffect(() => {
    const attrs: Array<{ key: string; value: string }> = [];
    for (const set of optionSets) {
      for (const opt of set.options) {
        if (!isVisible(opt)) continue;
        const val = selections[opt.elementId] ?? "";
        if (val !== "") attrs.push({ key: opt.name, value: val });
      }
    }
    onChange(attrs);
  }, [selections]); // eslint-disable-line react-hooks/exhaustive-deps

  if (optionSets.length === 0) return null;

  const set = (val: string, elementId: string) =>
    setSelections((prev) => ({ ...prev, [elementId]: val }));

  return (
    <div className="flex flex-col gap-4">
      {optionSets.map((optSet) =>
        optSet.options
          .filter((opt) => isVisible(opt))
          .map((opt) => (
            <OptionField
              key={opt.elementId}
              opt={opt}
              value={selections[opt.elementId] ?? ""}
              onChange={(v) => set(v, opt.elementId)}
            />
          ))
      )}
    </div>
  );
}

function OptionField({
  opt,
  value,
  onChange,
}: {
  opt: GloboOption;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = (
    <p className="mb-1.5 text-sm font-semibold">
      {opt.name}
      {opt.required && <span className="ml-1 text-crimson">*</span>}
    </p>
  );

  switch (opt.type) {
    case "dropdown":
      return (
        <div>
          {label}
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-crimson focus:outline-none"
          >
            <option value="">{opt.placeholder || "-- Please select --"}</option>
            {opt.values?.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      );

    case "radio":
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2">
            {opt.values?.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => onChange(v.value)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  value === v.value
                    ? "border-crimson bg-crimson text-crimson-foreground"
                    : "border-border bg-card hover:border-crimson"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      );

    case "swatch":
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2">
            {opt.values?.map((v) => (
              <button
                key={v.value}
                type="button"
                title={v.label}
                onClick={() => onChange(v.value)}
                className={`relative h-8 w-8 rounded-full border-2 transition-all ${
                  value === v.value ? "border-crimson scale-110" : "border-border hover:border-muted-foreground"
                }`}
                style={{ backgroundColor: v.color ?? v.value }}
              >
                {value === v.value && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-white shadow" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      );

    case "image_swatch":
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2">
            {opt.values?.map((v) => (
              <button
                key={v.value}
                type="button"
                title={v.label}
                onClick={() => onChange(v.value)}
                className={`h-12 w-12 overflow-hidden rounded-md border-2 transition-all ${
                  value === v.value ? "border-crimson" : "border-border hover:border-muted-foreground"
                }`}
              >
                {v.image ? (
                  <img src={v.image} alt={v.label} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs">{v.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      );

    case "checkbox":
      return (
        <div>
          {label}
          <div className="flex flex-col gap-1.5">
            {opt.values?.map((v) => {
              const checked = value.split(",").includes(v.value);
              const toggle = () => {
                const current = value ? value.split(",") : [];
                const next = checked
                  ? current.filter((x) => x !== v.value)
                  : [...current, v.value];
                onChange(next.filter(Boolean).join(","));
              };
              return (
                <label key={v.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={toggle}
                    className="h-4 w-4 accent-crimson"
                  />
                  {v.label}
                </label>
              );
            })}
          </div>
        </div>
      );

    case "textarea":
      return (
        <div>
          {label}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={opt.placeholder}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-crimson focus:outline-none resize-none"
          />
        </div>
      );

    case "date":
      return (
        <div>
          {label}
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-crimson focus:outline-none"
          />
        </div>
      );

    case "number":
      return (
        <div>
          {label}
          <input
            type="number"
            value={value}
            min={opt.min_value}
            max={opt.max_value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={opt.placeholder}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-crimson focus:outline-none"
          />
        </div>
      );

    default:
      return (
        <div>
          {label}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={opt.placeholder}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-crimson focus:outline-none"
          />
        </div>
      );
  }
}
