import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'

export const AccountMenu = ({
  account,
  fallbackName = 'Tài khoản',
  menuLinks = [],
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const displayName = account?.displayName || fallbackName
  const initialLetter = (account?.displayName || account?.email || fallbackName)
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <div className="relative font-sans" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-full hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <div className="w-7 h-7 rounded-full bg-primary-500 text-white font-semibold text-xs flex items-center justify-center shrink-0">
          {initialLetter}
        </div>
        <span className="text-sm font-medium text-ink max-w-[140px] truncate hidden sm:inline">
          {displayName}
        </span>
        <ChevronDown className="w-4 h-4 text-neutral-400 mr-1 shrink-0" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-md bg-white border border-neutral-200 shadow-md py-1.5 z-50"
        >
          <div className="px-4 py-2 border-b border-neutral-100">
            <p className="text-sm font-semibold text-ink truncate">
              {displayName}
            </p>
            {account?.email && (
              <p className="text-xs text-neutral-500 truncate">
                {account.email}
              </p>
            )}
          </div>

          <div className="py-1">
            {menuLinks.map((item) => {
              const Icon = item.icon
              if (item.to) {
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left focus-visible:outline-none focus-visible:bg-neutral-50"
                  >
                    {Icon && <Icon className="w-4 h-4 text-primary-600 shrink-0" />}
                    <span>{item.label}</span>
                  </Link>
                )
              }

              return (
                <a
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors text-left focus-visible:outline-none focus-visible:bg-neutral-50"
                >
                  {Icon && <Icon className="w-4 h-4 text-primary-600 shrink-0" />}
                  <span>{item.label}</span>
                </a>
              )
            })}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                onLogout?.()
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:bg-red-50"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountMenu
