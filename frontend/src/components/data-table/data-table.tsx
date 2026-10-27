import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface DataTableOptions<T> {
  rows: T[];
  searchText: (row: T) => string;
  sortValue: (row: T, key: string) => number | string;
  initialSortKey: string;
  initialDirection?: SortDirection;
}

export interface DataTableState<T> {
  rows: T[];
  total: number;
  search: string;
  setSearch: (value: string) => void;
  sortKey: string;
  sortDirection: SortDirection;
  toggleSort: (key: string) => void;
}

export const useDataTable = <T,>({
  rows,
  searchText,
  sortValue,
  initialSortKey,
  initialDirection = "asc",
}: DataTableOptions<T>): DataTableState<T> => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialDirection);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = term
      ? rows.filter((row) => searchText(row).toLowerCase().includes(term))
      : rows;

    return [...filtered].sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);

      const result =
        typeof left === "string" && typeof right === "string"
          ? left.localeCompare(right, "hu")
          : Number(left) - Number(right);

      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, searchText, sortValue, search, sortKey, sortDirection]);

  return {
    rows: visibleRows,
    total: rows.length,
    search,
    setSearch,
    sortKey,
    sortDirection,
    toggleSort,
  };
};

interface SearchProps {
  table: Pick<DataTableState<unknown>, "search" | "setSearch">;
  placeholder?: string;
  className?: string;
}

export const TableSearch = ({
  table,
  placeholder = "Keresés...",
  className = "input input-sm input-bordered w-64",
}: SearchProps) => (
  <input
    type="search"
    className={className}
    placeholder={placeholder}
    value={table.search}
    onChange={(event) => table.setSearch(event.target.value)}
  />
);

interface HeaderProps {
  table: Pick<
    DataTableState<unknown>,
    "sortKey" | "sortDirection" | "toggleSort"
  >;
  field: string;
  label: string;
  align?: "left" | "right";
}

export const SortableHeader = ({
  table,
  field,
  label,
  align = "left",
}: HeaderProps) => (
  <th
    className={`cursor-pointer select-none ${
      align === "right" ? "text-right" : ""
    }`}
    onClick={() => table.toggleSort(field)}
    title="Kattints a rendezéshez"
  >
    {label}
    {table.sortKey === field
      ? table.sortDirection === "asc"
        ? " ▲"
        : " ▼"
      : ""}
  </th>
);
