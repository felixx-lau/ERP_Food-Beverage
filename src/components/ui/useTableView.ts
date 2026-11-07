"use client";
import { useMemo, useState } from "react";
export default function useTableView<T>(items: T[], searchText: (row: T) => string, sortValue: (row: T, key: string) => string | number, pageSize = 10) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{key: string; direction: "asc" | "desc"}>({key: "", direction: "asc"});
  const filtered = useMemo(() => {
    const rows = items.filter(row => searchText(row).toLowerCase().includes(query.toLowerCase()));
    if (sort.key) rows.sort((a, b) => { const av = sortValue(a, sort.key), bv = sortValue(b, sort.key); const result = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "id", {numeric: true}); return sort.direction === "asc" ? result : -result; });
    return rows;
  }, [items, query, sort, searchText, sortValue]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  return { query, setQuery: (value: string) => { setQuery(value); setPage(1); }, sort, toggleSort: (key: string) => { setSort(s => ({key, direction: s.key === key && s.direction === "asc" ? "desc" : "asc"})); setPage(1); }, page: currentPage, setPage, pages, total: filtered.length, pageSize, rows: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize) };
}
