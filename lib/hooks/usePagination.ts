import { useMemo, useState, useEffect } from "react";

export interface UsePaginationOptions {
  initialPageSize?: number;
  resetDeps?: any[]; // Dependencies that trigger page reset
}

export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
) {
  const { initialPageSize = 25, resetDeps = [] } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page on size change
  };

  return {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems: data.length,
    handlePageChange,
    handlePageSizeChange,
  };
}
