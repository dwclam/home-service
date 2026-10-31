import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

/**
 * Component phân trang chuẩn khớp cấu trúc PageResponse<T> của backend:
 * { items, page (0-based), size, totalElements, totalPages }
 */
export const Pagination = ({
  page = 0,
  size = 10,
  totalElements = 0,
  totalPages = 1,
  onPageChange,
  className = '',
}) => {
  if (totalElements <= 0 || totalPages <= 1) {
    return null
  }

  const startItem = page * size + 1
  const endItem = Math.min((page + 1) * size, totalElements)

  const handlePrev = () => {
    if (page > 0 && onPageChange) {
      onPageChange(page - 1)
    }
  }

  const handleNext = () => {
    if (page < totalPages - 1 && onPageChange) {
      onPageChange(page + 1)
    }
  }

  // Tạo dãy số trang hiển thị gọn gàng
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(0, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages - 1, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) {
      start = Math.max(0, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i += 1) {
      pages.push(i)
    }
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-200 font-sans ${className}`.trim()}
    >
      <p className="text-xs text-neutral-500">
        Hiển thị <span className="font-semibold text-ink">{startItem}</span>–
        <span className="font-semibold text-ink">{endItem}</span> trên tổng số{' '}
        <span className="font-semibold text-ink">{totalElements}</span> bản ghi
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 0}
          onClick={handlePrev}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          aria-label="Trang trước"
        >
          Trước
        </Button>

        {pageNumbers.map((pageIndex) => {
          const isActive = pageIndex === page
          return (
            <button
              key={pageIndex}
              type="button"
              onClick={() => onPageChange && onPageChange(pageIndex)}
              aria-current={isActive ? 'page' : undefined}
              className={`h-9 min-w-[36px] px-2.5 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'bg-primary-500 text-white shadow-xs'
                  : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {pageIndex + 1}
            </button>
          )
        })}

        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages - 1}
          onClick={handleNext}
          rightIcon={<ChevronRight className="w-4 h-4" />}
          aria-label="Trang tiếp"
        >
          Sau
        </Button>
      </div>
    </div>
  )
}

export default Pagination
