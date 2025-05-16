import React, { useState } from 'react';
import styles from './Table.module.css';
import ArrowUpward from './ArrowUpward';

interface TableColumn<T> {
  key: string; // dynamic string key
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: {
    label: string;
    onClick: (item: T) => void;
  }[];
  getRowKey?: (item: T, index: number) => string | number;
}

const Table = <T extends Record<string, unknown>>({
  data,
  columns,
  actions,
  getRowKey,
}: TableProps<T>) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = String(a[sortKey] ?? '').toLowerCase();
        const bVal = String(b[sortKey] ?? '').toLowerCase();
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      })
    : data;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <table className={`${styles.table} bg-white w-full border border-gray-300`}>
      <thead>
        <tr style={{ height: 48 }}>
          {columns.map((col) => (
            <th
              key={col.key}
              className={`${styles.tHeader} ${styles.rowStyle} ${col.sortable ? 'cursor-pointer' : ''}`}
              onClick={col.sortable ? () => handleSort(col.key) : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {col.label}
                {col.sortable && (
                  <ArrowUpward
                    size={20}
                    rotate={sortKey === col.key ? !sortAsc : false}
                    opacity={sortKey === col.key ? 1 : 0.3}
                  />
                )}
              </div>
            </th>
          ))}
          {actions && <th className={`${styles.tHeader} ${styles.rowStyle}`}></th>}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((item, index) => (
          <tr key={getRowKey ? getRowKey(item, index) : index} className={styles.rowStyle}>
            {columns.map((col) => (
              <td key={col.key} className={`${styles.tRow} ${styles.colStyle}`}>
                {col.render
                  ? col.render(item)
                  : String(item[col.key] ?? '')}
              </td>
            ))}
            {actions && (
              <td className={`${styles.tRow} ${styles.colStyle}`}>
                {actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => action.onClick(item)}
                    className="text-blue-600 hover:underline"
                  >
                    {action.label}
                  </button>
                ))}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Table;
