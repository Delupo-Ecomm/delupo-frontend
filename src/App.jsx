import { Fragment, useMemo, useState } from "react";
import { format, subDays, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, parseISO, startOfWeek, startOfMonth } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import FiltersBar from "./components/FiltersBar.jsx";
import SectionHeader from "./components/SectionHeader.jsx";
import ChartCard from "./components/ChartCard.jsx";
import Card from "./components/Card.jsx";
import DataTable from "./components/DataTable.jsx";
import {
  useCohort,
  useCoupons,
  useCustomers,
  useNewVsReturning,
  useOrders,
  useProducts,
  useRetention,
  useSummary,
  useUtm
} from "./lib/hooks.js";
import { formatCurrency, formatNumber, formatPercent } from "./lib/format.js";

const normalizeSeries = (payload) => {
  if (!payload) return [];

  const candidates = [
    payload.daily,
    payload.dailySales,
    payload.salesDaily,
    payload.ordersByDay,
    payload.byDay,
    payload.series,
    payload.data,
    payload.orders?.daily,
    payload.orders?.byDay
  ];

  const series = candidates.find((item) => Array.isArray(item)) || [];

  return series
    .map((entry) => {
      if (Array.isArray(entry)) {
        return { date: entry[0], value: Number(entry[1]) };
      }
      const date = entry.date || entry.day || entry.week || entry.month || entry.period || entry.createdAt;
      const moneyKeys = ["revenue", "amount", "total", "sales"];
      const moneyKey = moneyKeys.find((key) => entry[key] !== undefined);
      const value =
        entry.revenue ??
        entry.amount ??
        entry.total ??
        entry.value ??
        entry.sales ??
        entry.orders ??
        entry.count ??
        0;
      const numericValue = Number(value);
      const normalizedValue = moneyKey ? numericValue / 100 : numericValue;
      return { date, value: normalizedValue };
    })
    .filter((entry) => entry.date);
};

const detectValueFormatter = (payload) => {
  const series = normalizeSeries(payload);
  const sample = series[0];
  if (!sample) {
    return { label: "Vendas diarias", format: formatCurrency };
  }
  const raw = payload?.daily?.[0] || payload?.data?.[0] || payload?.series?.[0] || {};
  const keys = Object.keys(raw);
  const looksLikeMoney = keys.some((key) =>
    ["revenue", "amount", "total", "sales"].includes(key)
  );
  
  // Determinar o período com base no groupBy
  const groupBy = payload?.groupBy || "day";
  const periodLabel = groupBy === "week" ? "semanal" : groupBy === "month" ? "mensal" : "diaria";
  
  return {
    label: looksLikeMoney ? `Receita ${periodLabel}` : `Pedidos ${periodLabel}`,
    format: looksLikeMoney ? formatCurrency : formatNumber
  };
};

const fillMissingDates = (series, startDate, endDate, groupBy = "day") => {
  if (!series || series.length === 0) return [];
  if (!startDate || !endDate) return series;

  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    let allPeriods = [];
    
    if (groupBy === "week") {
      allPeriods = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(date => 
        format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
      );
    } else if (groupBy === "month") {
      allPeriods = eachMonthOfInterval({ start, end }).map(date => 
        format(startOfMonth(date), "yyyy-MM-dd")
      );
    } else {
      allPeriods = eachDayOfInterval({ start, end }).map(date => 
        format(date, "yyyy-MM-dd")
      );
    }
    
    const dataMap = new Map(series.map(item => [item.date, item]));
    
    return allPeriods.map(period => 
      dataMap.get(period) || { date: period, value: 0 }
    );
  } catch (error) {
    console.error("Error filling missing dates:", error);
    return series;
  }
};

