"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useTranslations } from "../i18n/LocaleProvider";
import "../styles/data-table.css";

export type TableColumn<T> = {
  id: string;
  header: string;
  render?: (row: T) => ReactNode;
};
export type TableFilter<T> = {
  id: string;
  label: string;
  allLabel?: string;
  options?: { value: string; label: string }[];
  type?: "text" | "date";
  value?: string;
  onChange?: (value: string) => void;
  matches?: (row: T, value: string) => boolean;
};
type TablePagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};
type DataTableProps<T> = {
  data: T[];
  columns: TableColumn<T>[];
  rowKey: (row: T) => string | number;
  /** For complex existing rows; otherwise provide a render function on each column. */
  renderRow?: (row: T) => ReactNode;
  title: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchText?: (row: T) => string;
  filters?: TableFilter<T>[];
  toolbarActions?: ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  pagination?: TablePagination;
  /** Use when filtering is performed by an API that returns an unpaginated list. */
  manualFiltering?: boolean;
  initialPageSize?: number;
};

export function DataTable<T>({
  data,
  columns,
  rowKey,
  renderRow,
  title,
  searchPlaceholder = "Search records",
  searchValue,
  onSearchChange,
  searchText,
  filters = [],
  toolbarActions,
  loading = false,
  emptyMessage = "No records found. Adjust your search or filters.",
  pagination,
  manualFiltering = false,
  initialPageSize = 10,
}: DataTableProps<T>) {
  const t = useTranslations();
  const [localSearch, setLocalSearch] = useState("");
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState(initialPageSize);
  const search = searchValue ?? localSearch;
  const activeFilters = filters.map((filter) => ({
    ...filter,
    current: filter.value ?? localFilters[filter.id] ?? "",
  }));
  const scope = JSON.stringify([
    search,
    activeFilters.map((filter) => [filter.id, filter.current]),
    pageSize,
  ]);
  const [position, setPosition] = useState({ scope, page: 1 });
  const filtered = useMemo(() => {
    // Server-backed views filter the full dataset through their API.
    if (pagination || manualFiltering) return data;
    const query = search.trim().toLocaleLowerCase();
    return data.filter(
      (row) =>
        (!query ||
          (searchText ? searchText(row) : JSON.stringify(row))
            .toLocaleLowerCase()
            .includes(query)) &&
        filters.every((filter) => {
          const value = filter.value ?? localFilters[filter.id] ?? "";
          return !value || !filter.matches || filter.matches(row, value);
        }),
    );
  }, [
    data,
    pagination,
    search,
    searchText,
    filters,
    localFilters,
    manualFiltering,
  ]);
  const size = pagination?.pageSize ?? pageSize;
  const total = pagination?.total ?? filtered.length;
  const pages = Math.max(1, pagination?.totalPages ?? Math.ceil(total / size));
  const page =
    pagination?.page ??
    Math.min(position.scope === scope ? position.page : 1, pages);
  const visible = pagination
    ? filtered
    : filtered.slice((page - 1) * size, page * size);
  const start = total && visible.length ? (page - 1) * size + 1 : 0;
  const end = start ? Math.min(start + visible.length - 1, total) : 0;
  const hasFilters = Boolean(
    search || activeFilters.some((filter) => filter.current),
  );
  function changePage(next: number) {
    if (pagination) pagination.onPageChange(next);
    else setPosition({ scope, page: next });
  }
  function changeSearch(value: string) {
    setPosition({ scope, page: 1 });
    setLocalSearch(value);
    onSearchChange?.(value);
    if (pagination) pagination.onPageChange(1);
  }
  function changeFilter(filter: TableFilter<T>, value: string) {
    setPosition({ scope, page: 1 });
    if (filter.onChange) filter.onChange(value);
    else setLocalFilters((current) => ({ ...current, [filter.id]: value }));
    if (pagination) pagination.onPageChange(1);
  }
  function clear() {
    changeSearch("");
    activeFilters.forEach((filter) => {
      if (filter.current) changeFilter(filter, "");
    });
  }
  const firstPage = Math.max(1, Math.min(page - 2, pages - 4));
  return (
    <div className="data-table" aria-busy={loading}>
      <div className="data-table-top">
        <div className="data-table-toolbar">
          <label className="data-table-search">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder={t(searchPlaceholder)}
              aria-label={`${t("Search")} ${t(title)}`}
            />
            {search && (
              <button
                type="button"
                onClick={() => changeSearch("")}
                aria-label={t("Clear search")}
              >
                <X size={16} />
              </button>
            )}
          </label>
          {toolbarActions && (
            <div className="data-table-toolbar-actions">{toolbarActions}</div>
          )}
        </div>
        {filters.length > 0 && (
          <div className="data-table-filters">
            <span className="data-table-filter-label">
              <SlidersHorizontal size={15} />
              {t("Filters")}
            </span>
            {activeFilters.map((filter) => (
              <label key={filter.id}>
                <span>{t(filter.label)}</span>
                {filter.options ? (
                  <select
                    value={filter.current}
                    onChange={(event) =>
                      changeFilter(filter, event.target.value)
                    }
                  >
                    <option value="">
                      {t(
                        filter.allLabel ??
                          (filter.label === "Status" ? "All statuses" : "All"),
                      )}
                    </option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={filter.type ?? "text"}
                    value={filter.current}
                    onChange={(event) =>
                      changeFilter(filter, event.target.value)
                    }
                    placeholder={t(filter.label)}
                  />
                )}
              </label>
            ))}
          </div>
        )}
        {hasFilters && (
          <div className="data-table-applied" aria-label={t("Applied filters")}>
            {search && (
              <button
                type="button"
                className="data-table-capsule"
                onClick={() => changeSearch("")}
                aria-label={t("Clear search")}
              >
                <span>
                  {t("Search")}: {search}
                </span>
                <X size={13} />
              </button>
            )}
            {activeFilters
              .filter((filter) => filter.current)
              .map((filter) => (
                <button
                  type="button"
                  key={filter.id}
                  className="data-table-capsule"
                  onClick={() => changeFilter(filter, "")}
                  aria-label={`${t("Clear")} ${t(filter.label)}`}
                >
                  <span>
                    {t(filter.label)}:{" "}
                    {t(
                      filter.options?.find(
                        (option) => option.value === filter.current,
                      )?.label ?? filter.current,
                    )}
                  </span>
                  <X size={13} />
                </button>
              ))}
            <button type="button" className="data-table-clear" onClick={clear}>
              {t("Clear all")}
            </button>
          </div>
        )}
      </div>
      <div
        className="data-table-scroll"
        role="region"
        aria-label={t(title)}
        tabIndex={0}
      >
        <table>
          <caption className="visually-hidden">{t(title)}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column.id}>
                  {t(column.header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="data-table-state" role="status">
                    {t("Loading records...")}
                  </div>
                </td>
              </tr>
            ) : visible.length ? (
              visible.map((row) =>
                renderRow ? (
                  renderRow(row)
                ) : (
                  <tr key={rowKey(row)}>
                    {columns.map((column) => (
                      <td key={column.id}>{column.render?.(row)}</td>
                    ))}
                  </tr>
                ),
              )
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <div className="data-table-state" role="status">
                    {t(emptyMessage)}
                    {hasFilters && (
                      <button
                        type="button"
                        className="data-table-clear"
                        onClick={clear}
                      >
                        {t("Clear all")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="data-table-footer">
        <span className="data-table-total" aria-live="polite">
          {t("Showing")}{" "}
          <strong>
            {start}&ndash;{end}
          </strong>{" "}
          {t("of")} <strong>{total.toLocaleString()}</strong> {t("records")}
        </span>
        <div className="data-table-pagination">
          {!pagination && (
            <label>
              {t("Rows per page")}
              <select
                value={pageSize}
                onChange={(event) => {
                  setPosition({ scope, page: 1 });
                  setPageSize(Number(event.target.value));
                }}
              >
                {Array.from(new Set([initialPageSize, 10, 20, 50]))
                  .sort((a, b) => a - b)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <nav aria-label={`${t(title)} ${t("pagination")}`}>
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => changePage(page - 1)}
              aria-label={t("Previous page")}
            >
              <ChevronLeft size={17} />
            </button>
            {Array.from(
              { length: Math.min(5, pages) },
              (_, index) => firstPage + index,
            ).map((number) => (
              <button
                type="button"
                key={number}
                aria-current={page === number ? "page" : undefined}
                disabled={loading}
                onClick={() => changePage(number)}
                aria-label={`${t("Page")} ${number}`}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              disabled={loading || page >= pages}
              onClick={() => changePage(page + 1)}
              aria-label={t("Next page")}
            >
              <ChevronRight size={17} />
            </button>
          </nav>
          <span className="data-table-page-count">
            {page} / {pages}
          </span>
        </div>
      </div>
    </div>
  );
}
