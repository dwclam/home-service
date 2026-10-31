import { Loader2, AlertCircle } from 'lucide-react'
import { EmptyState } from './EmptyState'
import { Pagination } from './Pagination'
import { Button } from './Button'

/**
 * Bảng dữ liệu dùng chung cho khu vực NCC và Admin.
 * Hỗ trợ:
 * - Trạng thái đang tải (isLoading), lỗi (error + onRetry), rỗng (emptyTitle/emptyDescription/emptyAction).
 * - Phân trang đồng bộ PageResponse<T> của backend.
 * - Tuân thủ card bo góc 12px (rounded-lg), viền neutral-200, hover neutral-100 nhẹ.
 */
export const DataTable = ({
  columns = [],
  data = [],
  rowKey = 'id',
  isLoading = false,
  error = null,
  onRetry = null,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription = 'Hiện chưa có bản ghi nào để hiển thị.',
  emptyAction = null,
  pagination = null,
  onPageChange = null,
  className = '',
}) => {
  const getRowKey = (row, index) => {
    if (typeof rowKey === 'function') {
      return rowKey(row, index)
    }
    return row?.[rowKey] ?? index
  }

  return (
    <div
      className={`bg-white border border-neutral-200 rounded-lg shadow-xs overflow-hidden font-sans ${className}`.trim()}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
          <p className="text-sm text-neutral-500 font-medium">
            Đang tải dữ liệu...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4">
          <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-[17px] font-semibold text-ink mb-1">
            Không thể tải dữ liệu
          </h3>
          <p className="text-sm text-neutral-500 max-w-md mb-4">
            {typeof error === 'string'
              ? error
              : error?.message || 'Đã xảy ra lỗi khi kết nối máy chủ.'}
          </p>
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Thử lại
            </Button>
          )}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  {columns.map((col) => (
                    <th
                      key={col.key || col.title}
                      className={`py-3.5 px-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider select-none ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                      } ${col.headerClassName || ''}`.trim()}
                    >
                      {col.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-sm text-neutral-700">
                {data.map((row, rowIndex) => (
                  <tr
                    key={getRowKey(row, rowIndex)}
                    className="hover:bg-neutral-100/70 transition-colors duration-150"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key || col.title}
                        className={`py-3.5 px-4 align-middle ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                        } ${col.className || ''}`.trim()}
                      >
                        {col.render
                          ? col.render(row, rowIndex)
                          : row?.[col.dataIndex ?? col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && (
            <div className="px-4 pb-4">
              <Pagination
                page={pagination.page ?? 0}
                size={pagination.size ?? 10}
                totalElements={pagination.totalElements ?? data.length}
                totalPages={pagination.totalPages ?? 1}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DataTable
