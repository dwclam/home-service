import { Link } from 'react-router-dom'
import logoMark from '../../assets/logo/nestify-mark.png'

const SIZES = {
  sm: {
    img: 'h-[28px] w-auto',
    text: 'text-[20px]',
  },
  md: {
    img: 'h-[34px] w-auto',
    text: 'text-[24px]',
  },
  lg: {
    img: 'h-[42px] w-auto',
    text: 'text-[28px]',
  },
}

export const BrandLogo = ({
  size = 'md',
  showText = true,
  to = '/',
  className = '',
}) => {
  const currentSize = SIZES[size] || SIZES.md

  const content = (
    <>
      <img
        src={logoMark}
        alt="Nestify"
        className={`${currentSize.img} object-contain shrink-0 transition-transform duration-200 group-hover:scale-105`}
      />
      {showText && (
        <span
          className={`font-logo font-bold text-primary-600 leading-none select-none ${currentSize.text}`}
        >
          Nestify
        </span>
      )}
    </>
  )

  const combinedClasses = `group inline-flex items-center gap-2.5 ${className}`.trim()

  if (to) {
    return (
      <Link to={to} className={combinedClasses} aria-label="Nestify - Về trang chủ">
        {content}
      </Link>
    )
  }

  return <div className={combinedClasses}>{content}</div>
}

export default BrandLogo
