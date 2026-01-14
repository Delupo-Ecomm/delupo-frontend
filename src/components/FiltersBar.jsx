import { format } from "date-fns";

const today = new Date();

export default function FiltersBar({ filters, onChange, showStatus = true }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });
  const statusOptions = [
    { label: "Todos", value: "" },
    { label: "Faturados", value: "invoiced" }
  ];

  return (
    <div className="glass-panel rounded-2xl p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-ink-500">
          Inicio
          <input
            type="date"
            className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800"
            value={filters.start}
            max={format(today, "yyyy-MM-dd")}
            onChange={(event) => update("start", event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-ink-500">
          Fim
          <input
            type="date"
            className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800"
            value={filters.end}
            max={format(today, "yyyy-MM-dd")}
            onChange={(event) => update("end", event.target.value)}
          />
        </label>
      </div>
      {showStatus ? (
        <div className="flex flex-wrap items-center gap-2">
          {statusOptions.map((option) => {
            const isActive = filters.status === option.value;
            return (
              <button
                key={option.value || "all"}
                type="button"
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                  isActive
                    ? "border-ink-900 bg-ink-900 text-sand-50"
                    : "border-ink-100 bg-white text-ink-600 hover:border-ink-200 hover:text-ink-900"
                }`}
                onClick={() => update("status", option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
