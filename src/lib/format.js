export const formatCurrency = (value) => {
  if (Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
};

export const formatPercent = (value, digits = 1) => {
  if (Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(digits)}%`;
};

export const formatNumber = (value) => {
  if (Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("pt-BR").format(value);
};

export const toCsv = (rows, columns) => {
  const header = columns.map((col) => col.label).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const raw = row[col.key];
          if (raw === null || raw === undefined) return "";
          return String(raw).replace(/"/g, '""');
        })
        .map((value) => `"${value}"`)
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
};

export const downloadCsv = (filename, csv) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
