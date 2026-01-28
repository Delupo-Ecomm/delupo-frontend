const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const buildUrl = (path, params = {}) => {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

export const fetchJson = async (path, params = {}) => {
  const response = await fetch(buildUrl(path, params));
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  const data = await response.json();
  return data;
};

export const getSummary = (filters) => fetchJson("/metrics/summary", filters);

export const getOrders = (filters) => fetchJson("/metrics/orders", filters);

export const getProducts = (filters) => fetchJson("/metrics/products", filters);

export const getCustomers = (filters) => fetchJson("/metrics/customers", filters);

export const getUtm = (filters) => fetchJson("/metrics/utm", filters);

export const getCoupons = (filters) => fetchJson("/metrics/coupons", filters);

export const getPromotions = (filters) => fetchJson("/metrics/promotions", filters);

export const getShipping = (filters) => fetchJson("/metrics/shipping", filters);

export const getPayments = (filters) => fetchJson("/metrics/payments", filters);

export const getRetention = (filters) => fetchJson("/metrics/retention", filters);

export const getCohort = (filters) => fetchJson("/metrics/cohort", filters);

export const getNewVsReturning = (filters) =>
  fetchJson("/metrics/new-vs-returning", filters);
