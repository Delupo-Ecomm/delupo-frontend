import Card from "./Card.jsx";
import { formatCurrency, formatNumber, formatPercent } from "../lib/format.js";

const formatValue = (value, type) => {
  if (type === "currency") return formatCurrency(value);
  if (type === "percent") {
    const ratio = value > 1 ? value / 100 : value;
    return formatPercent(ratio);
  }
  return formatNumber(value);
};

export default function KpiCard({ label, value, delta, type = "number", className }) {
  const isPositive = delta >= 0;
  return (
    <Card className={`flex flex-col gap-3 ${className || ""}`}>
      <span className="text-sm uppercase tracking-[0.2em] text-ink-500">{label}</span>
      <span className="text-3xl text-display text-ink-900">{formatValue(value, type)}</span>
      {delta !== undefined && (
        <span
          className={`text-sm font-semibold ${
            isPositive ? "text-leaf-500" : "text-ember-500"
          }`}
        >
          {isPositive ? "+" : ""}
          {(delta * 100).toFixed(1)}% vs periodo anterior
        </span>
      )}
    </Card>
  );
}