export default function App() {
  const [activeDash, setActiveDash] = useState("orders");
  const [orderFilters, setOrderFilters] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    status: "",
    groupBy: "day",
    utmSource: ""
  });
  const [clientFilters, setClientFilters] = useState({
    start: format(subMonths(new Date(), 3), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    status: ""
  });
  const [productFilters, setProductFilters] = useState({
    start: format(subMonths(new Date(), 3), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    status: ""
  });
  const [retentionFilters, setRetentionFilters] = useState({
    start: format(subMonths(new Date(), 6), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    status: ""
  });
  const [newSalesTarget, setNewSalesTarget] = useState(0.2);
  const [returningTarget, setReturningTarget] = useState(0.2);
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [draftNewSalesTarget, setDraftNewSalesTarget] = useState(0.2);
  const [draftReturningTarget, setDraftReturningTarget] = useState(0.2);
  const [expandedSources, setExpandedSources] = useState([]);
  const [expandedCoupons, setExpandedCoupons] = useState([]);

  const isOrdersDash = activeDash === "orders";
  const isClientsDash = activeDash === "clients";
  const isProductsDash = activeDash === "products";
  const isRetentionDash = activeDash === "ecommerce";
  const orderBaseFilters = useMemo(
    () => ({
      start: orderFilters.start,
      end: orderFilters.end,
      timezone: "America/Sao_Paulo"
    }),
    [orderFilters]
  );
  const orderQueryFilters = useMemo(
    () => ({
      ...orderBaseFilters,
      status: orderFilters.status,
      groupBy: orderFilters.groupBy,
      utmSource: orderFilters.utmSource
    }),
    [orderBaseFilters, orderFilters.status, orderFilters.groupBy, orderFilters.utmSource]
  );
  const clientBaseFilters = useMemo(
    () => ({
      start: clientFilters.start,
      end: clientFilters.end,
      timezone: "America/Sao_Paulo"
    }),
    [clientFilters]
  );
  const productBaseFilters = useMemo(
    () => ({
      start: productFilters.start,
      end: productFilters.end,
      timezone: "America/Sao_Paulo"
    }),
    [productFilters]
  );
  const retentionBaseFilters = useMemo(
    () => ({
      start: retentionFilters.start,
      end: retentionFilters.end,
      timezone: "America/Sao_Paulo"
    }),
    [retentionFilters]
  );

  const summaryAll = useSummary(
    { ...orderBaseFilters, status: "" },
    { enabled: isOrdersDash }
  );
  const summaryInvoiced = useSummary(
    { ...orderBaseFilters, status: "invoiced" },
    { enabled: isOrdersDash }
  );
  const orders = useOrders(orderQueryFilters, { enabled: isOrdersDash });
  const utm = useUtm({ ...orderQueryFilters, all: "true" }, { enabled: isOrdersDash });
  const coupons = useCoupons({ ...orderQueryFilters, all: "true" }, { enabled: isOrdersDash });
  const customers = useCustomers(
    { ...clientBaseFilters, limit: 10 },
    { enabled: isClientsDash }
  );
  const productsByQuantity = useProducts(
    { ...productBaseFilters, limit: 20, sort: "quantity" },
    { enabled: isProductsDash }
  );
  const productsByRevenue = useProducts(
    { ...productBaseFilters, limit: 20, sort: "revenue" },
    { enabled: isProductsDash }
  );
  const retention = useRetention(retentionBaseFilters, { enabled: isRetentionDash });
  const cohort = useCohort(retentionBaseFilters, { enabled: isRetentionDash });
  const newVsReturning = useNewVsReturning(retentionBaseFilters, {
    enabled: isRetentionDash
  });
  
  const rawSeries = normalizeSeries(orders.data);
  const series = useMemo(() => {
    return fillMissingDates(
      rawSeries, 
      orderFilters.start, 
      orderFilters.end, 
      orderFilters.groupBy || "day"
    );
  }, [rawSeries, orderFilters.start, orderFilters.end, orderFilters.groupBy]);
  
  const valueMeta = detectValueFormatter(orders.data);
  const utmGroups = useMemo(() => {
    const items = utm.data?.items;
    if (!Array.isArray(items)) return [];
    const grouped = items.reduce((acc, item) => {
      const rawSource = item.utmSource;
      const source =
        !rawSource || String(rawSource).toLowerCase() === "(none)" ? "Direto" : rawSource;
      if (!acc[source]) {
        acc[source] = { source, orders: 0, revenue: 0, children: [] };
      }
      acc[source].orders += item.orders ?? 0;
      acc[source].revenue += item.revenue ?? 0;
      acc[source].children.push({
        source,
        medium: item.utmMedium || "-",
        campaign: item.utmCampaign || "-",
        orders: item.orders ?? 0,
        revenue: item.revenue ?? 0
      });
      return acc;
    }, {});
    const groups = Object.values(grouped)
      .map((group) => ({
        ...group,
        revenue: group.revenue / 100,
        children: group.children
          .map((child) => ({ ...child, revenue: child.revenue / 100 }))
          .sort((a, b) => b.revenue - a.revenue)
      }))
      .sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = groups.reduce((sum, group) => sum + group.revenue, 0);
    return groups.map((group) => ({
      ...group,
      share: totalRevenue ? group.revenue / totalRevenue : 0
    }));
  }, [utm.data]);
  
  const couponGroups = useMemo(() => {
    const items = coupons.data?.items;
    if (!Array.isArray(items)) return [];
    const groups = items
      .map((item) => ({
        code: item.couponCode || "(sem cupom)",
        orders: item.orders ?? 0,
        revenue: (item.revenue ?? 0) / 100
      }))
      .sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = groups.reduce((sum, group) => sum + group.revenue, 0);
    return groups.map((group) => ({
      ...group,
      share: totalRevenue ? group.revenue / totalRevenue : 0
    }));
  }, [coupons.data]);
  
  const topCustomers = useMemo(() => {
    const customersList = customers.data?.topCustomers;
    if (!Array.isArray(customersList)) return [];
    return customersList.map((customer) => ({
      id: customer.customerId,
      name: customer.name || "Cliente sem nome",
      email: customer.email || "-",
      orders: customer.orders ?? 0,
      revenue: (customer.revenue ?? 0) / 100
    }));
  }, [customers.data]);
  const topCustomersByOrders = useMemo(() => {
    return [...topCustomers].sort((a, b) => b.orders - a.orders);
  }, [topCustomers]);
  const mapProducts = (items) => {
    if (!Array.isArray(items)) return [];
    return items.map((item) => ({
      id: item.skuId || item.productId,
      productName: item.productName || "Produto sem nome",
      skuName: item.skuName || "-",
      quantity: item.quantity ?? 0,
      revenue: (item.revenue ?? 0) / 100,
      avgPrice:
        item.quantity && item.revenue
          ? (item.revenue / item.quantity) / 100
          : 0
    }));
  };
  const topProductsByQuantity = useMemo(
    () => mapProducts(productsByQuantity.data?.items),
    [productsByQuantity.data]
  );
  const topProductsByRevenue = useMemo(
    () => mapProducts(productsByRevenue.data?.items),
    [productsByRevenue.data]
  );
  const retentionRows = useMemo(() => {
    const items = retention.data?.items;
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const previous = item.previousCustomers ?? 0;
      const retained = item.retainedCustomers ?? 0;
      return {
        period: format(new Date(item.periodStart), "yyyy-MM"),
        customers: item.customers ?? 0,
        previousCustomers: previous,
        retainedCustomers: retained,
        retentionRate: previous > 0 ? retained / previous : null
      };
    });
  }, [retention.data]);
  const retentionLatest = retentionRows[retentionRows.length - 1];
  const monthLabel = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const months = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez"
    ];
    return `${months[date.getUTCMonth()]}/${date.getUTCFullYear()}`;
  };
  const cohortMonths = useMemo(() => {
    const months = cohort.data?.months;
    if (!Array.isArray(months)) return [];
    return months;
  }, [cohort.data]);
  const cohortMatrix = useMemo(() => {
    const items = cohort.data?.items;
    if (!Array.isArray(items) || cohortMonths.length === 0) return [];
    const byCohort = new Map();
    items.forEach((item) => {
      const cohortKey = new Date(item.cohortMonth).toISOString().slice(0, 10);
      const orderKey = new Date(item.orderMonth).toISOString().slice(0, 10);
      if (!byCohort.has(cohortKey)) {
        byCohort.set(cohortKey, { cohortKey, values: {} });
      }
      byCohort.get(cohortKey).values[orderKey] = item.customers ?? 0;
    });
    return Array.from(byCohort.values()).sort((a, b) =>
      a.cohortKey.localeCompare(b.cohortKey)
    );
  }, [cohort.data, cohortMonths.length]);
  const cohortTotals = useMemo(() => {
    if (cohortMonths.length === 0) return [];
    const totals = {};
    cohortMonths.forEach((month) => {
      totals[month] = 0;
    });
    cohortMatrix.forEach((row) => {
      cohortMonths.forEach((month) => {
        totals[month] += row.values[month] ?? 0;
      });
    });
    return totals;
  }, [cohortMatrix, cohortMonths]);
  const newVsReturningRows = useMemo(() => {
    const items = newVsReturning.data?.items;
    if (!Array.isArray(items)) return [];
    return items.map((item) => ({
      period: monthLabel(item.periodStart),
      newOrders: item.newOrders ?? 0,
      returningOrders: item.returningOrders ?? 0,
      totalOrders: (item.newOrders ?? 0) + (item.returningOrders ?? 0)
    }));
  }, [newVsReturning.data]);
  const newVsReturningAverage = useMemo(() => {
    if (newVsReturningRows.length === 0) {
      return { newShare: null, returningShare: null };
    }
    const totals = newVsReturningRows.reduce(
      (acc, row) => {
        const total = row.totalOrders || 0;
        if (total > 0) {
          acc.newShareSum += row.newOrders / total;
          acc.returningShareSum += row.returningOrders / total;
          acc.count += 1;
        }
        return acc;
      },
      { newShareSum: 0, returningShareSum: 0, count: 0 }
    );
    if (totals.count === 0) {
      return { newShare: null, returningShare: null };
    }
    return {
      newShare: totals.newShareSum / totals.count,
      returningShare: totals.returningShareSum / totals.count
    };
  }, [newVsReturningRows]);
  const customerColumns = [
    { key: "name", label: "Cliente" },
    { key: "email", label: "Email" },
    { key: "orders", label: "Pedidos", render: (value) => formatNumber(value) },
    { key: "revenue", label: "Receita", render: (value) => formatCurrency(value) }
  ];
  const productColumns = [
    { key: "productName", label: "Produto" },
    { key: "skuName", label: "SKU" },
    { key: "quantity", label: "Quantidade", render: (value) => formatNumber(value) },
    { key: "revenue", label: "Receita", render: (value) => formatCurrency(value) },
    { key: "avgPrice", label: "Preco medio", render: (value) => formatCurrency(value) }
  ];
  const retentionColumns = [
    { key: "period", label: "Periodo" },
    { key: "customers", label: "Clientes", render: (value) => formatNumber(value) },
    {
      key: "previousCustomers",
      label: "Clientes anterior",
      render: (value) => formatNumber(value)
    },
    {
      key: "retainedCustomers",
      label: "Retidos",
      render: (value) => formatNumber(value)
    },
    {
      key: "retentionRate",
      label: "Retencao",
      render: (value) => (value === null ? "-" : formatPercent(value, 1))
    }
  ];
  const newVsReturningColumns = [
    { key: "period", label: "Periodo" },
    {
      key: "newOrders",
      label: `Novos clientes${
        newVsReturningAverage.newShare === null
          ? ""
          : ` (media ${formatPercent(newVsReturningAverage.newShare, 1)})`
      }`,
      render: (value, row) => {
        const total = row.totalOrders || 0;
        const share = total ? value / total : null;
        const target = newSalesTarget;
        const className =
          share === null
            ? "text-ink-500"
            : share >= target
              ? "text-forest-600"
              : "text-ember-500";
        return (
          <span className="flex items-baseline gap-2">
            <span className={className}>{formatNumber(value)}</span>
            {share === null ? null : (
              <span className="text-[10px] text-ink-400">
                ({formatPercent(share, 1)})
              </span>
            )}
          </span>
        );
      }
    },
    {
      key: "returningOrders",
      label: `Recompra${
        newVsReturningAverage.returningShare === null
          ? ""
          : ` (media ${formatPercent(newVsReturningAverage.returningShare, 1)})`
      }`,
      render: (value, row) => {
        const total = row.totalOrders || 0;
        const share = total ? value / total : null;
        const target = returningTarget;
        const className =
          share === null
            ? "text-ink-500"
            : share >= target
              ? "text-forest-600"
              : "text-ember-500";
        return (
          <span className="flex items-baseline gap-2">
            <span className={className}>{formatNumber(value)}</span>
            {share === null ? null : (
              <span className="text-[10px] text-ink-400">
                ({formatPercent(share, 1)})
              </span>
            )}
          </span>
        );
      }
    },
    {
      key: "totalOrders",
      label: "Total",
      render: (value) => formatNumber(value)
    }
  ];

  const toggleSource = (source) => {
    setExpandedSources((prev) =>
      prev.includes(source) ? prev.filter((item) => item !== source) : [...prev, source]
    );
  };

  const summaryValue = (query) => {
    if (query.isLoading) return "Carregando";
    if (query.isError) return "Erro";
    const total = query.data?.totalRevenue ?? 0;
    return formatCurrency(total / 100);
  };

  const summaryShare = () => {
    if (summaryAll.isLoading || summaryInvoiced.isLoading) return "-";
    if (summaryAll.isError || summaryInvoiced.isError) return "-";
    const total = summaryAll.data?.totalRevenue ?? 0;
    const invoiced = summaryInvoiced.data?.totalRevenue ?? 0;
    if (!total) return "0%";
    return formatPercent(invoiced / total, 1);
  };

  return (
    <div className="min-h-screen bg-sand-50 text-ink-900">
      <div className="pattern-grid">
        <header className="px-6 pt-8 pb-12 md:px-10">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ink-500">Delupo Stats</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { id: "orders", label: "Orders Dash" },
                  { id: "clients", label: "Client Dash" },
                  { id: "products", label: "Products Dash" },
                  { id: "ecommerce", label: "Ecommerce Stats" }
                ].map((item) => {
                  const isActive = activeDash === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                        isActive
                          ? "border-ink-900 bg-ink-900 text-sand-50"
                          : "border-ink-100 bg-white text-ink-600 hover:border-ink-200 hover:text-ink-900"
                      }`}
                      onClick={() => setActiveDash(item.id)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <h1 className="mt-6 text-4xl md:text-5xl text-display text-ink-900">
                {isOrdersDash
                  ? "Vendas diarias"
                  : isClientsDash
                    ? "Clientes de maior receita"
                    : isProductsDash
                      ? "Produtos em destaque"
                      : "Retencao de clientes"}
              </h1>
              <p className="text-ink-600 max-w-xl">
                {isOrdersDash
                  ? "Grafico focado em vendas diarias com dados reais da API."
                  : isClientsDash
                    ? "Ranking de clientes que mais gastaram no periodo selecionado."
                    : isProductsDash
                      ? "Produtos com maior volume de vendas e receita no periodo selecionado."
                      : "Retencao calculada entre periodos consecutivos de compra."}
              </p>
            </div>
            {isOrdersDash ? (
              <FiltersBar 
                filters={orderFilters} 
                onChange={setOrderFilters}
              />
            ) : isClientsDash ? (
              <FiltersBar
                filters={clientFilters}
                onChange={setClientFilters}
                showStatus={false}
              />
            ) : (
              <FiltersBar
                filters={isProductsDash ? productFilters : retentionFilters}
                onChange={isProductsDash ? setProductFilters : setRetentionFilters}
                showStatus={false}
              />
            )}
          </div>
        </header>
      </div>

      <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-6 pb-16 md:px-10">
        {isOrdersDash ? (
          <Fragment>
            <section className="flex flex-col gap-6">
              <SectionHeader
                eyebrow="Resumo"
                title="Receita do periodo"
                description="Comparativo entre receita geral e receita faturada."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="flex flex-col gap-2" hover={false}>
                  <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
                    Receita geral
                  </span>
                  <span className="text-3xl text-display text-ink-900">
                    {summaryValue(summaryAll)}
                  </span>
                </Card>
                <Card className="flex flex-col gap-2" hover={false}>
                  <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
                    Receita faturada
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl text-display text-ink-900">
                      {summaryValue(summaryInvoiced)}
                    </span>
                    <span
                      className="text-sm text-ink-500"
                      title="Percentual da receita faturada sobre a receita geral"
                    >
                      ({summaryShare()})
                    </span>
                  </div>
                </Card>
              </div>
            </section>

            <section className="flex flex-col gap-6">
              <SectionHeader
                eyebrow="Indicador"
                title={valueMeta.label}
                description="Escolha o periodo para atualizar o grafico com os dados da API."
              />

              <ChartCard
                title={valueMeta.label}
                subtitle={`Periodo: ${orderFilters.start} ate ${orderFilters.end}`}
                right={
                  <div className="flex items-center gap-4">
                    {orders.isFetching && (
                      <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
                        Atualizando
                      </span>
                    )}
                    <div className="flex gap-2">
                      {["day", "week", "month"].map((period) => {
                        const isActive = (orderFilters.groupBy || "day") === period;
                        const label = period === "day" ? "Dia" : period === "week" ? "Semana" : "Mês";
                        return (
                          <button
                            key={period}
                            type="button"
                            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] transition ${
                              isActive
                                ? "border-ink-900 bg-ink-900 text-sand-50"
                                : "border-ink-100 bg-white text-ink-600 hover:border-ink-200 hover:text-ink-900"
                            }`}
                            onClick={() => setOrderFilters({ ...orderFilters, groupBy: period })}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                }
              >
                {orders.isLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-ink-500">
                    Carregando dados...
                  </div>
                ) : orders.isError ? (
                  <div className="flex h-full items-center justify-center text-sm text-ember-500">
                    Nao foi possivel carregar os dados.
                  </div>
                ) : series.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-ink-500">
                    Nenhum dado encontrado para o periodo.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series}>
                      <defs>
                        <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2A7CA0" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#2A7CA0" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2D6C8" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => valueMeta.format(value)} />
                      <Area
                        type="linear"
                        dataKey="value"
                        stroke="#1F5B7A"
                        strokeLinecap="butt"
                        strokeLinejoin="miter"
                        fill="url(#salesFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <Card className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg text-display text-ink-900">UTM por source</h3>
                  {utm.isFetching ? (
                    <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
                      Atualizando
                    </span>
                  ) : null}
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                      !orderFilters.utmSource
                        ? "border-ink-900 bg-ink-900 text-sand-50"
                        : "border-ink-100 bg-white text-ink-600 hover:border-ink-200 hover:text-ink-900"
                    }`}
                    onClick={() => setOrderFilters({ ...orderFilters, utmSource: "" })}
                  >
                    Todos
                  </button>
                  {utmGroups.map((group) => {
                    const isActive = orderFilters.utmSource === group.source;
                    return (
                      <button
                        key={group.source}
                        type="button"
                        className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                          isActive
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-ink-100 bg-white text-ink-600 hover:border-sky-200 hover:text-sky-700"
                        }`}
                        onClick={() => setOrderFilters({ ...orderFilters, utmSource: group.source })}
                      >
                        {group.source}
                      </button>
                    );
                  })}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-[0.2em] text-ink-500">
                        <th className="py-2 pr-4">Source</th>
                        <th className="py-2 pr-4">Medium</th>
                        <th className="py-2 pr-4">Campaign</th>
                        <th className="py-2 pr-4">Pedidos</th>
                        <th className="py-2 pr-4">Receita</th>
                        <th className="py-2 pr-4">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utm.isLoading ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-ink-500">
                            Carregando dados...
                          </td>
                        </tr>
                      ) : utm.isError ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-ember-500">
                            Nao foi possivel carregar os dados.
                          </td>
                        </tr>
                      ) : utmGroups.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-ink-500">
                            Nenhum dado encontrado para o periodo.
                          </td>
                        </tr>
                      ) : (
                        utmGroups.map((group) => {
                          const isExpanded = expandedSources.includes(group.source);
                          return (
                            <Fragment key={group.source}>
                              <tr key={group.source} className="border-b border-ink-100">
                                <td className="py-3 pr-4 text-ink-900">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-2 text-left text-ink-900 hover:text-ink-700"
                                    onClick={() => toggleSource(group.source)}
                                  >
                                    <span className="text-xs">
                                      {isExpanded ? "▼" : "▶"}
                                    </span>
                                    <span>{group.source}</span>
                                  </button>
                                </td>
                                <td className="py-3 pr-4 text-ink-500">Total</td>
                                <td className="py-3 pr-4 text-ink-500">-</td>
                                <td className="py-3 pr-4 text-ink-700">
                                  {formatNumber(group.orders)}
                                </td>
                                <td className="py-3 pr-4 text-ink-700">
                                  {formatCurrency(group.revenue)}
                                </td>
                                <td className="py-3 pr-4 text-ink-700">
                                  {(group.share * 100).toFixed(1)}%
                                </td>
                              </tr>
                              {isExpanded &&
                                group.children.map((child, index) => (
                                  <tr
                                    key={`${child.source}-${child.medium}-${child.campaign}-${index}`}
                                    className="border-b border-ink-100 bg-sand-100/60"
                                  >
                                    <td className="py-3 pr-4 text-ink-600">
                                      {child.source}
                                    </td>
                                    <td className="py-3 pr-4 text-ink-600">
                                      {child.medium}
                                    </td>
                                    <td className="py-3 pr-4 text-ink-600">
                                      {child.campaign}
                                    </td>
                                    <td className="py-3 pr-4 text-ink-700">
                                      {formatNumber(child.orders)}
                                    </td>
                                    <td className="py-3 pr-4 text-ink-700">
                                      {formatCurrency(child.revenue)}
                                    </td>
                                    <td className="py-3 pr-4 text-ink-500">-</td>
                                  </tr>
                                ))}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg text-display text-ink-900">Cupons</h3>
                  {coupons.isFetching ? (
                    <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
                      Atualizando
                    </span>
                  ) : null}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-[0.2em] text-ink-500">
                        <th className="py-2 pr-4">Cupom</th>
                        <th className="py-2 pr-4">Pedidos</th>
                        <th className="py-2 pr-4">Receita</th>
                        <th className="py-2 pr-4">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.isLoading ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-ink-500">
                            Carregando dados...
                          </td>
                        </tr>
                      ) : coupons.isError ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-ember-500">
                            Nao foi possivel carregar os dados.
                          </td>
                        </tr>
                      ) : couponGroups.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-ink-500">
                            Nenhum dado encontrado para o periodo.
                          </td>
                        </tr>
                      ) : (
                        couponGroups.map((coupon) => (
                          <tr key={coupon.code} className="border-b border-ink-100">
                            <td className="py-3 pr-4 text-ink-900">
                              {coupon.code}
                            </td>
                            <td className="py-3 pr-4 text-ink-700">
                              {formatNumber(coupon.orders)}
                            </td>
                            <td className="py-3 pr-4 text-ink-700">
                              {formatCurrency(coupon.revenue)}
                            </td>
                            <td className="py-3 pr-4 text-ink-700">
                              {(coupon.share * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          </Fragment>
        ) : isClientsDash ? (
          <section className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Clientes"
              title="Top clientes por receita"
              description={`Periodo: ${clientFilters.start} ate ${clientFilters.end}`}
            />
            {customers.isLoading ? (
              <Card className="flex items-center justify-center py-12 text-sm text-ink-500">
                Carregando dados...
              </Card>
            ) : customers.isError ? (
              <Card className="flex items-center justify-center py-12 text-sm text-ember-500">
                Nao foi possivel carregar os dados.
              </Card>
            ) : topCustomers.length === 0 ? (
              <Card className="flex items-center justify-center py-12 text-sm text-ink-500">
                Nenhum dado encontrado para o periodo.
              </Card>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="flex flex-col gap-4" hover={false}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink-900">
                        Pessoa Fisica (CPF)
                      </span>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                        {formatNumber(customers.data?.byType?.pf?.totalCustomers ?? 0)} clientes
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-ink-500">
                          Total Pedidos
                        </span>
                        <span className="text-2xl font-semibold text-ink-900">
                          {formatNumber(customers.data?.byType?.pf?.totalOrders ?? 0)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-ink-500">
                          Receita Total
                        </span>
                        <span className="text-2xl font-semibold text-ink-900">
                          {formatCurrency((customers.data?.byType?.pf?.totalRevenue ?? 0) / 100)}
                        </span>
                      </div>
                      <div className="col-span-2 flex flex-col gap-1 rounded-lg bg-sky-50 p-4 border-2 border-sky-200">
                        <span className="text-xs uppercase tracking-wider text-sky-700 font-medium">
                          Ticket Medio PF
                        </span>
                        <span className="text-3xl font-bold text-sky-600">
                          {formatCurrency((customers.data?.byType?.pf?.avgOrderValue ?? 0) / 100)}
                        </span>
                      </div>
                    </div>
                  </Card>
                  <Card className="flex flex-col gap-4" hover={false}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink-900">
                        Pessoa Juridica (CNPJ)
                      </span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        {formatNumber(customers.data?.byType?.pj?.totalCustomers ?? 0)} clientes
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-ink-500">
                          Total Pedidos
                        </span>
                        <span className="text-2xl font-semibold text-ink-900">
                          {formatNumber(customers.data?.byType?.pj?.totalOrders ?? 0)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wider text-ink-500">
                          Receita Total
                        </span>
                        <span className="text-2xl font-semibold text-ink-900">
                          {formatCurrency((customers.data?.byType?.pj?.totalRevenue ?? 0) / 100)}
                        </span>
                      </div>
                      <div className="col-span-2 flex flex-col gap-1 rounded-lg bg-emerald-50 p-4 border-2 border-emerald-200">
                        <span className="text-xs uppercase tracking-wider text-emerald-700 font-medium">
                          Ticket Medio PJ
                        </span>
                        <span className="text-3xl font-bold text-emerald-600">
                          {formatCurrency((customers.data?.byType?.pj?.avgOrderValue ?? 0) / 100)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
                {(() => {
                  const pfAvg = (customers.data?.byType?.pf?.avgOrderValue ?? 0) / 100;
                  const pjAvg = (customers.data?.byType?.pj?.avgOrderValue ?? 0) / 100;
                  const diff = pjAvg - pfAvg;
                  const percentDiff = pfAvg > 0 ? ((diff / pfAvg) * 100) : 0;
                  const isHigher = diff > 0;
                  
                  return diff !== 0 ? (
                    <Card className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-50 to-slate-100" hover={false}>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-ink-600">
                          Diferenca entre tickets medios
                        </span>
                        <span className="text-lg font-medium text-ink-900">
                          Clientes PJ gastam em media{" "}
                          <span className={`font-bold ${isHigher ? "text-emerald-600" : "text-sky-600"}`}>
                            {formatCurrency(Math.abs(diff))}
                          </span>
                          {" "}
                          {isHigher ? "a mais" : "a menos"} que clientes PF
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-4xl font-bold ${isHigher ? "text-emerald-600" : "text-sky-600"}`}>
                          {isHigher ? "+" : ""}{percentDiff.toFixed(1)}%
                        </span>
                        <span className="text-xs text-ink-500">diferenca percentual</span>
                      </div>
                    </Card>
                  ) : null;
                })()}
                <DataTable
                  title="Clientes que mais gastaram"
                  rows={topCustomers}
                  columns={customerColumns}
                  filename="top-clientes-receita.csv"
                />
                <DataTable
                  title="Clientes com mais pedidos"
                  rows={topCustomersByOrders}
                  columns={customerColumns}
                  filename="top-clientes-pedidos.csv"
                />
              </div>
            )}
          </section>
        ) : isProductsDash ? (
          <section className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Produtos"
              title="Top produtos"
              description={`Periodo: ${productFilters.start} ate ${productFilters.end}`}
            />
            {productsByQuantity.isLoading || productsByRevenue.isLoading ? (
              <Card className="flex items-center justify-center py-12 text-sm text-ink-500">
                Carregando dados...
              </Card>
            ) : productsByQuantity.isError || productsByRevenue.isError ? (
              <Card className="flex items-center justify-center py-12 text-sm text-ember-500">
                Nao foi possivel carregar os dados.
              </Card>
            ) : topProductsByQuantity.length === 0 && topProductsByRevenue.length === 0 ? (
              <Card className="flex items-center justify-center py-12 text-sm text-ink-500">
                Nenhum dado encontrado para o periodo.
              </Card>
            ) : (
              <div className="flex flex-col gap-6">
                <DataTable
                  title="Produtos que mais venderam"
                  rows={topProductsByQuantity}
                  columns={productColumns}
                  filename="top-produtos-quantidade.csv"
                />
                <DataTable
                  title="Produtos com maior receita"
                  rows={topProductsByRevenue}
                  columns={productColumns}
                  filename="top-produtos-receita.csv"
                />
              </div>
            )}
          </section>
        ) : (
          <section className="flex flex-col gap-6">
            <SectionHeader
              eyebrow="Ecommerce"
              title="Retencao por periodo"
              description={`Periodo: ${retentionFilters.start} ate ${retentionFilters.end}`}
            />
            {retention.isLoading ? (
              <Card className="flex items-center justify-center py-12 text-sm text-ink-500">
                Carregando dados...
              </Card>
            ) : retention.isError || cohort.isError || newVsReturning.isError ? (
              <Card className="flex items-center justify-center py-12 text-sm text-ember-500">
                Nao foi possivel carregar os dados.
              </Card>
            ) : retentionRows.length === 0 ? (
              <Card className="flex items-center justify-center py-12 text-sm text-ink-500">
                Nenhum dado encontrado para o periodo.
              </Card>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="flex flex-col gap-2" hover={false}>
                    <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
                      Retencao ultimo periodo
                    </span>
                    <span className="text-3xl text-display text-ink-900">
                      {retentionLatest?.retentionRate === null
                        ? "-"
                        : formatPercent(retentionLatest?.retentionRate ?? 0, 1)}
                    </span>
                  </Card>
                  <Card className="flex flex-col gap-2" hover={false}>
                    <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
                      Clientes periodo atual
                    </span>
                    <span className="text-3xl text-display text-ink-900">
                      {formatNumber(retentionLatest?.customers ?? 0)}
                    </span>
                  </Card>
                  <Card className="flex flex-col gap-2" hover={false}>
                    <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
                      Retidos do periodo anterior
                    </span>
                    <span className="text-3xl text-display text-ink-900">
                      {formatNumber(retentionLatest?.retainedCustomers ?? 0)}
                    </span>
                  </Card>
                </div>
                <DataTable
                  title="Retencao mensal"
                  rows={retentionRows}
                  columns={retentionColumns}
                  filename="retencao-periodo.csv"
                />
                <DataTable
                  title="Novas vendas vs recompra"
                  rows={newVsReturningRows}
                  columns={newVsReturningColumns}
                  filename="novas-vendas-vs-recompra.csv"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-ink-500">
                    <span className="flex items-center gap-2">
                      Meta novas vendas
                      <span className="text-ink-700">
                        {formatPercent(newSalesTarget, 1)}
                      </span>
                      <button
                        type="button"
                        className="text-ink-500 hover:text-ink-700"
                        onClick={() => {
                          setDraftNewSalesTarget(newSalesTarget);
                          setDraftReturningTarget(returningTarget);
                          setIsEditingTargets(true);
                        }}
                      >
                        ✎
                      </button>
                    </span>
                    {isEditingTargets ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={(draftNewSalesTarget * 100).toFixed(1)}
                        onChange={(event) =>
                          setDraftNewSalesTarget(
                            Math.max(0, Number(event.target.value) / 100)
                          )
                        }
                        className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800"
                      />
                    ) : null}
                  </label>
                  <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-ink-500">
                    <span className="flex items-center gap-2">
                      Meta recompra
                      <span className="text-ink-700">
                        {formatPercent(returningTarget, 1)}
                      </span>
                      <button
                        type="button"
                        className="text-ink-500 hover:text-ink-700"
                        onClick={() => {
                          setDraftNewSalesTarget(newSalesTarget);
                          setDraftReturningTarget(returningTarget);
                          setIsEditingTargets(true);
                        }}
                      >
                        ✎
                      </button>
                    </span>
                    {isEditingTargets ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={(draftReturningTarget * 100).toFixed(1)}
                        onChange={(event) =>
                          setDraftReturningTarget(
                            Math.max(0, Number(event.target.value) / 100)
                          )
                        }
                        className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm text-ink-800"
                      />
                    ) : null}
                  </label>
                </div>
                {isEditingTargets ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="rounded-full border border-ink-900 bg-ink-900 px-4 py-2 text-xs uppercase tracking-[0.2em] text-sand-50 transition hover:bg-ink-800"
                      onClick={() => {
                        setNewSalesTarget(draftNewSalesTarget);
                        setReturningTarget(draftReturningTarget);
                        setIsEditingTargets(false);
                      }}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-ink-100 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink-600 transition hover:border-ink-200 hover:text-ink-900"
                      onClick={() => {
                        setDraftNewSalesTarget(newSalesTarget);
                        setDraftReturningTarget(returningTarget);
                        setIsEditingTargets(false);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : null}
                <Card className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg text-display text-ink-900">
                      Analise de cohort (mes a mes)
                    </h3>
                  </div>
                  {cohort.isLoading ? (
                    <div className="py-10 text-center text-sm text-ink-500">
                      Carregando dados...
                    </div>
                  ) : cohortMonths.length === 0 ? (
                    <div className="py-10 text-center text-sm text-ink-500">
                      Nenhum dado encontrado para o periodo.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-[0.2em] text-ink-500">
                            <th className="py-2 pr-4">Cohort</th>
                            {cohortMonths.map((month) => (
                              <th key={month} className="py-2 pr-4">
                                {monthLabel(month)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cohortMatrix.map((row) => {
                            const base = row.values[row.cohortKey] ?? 0;
                            return (
                            <tr key={row.cohortKey} className="border-b border-ink-100">
                              <td className="py-3 pr-4 text-ink-700">
                                {monthLabel(row.cohortKey)}
                              </td>
                              {cohortMonths.map((month) => {
                                const value = row.values[month];
                                const isBefore = month < row.cohortKey;
                                const share = base > 0 ? (value ?? 0) / base : null;
                                return (
                                  <td key={`${row.cohortKey}-${month}`} className="py-3 pr-4">
                                    {isBefore ? (
                                      "-"
                                    ) : (
                                      <span className="flex items-baseline gap-2">
                                        <span>{formatNumber(value ?? 0)}</span>
                                        {share === null ? null : (
                                          <span className="text-[10px] text-ink-400">
                                            ({formatPercent(share, 1)})
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                          })}
                        </tbody>
                        {cohortMatrix.length > 0 ? (
                          <tfoot>
                            <tr className="border-t border-ink-100 bg-sand-100/70 text-sm font-semibold text-ink-900">
                              <td className="py-3 pr-4">Total</td>
                              {cohortMonths.map((month) => (
                                <td key={`total-${month}`} className="py-3 pr-4">
                                  {formatNumber(cohortTotals[month] ?? 0)}
                                </td>
                              ))}
                            </tr>
                          </tfoot>
                        ) : null}
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
