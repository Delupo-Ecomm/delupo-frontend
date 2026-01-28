import { useQuery } from "@tanstack/react-query";
import {
  getCohort,
  getCoupons,
  getCustomers,
  getNewVsReturning,
  getOrders,
  getProducts,
  getPromotions,
  getRetention,
  getSummary,
  getUtm
} from "./api.js";

export const useOrders = (filters, options = {}) =>
  useQuery({
    queryKey: ["orders", filters],
    queryFn: () => getOrders(filters),
    ...options
  });

export const useSummary = (filters, options = {}) =>
  useQuery({
    queryKey: ["summary", filters],
    queryFn: () => getSummary(filters),
    ...options
  });

export const useUtm = (filters, options = {}) =>
  useQuery({
    queryKey: ["utm", filters],
    queryFn: () => getUtm(filters),
    ...options
  });

export const useCoupons = (filters, options = {}) =>
  useQuery({
    queryKey: ["coupons", filters],
    queryFn: () => getCoupons(filters),
    ...options
  });

export const usePromotions = (filters, options = {}) =>
  useQuery({
    queryKey: ["promotions", filters],
    queryFn: () => getPromotions(filters),
    ...options
  });

export const useCustomers = (filters, options = {}) =>
  useQuery({
    queryKey: ["customers", filters],
    queryFn: () => getCustomers(filters),
    ...options
  });

export const useProducts = (filters, options = {}) =>
  useQuery({
    queryKey: ["products", filters],
    queryFn: () => getProducts(filters),
    ...options
  });

export const useRetention = (filters, options = {}) =>
  useQuery({
    queryKey: ["retention", filters],
    queryFn: () => getRetention(filters),
    ...options
  });

export const useCohort = (filters, options = {}) =>
  useQuery({
    queryKey: ["cohort", filters],
    queryFn: () => getCohort(filters),
    ...options
  });

export const useNewVsReturning = (filters, options = {}) =>
  useQuery({
    queryKey: ["new-vs-returning", filters],
    queryFn: () => getNewVsReturning(filters),
    ...options
  });
