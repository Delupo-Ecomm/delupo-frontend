export default function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow && (
        <span className="text-xs uppercase tracking-[0.25em] text-ink-500">{eyebrow}</span>
      )}
      <h2 className="text-2xl md:text-3xl text-display text-ink-900">{title}</h2>
      {description && <p className="text-ink-600 max-w-2xl">{description}</p>}
    </div>
  );
}
