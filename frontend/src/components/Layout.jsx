import { Home, Menu, X } from 'lucide-react'
import { useState } from 'react'

const nav = [
  ['Đặt dịch vụ', '#featured'], ['Danh mục', '#categories'],
  ['Cách hoạt động', '#how-it-works'], ['Về chúng tôi', '#footer'],
]

function Brand() {
  return <a href="#top" className="flex items-center gap-2" aria-label="Nestify - về đầu trang">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500"><Home className="h-5 w-5 text-white" /></span>
    <span className="font-logo text-[24px] font-bold text-primary-600">Nestify</span>
  </a>
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  return <header id="top" className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-10">
          <Brand />
          <nav aria-label="Điều hướng chính" className="hidden items-center gap-7 lg:flex">
            {nav.map(([label, href]) => <a key={label} href={href} className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-600">{label}</a>)}
          </nav>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <a href="#featured" className="inline-flex h-10 items-center px-3 text-sm font-medium text-neutral-700 hover:text-primary-600">Đăng nhập</a>
          <a href="#provider" className="inline-flex h-10 items-center rounded-full bg-primary-50 px-4 text-sm font-medium text-ink hover:bg-primary-100">Trở thành nhà cung cấp</a>
          <a href="#featured" className="hidden h-10 items-center rounded-md bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 md:inline-flex">Đăng ký</a>
        </div>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 lg:hidden" aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && <nav aria-label="Điều hướng di động" className="flex flex-col gap-1 border-t border-neutral-200 py-3 lg:hidden">
        {nav.map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-neutral-50">{label}</a>)}
        <a href="#provider" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-primary-600 sm:hidden">Trở thành nhà cung cấp</a>
      </nav>}
    </div>
  </header>
}

const footerGroups = [
  { title: 'Sản phẩm', links: [['Dịch vụ', '#featured'], ['Nhà cung cấp', '#providers'], ['Bảng giá', '#featured'], ['Khuyến mãi', '#featured']] },
  { title: 'Công ty', links: [['Về chúng tôi', '#footer'], ['Tuyển dụng', '#provider'], ['Blog', '#footer'], ['Liên hệ', '#footer']] },
  { title: 'Hỗ trợ', links: [['Trung tâm trợ giúp', '#footer'], ['Điều khoản', '#footer'], ['Bảo mật', '#footer'], ['Hoàn tiền', '#footer']] },
]

export function Footer() {
  return <footer id="footer" className="border-t border-neutral-200 bg-neutral-50">
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
        <div className="col-span-2">
          <Brand />
          <p className="mb-5 mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">Nền tảng kết nối khách hàng với nhà cung cấp dịch vụ uy tín hàng đầu Việt Nam.</p>
        </div>
        {footerGroups.map(group => <div key={group.title}>
          <h3 className="mb-4 text-sm font-semibold text-ink">{group.title}</h3>
          <ul className="space-y-3">{group.links.map(([label, href]) => <li key={label}><a href={href} className="text-sm text-neutral-500 hover:text-primary-600">{label}</a></li>)}</ul>
        </div>)}
      </div>
      <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-8 sm:flex-row">
        <p className="text-sm text-neutral-500">© 2026 Nestify. Bảo lưu mọi quyền.</p>
        <div className="flex items-center gap-6">{['Điều khoản', 'Bảo mật', 'Cookie'].map(label => <a key={label} href="#footer" className="text-sm text-neutral-500 hover:text-primary-600">{label}</a>)}</div>
      </div>
    </div>
  </footer>
}
