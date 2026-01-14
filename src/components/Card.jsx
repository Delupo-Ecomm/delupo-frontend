import clsx from "clsx";

export default function Card({ children, className, hover = true }) {
  return (
    <div
      className={clsx(
        "glass-panel rounded-2xl p-6 shadow-card transition-transform duration-300",
        hover && "hover:-translate-y-1",
        className
      )}
    >
      {children}
    </div>
  );
}
