import React, { useState } from 'react';

/**
 * Shared Table Component
 * Used in Admin and Employer portals
 */

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  selectedRows?: number[];
  onSelectRow?: (index: number) => void;
  onSelectAll?: (selected: boolean) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  sortBy,
  sortOrder = 'asc',
  onSort,
  className = '',
  striped = true,
  hoverable = true,
  compact = false
}: TableProps<T>) {
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);

  const handleSort = (columnKey: string) => {
    if (onSort) {
      onSort(columnKey);
    } else {
      if (localSortBy === columnKey) {
        setLocalSortOrder(localSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setLocalSortBy(columnKey);
        setLocalSortOrder('asc');
      }
    }
  };

  const getValue = (row: T, key: string) => {
    const keys = key.split('.');
    let value: any = row;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  };

  const sortedData = React.useMemo(() => {
    if (!localSortBy) return data;

    return [...data].sort((a, b) => {
      const aVal = getValue(a, localSortBy);
      const bVal = getValue(b, localSortBy);

      if (aVal < bVal) return localSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return localSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, localSortBy, localSortOrder]);

  const hasSelection = onSelectRow && onSelectAll;
  const allSelected = hasSelection && data.length > 0 && selectedRows.length === data.length;
  const someSelected = hasSelection && selectedRows.length > 0 && selectedRows.length < data.length;

  const cellPadding = compact ? 'px-4 py-2' : 'px-6 py-4';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {hasSelection && (
              <th scope="col" className={`${cellPadding} text-left`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll!(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
            )}
            {columns.map((column) => {
              const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left';
              const isCurrentSort = localSortBy === column.key;

              return (
                <th
                  key={column.key as string}
                  scope="col"
                  className={`${cellPadding} ${alignClass} text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key as string)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="ml-1">
                        {!isCurrentSort && (
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 12l5-5 5 5H5z" opacity="0.5" />
                            <path d="M15 8l-5 5-5-5h10z" opacity="0.5" transform="translate(0, 4)" />
                          </svg>
                        )}
                        {isCurrentSort && localSortOrder === 'asc' && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 12l5-5 5 5H5z" />
                          </svg>
                        )}
                        {isCurrentSort && localSortOrder === 'desc' && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M15 8l-5 5-5-5h10z" />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (hasSelection ? 1 : 0)}
                className="px-6 py-12 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => {
              const isSelected = selectedRows.includes(index);
              const rowClass = `
                ${striped && index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                ${hoverable ? 'hover:bg-gray-100' : ''}
                ${isSelected ? 'bg-blue-50' : ''}
                ${onRowClick ? 'cursor-pointer' : ''}
              `;

              return (
                <tr
                  key={index}
                  className={rowClass}
                  onClick={() => onRowClick && onRowClick(row, index)}
                >
                  {hasSelection && (
                    <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectRow!(index)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const value = getValue(row, column.key as string);
                    const alignClass = column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left';

                    return (
                      <td
                        key={column.key as string}
                        className={`${cellPadding} ${alignClass} text-sm text-gray-900 whitespace-nowrap`}
                      >
                        {column.render ? column.render(value, row, index) : value}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// Pagination Component
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (items: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = ''
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={`flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200 ${className}`}>
      <div className="flex items-center text-sm text-gray-700">
        Showing <span className="font-medium mx-1">{startItem}</span> to
        <span className="font-medium mx-1">{endItem}</span> of
        <span className="font-medium mx-1">{totalItems}</span> results

        {onItemsPerPageChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="ml-4 border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        )}
      </div>

      <nav className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`px-3 py-1 text-sm rounded-md ${
              page === currentPage
                ? 'bg-blue-600 text-white'
                : page === '...'
                ? 'text-gray-500 cursor-default'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </nav>
    </div>
  );
};

export default Table;