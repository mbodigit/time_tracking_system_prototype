import { useMemo, useState, type ReactNode } from "react";
import { PAGE_SIZES, ALL_ROWS, DEFAULT_PAGE_SIZE } from "./data-table-config";

export type SortDirection = "asc" | "desc";

export interface DataTableOptions<T> {
  rows: T[];
  searchText: (row: T) => string;
  sortValue: (row: T, key: string) => number | string;
  initialSortKey: string;
  initialDirection?: SortDirection;
  initialPageSize?: number;
}

export interface DataTableState<T> {
  rows: T[];
  allRows: T[];
  total: number;
  filtered: number;
  search: string;
  setSearch: (value: string) => void;
  sortKey: string;
  sortDirection: SortDirection;
  toggleSort: (key: string) => void;
  page: number;
  setPage: (value: number) => void;
  pageCount: number;
  pageSize: number;
  setPageSize: (value: number) => void;
  rangeFrom: number;
  rangeTo: number;
}

export const useDataTable = <T,>({
  rows,
  searchText,
  sortValue,
  initialSortKey,
  initialDirection = "asc",
  initialPageSize = DEFAULT_PAGE_SIZE,
}: DataTableOptions<T>): DataTableState<T> => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(initialDirection);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const toggleSort = (key: string) => {
    setPage(1);

    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const sortedRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filteredRows = term
      ? rows.filter((row) => searchText(row).toLowerCase().includes(term))
      : rows;

    return [...filteredRows].sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);

      const result =
        typeof left === "string" && typeof right === "string"
          ? left.localeCompare(right, "hu")
          : Number(left) - Number(right);

      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, searchText, sortValue, search, sortKey, sortDirection]);

  const filtered = sortedRows.length;

  const pageCount =
    pageSize === ALL_ROWS ? 1 : Math.max(1, Math.ceil(filtered / pageSize));

  const safePage = Math.min(Math.max(1, page), pageCount);

  const visibleRows =
    pageSize === ALL_ROWS
      ? sortedRows
      : sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    rows: visibleRows,
    allRows: sortedRows,
    total: rows.length,
    filtered,
    search,
    setSearch: changeSearch,
    sortKey,
    sortDirection,
    toggleSort,
    page: safePage,
    setPage,
    pageCount,
    pageSize,
    setPageSize: changePageSize,
    rangeFrom: filtered === 0 ? 0 : (safePage - 1) * (pageSize || filtered) + 1,
    rangeTo:
      pageSize === ALL_ROWS
        ? filtered
        : Math.min(safePage * pageSize, filtered),
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
  label: ReactNode;
  sublabel?: ReactNode;
  align?: "left" | "right";
}

export const SortableHeader = ({
  table,
  field,
  label,
  sublabel,
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
    {sublabel && <div className="font-normal opacity-60">{sublabel}</div>}
  </th>
);

type PagerTable = Pick<
  DataTableState<unknown>,
  | "filtered"
  | "page"
  | "setPage"
  | "pageCount"
  | "pageSize"
  | "setPageSize"
  | "rangeFrom"
  | "rangeTo"
>;

interface PagerProps {
  table: PagerTable;
  unit?: string;
}

export const TablePager = ({ table, unit = "sor" }: PagerProps) => (
  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
    <div className="flex items-center gap-2">
      <span className="opacity-70">Oldalanként</span>
      <select
        className="select select-xs select-bordered w-24"
        value={table.pageSize}
        onChange={(event) => table.setPageSize(Number(event.target.value))}
        aria-label={`Megjelenített ${unit}ok száma`}
      >
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
        <option value={ALL_ROWS}>Mind</option>
      </select>
      <span className="opacity-70">
        {table.filtered === 0
          ? `Nincs megjeleníthető ${unit}`
          : `${table.rangeFrom}-${table.rangeTo} / ${table.filtered} ${unit}`}
      </span>
    </div>

    {table.pageCount > 1 && (
      <div className="join">
        <button
          type="button"
          className="btn btn-xs join-item"
          onClick={() => table.setPage(1)}
          disabled={table.page === 1}
          aria-label="Első oldal"
        >
          «
        </button>
        <button
          type="button"
          className="btn btn-xs join-item"
          onClick={() => table.setPage(table.page - 1)}
          disabled={table.page === 1}
          aria-label="Előző oldal"
        >
          ‹
        </button>
        <span className="btn btn-xs join-item pointer-events-none">
          {table.page} / {table.pageCount}
        </span>
        <button
          type="button"
          className="btn btn-xs join-item"
          onClick={() => table.setPage(table.page + 1)}
          disabled={table.page === table.pageCount}
          aria-label="Következő oldal"
        >
          ›
        </button>
        <button
          type="button"
          className="btn btn-xs join-item"
          onClick={() => table.setPage(table.pageCount)}
          disabled={table.page === table.pageCount}
          aria-label="Utolsó oldal"
        >
          »
        </button>
      </div>
    )}
  </div>
);
