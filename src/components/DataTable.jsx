import Card from "./Card.jsx";
import { downloadCsv, toCsv } from "../lib/format.js";

export default function DataTable({ title, rows, columns, filename }) {
  const handleExport = () => {
    const csv = toCsv(rows, columns);
    downloadCsv(filename, csv);
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg text-display text-ink-900">{title}</h3>
        <button
          type="button"
          className="rounded-full border border-ink-100 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink-600 transition hover:border-ink-200 hover:text-ink-900"
          onClick={handleExport}
        >
          Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-[0.2em] text-ink-500">
              {columns.map((column) => (
                <th key={column.key} className="py-2 pr-4">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[columns[0].key]}-${index}`} className="border-b border-ink-100">
                {columns.map((column) => (
                  <td key={column.key} className="py-3 pr-4 text-ink-700">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
