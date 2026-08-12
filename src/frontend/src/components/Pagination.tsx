'use client';

import { useEffect, useState } from 'react';
import { TablePagination } from '@mui/material';

export const ROWS_PER_PAGE_OPTIONS = [10, 50, 100];

export function usePagination(total: number, initialRowsPerPage = 10) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  return {
    page: safePage,
    rowsPerPage,
    setPage,
    onRowsPerPageChange: (rows: number) => {
      setRowsPerPage(rows);
      setPage(0);
    },
    slice: <T,>(items: T[]): T[] => items.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage),
  };
}

interface PaginationProps {
  count: number;
  page: number;
  onPageChange: (page: number) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
}

export default function Pagination({
  count,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS,
}: PaginationProps) {
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={(_, p) => onPageChange(p)}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
      rowsPerPageOptions={[...rowsPerPageOptions]}
      labelRowsPerPage="Filas por página"
      labelDisplayedRows={({ from, to, count: c }) =>
        `${from}–${to} de ${c === -1 ? `más de ${to}` : c}`
      }
    />
  );
}