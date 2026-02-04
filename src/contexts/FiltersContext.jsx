import { createContext, useContext, useState, useEffect } from "react";
import { format, subDays } from "date-fns";

const FiltersContext = createContext();

const STORAGE_KEY = 'delupo-filters';

function loadFiltersFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading filters from localStorage:', error);
  }
  return null;
}

function saveFiltersToStorage(filters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error('Error saving filters to localStorage:', error);
  }
}

export function FiltersProvider({ children }) {
  const defaultFilters = {
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
    status: "", // "" = Todos, "invoiced" = Faturados
  };

  const [globalFilters, setGlobalFilters] = useState(() => {
    const saved = loadFiltersFromStorage();
    return saved || defaultFilters;
  });

  useEffect(() => {
    saveFiltersToStorage(globalFilters);
  }, [globalFilters]);

  const updateFilters = (updates) => {
    setGlobalFilters((prev) => ({ ...prev, ...updates }));
  };

  return (
    <FiltersContext.Provider value={{ globalFilters, updateFilters }}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useGlobalFilters() {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useGlobalFilters must be used within FiltersProvider");
  }
  return context;
}
