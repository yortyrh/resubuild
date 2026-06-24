'use client';

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  caption?: string;
  /**
   * Optional mobile-friendly row renderer. When provided, the data table
   * renders a stacked card view below the `md` breakpoint and the existing
   * table view at `md+`. Both views stay in sync via the same `data` and
   * the consumer is responsible for any per-row wiring the card needs.
   */
  renderCard?: (row: TData) => ReactNode;
  /**
   * Stable key accessor for the card list. Falls back to the row index when
   * the row does not expose an `id` field.
   */
  getRowKey?: (row: TData, index: number) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  caption,
  renderCard,
  getRowKey,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const hasData = rows.length > 0;
  const emptyMessage = 'No applications yet.';

  return (
    <>
      <div
        data-testid="applications-data-table"
        className="surface-soft text-card-foreground hidden overflow-hidden md:block"
      >
        <Table aria-label={caption}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="divider-soft hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-muted-foreground bg-muted/30 h-10 text-xs font-medium uppercase tracking-wide"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {hasData ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className="divider-soft"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {renderCard ? (
        <div className="md:hidden">
          {hasData ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {rows.map((row, index) => {
                const key = getRowKey ? getRowKey(row.original, index) : row.id;
                return <li key={key}>{renderCard(row.original)}</li>;
              })}
            </ul>
          ) : (
            <div className="surface-soft text-muted-foreground p-6 text-center text-sm">
              {emptyMessage}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
