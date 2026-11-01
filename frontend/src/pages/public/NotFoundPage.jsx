import { Link } from 'react-router-dom'
import { BrandLogo } from '../../components/ui/BrandLogo'
import { Button } from '../../components/ui/Button'

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 font-sans text-center">
      <BrandLogo size="lg" className="mb-6" />

      <h1 className="font-display text-6xl font-bold text-ink mb-2">404</h1>
      <h2 className="text-xl font-semibold text-ink mb-2">Không tìm thấy trang</h2>
      <p className="text-neutral-500 text-sm max-w-md mb-6">
        Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển sang vị trí khác.
      </p>

      <Link to="/">
        <Button variant="primary" size="md">
          Quay về Trang chủ
        </Button>
      </Link>
    </div>
  )
}

export default NotFoundPage
