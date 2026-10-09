import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { heroServices } from '../data/home'

const heading = 'Đặt dịch vụ\ntại nhà trong\nvài giây'
const benefits = ['Mô tả dịch vụ bạn cần', 'Chọn ngân sách và thời gian', 'Nhận báo giá và chọn nhà cung cấp tốt nhất']

function useTypewriter(text) {
  const [state, setState] = useState({ length: 0, fading: false })
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer
    const tick = (length, fading = false) => {
      setState({ length, fading })
      if (fading) timer = setTimeout(() => tick(0), 450)
      else if (length === text.length) timer = setTimeout(() => tick(length, true), 2400)
      else timer = setTimeout(() => tick(length + 1), length === 0 ? 500 : 90)
    }
    tick(0)
    return () => clearTimeout(timer)
  }, [text])
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? [text, false] : [text.slice(0, state.length), state.fading]
}

function ServiceColumn({ services, reverse = false }) {
  return <div className="overflow-hidden">
    <div className={`v-marquee ${reverse ? 'reverse' : ''}`}>
      {[...services, ...services].map((service, index) => <div key={`${service.title}-${index}`} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm" aria-hidden={index >= services.length}>
        <img src={service.image} alt="" className="h-14 w-14 flex-none rounded-md object-cover" />
        <div className="min-w-0"><p className="text-[15px] font-semibold leading-tight text-ink">{service.title}</p><p className="mt-1 text-xs text-neutral-500">{service.detail}</p></div>
      </div>)}
    </div>
  </div>
}

export function Hero() {
  const [typed, fading] = useTypewriter(heading)
  return <section className="relative overflow-hidden bg-white">
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <h1 className={`typewriter font-display font-bold text-[40px] leading-[1.15] text-ink sm:text-[58px] lg:text-[76px] ${fading ? 'is-fading' : ''}`} aria-label={heading.replaceAll('\n', ' ')}>{typed}</h1>
          <p className="hero-fade mt-6 max-w-lg text-[17px] leading-relaxed text-neutral-600" style={{ animationDelay: '.6s' }}>Tiết kiệm hàng giờ đồng hồ. Kết nối với hàng nghìn nhà cung cấp uy tín cho mọi nhu cầu — từ sửa điện, vệ sinh đến chăm sóc thú cưng.</p>
          <ol className="mt-8 space-y-4">{benefits.map((benefit, index) => <li key={benefit} className="hero-fade flex items-start gap-3" style={{ animationDelay: `${.8 + index * .15}s` }}>
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary-50 text-[13px] font-semibold text-primary-600">{index + 1}</span>
            <span className="pt-0.5 text-[15px] text-neutral-700">{benefit}</span>
          </li>)}</ol>
          <div className="hero-fade mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: '1.3s' }}>
            <a href="#featured" className="inline-flex h-12 items-center gap-2 rounded-full bg-primary-500 px-7 text-[15px] font-medium text-white shadow-sm hover:bg-primary-600">Đặt dịch vụ ngay <ArrowRight size={16} /></a>
            <a href="#how-it-works" className="inline-flex h-12 items-center px-5 text-[15px] font-medium text-neutral-700 hover:text-primary-600">Tìm hiểu cách hoạt động</a>
          </div>
        </div>
        <div className="relative lg:col-span-6"><div className="v-mask relative grid h-[420px] grid-cols-2 gap-4 sm:h-[560px] lg:h-[620px]">
          <ServiceColumn services={heroServices.slice(0, 6)} />
          <ServiceColumn services={heroServices.slice(6)} reverse />
        </div></div>
      </div>
    </div>
  </section>
}
