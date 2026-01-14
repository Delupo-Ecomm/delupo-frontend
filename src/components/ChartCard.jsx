import Card from "./Card.jsx";

export default function ChartCard({ title, subtitle, children, right }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg text-display text-ink-900">{title}</h3>
          {subtitle && <p className="text-sm text-ink-600">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="h-64 w-full">{children}</div>
    </Card>
  );
}
