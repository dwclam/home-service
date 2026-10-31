import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, CircleCheck, Droplets, GraduationCap, Hammer, PawPrint, Search, Sparkles, Star, Zap } from 'lucide-react'
import { categories, completedTasks, featuredServices, providers, steps } from '../data/home'

const icons = { Zap, Droplets, Sparkles, PawPrint, GraduationCap, Hammer, Search, CalendarCheck, CircleCheck }
const container = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

function SectionHeading({ title, subtitle, href }) {
  return <div className="mb-10 flex items-end justify-between gap-4">
    <div><h2 className="font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">{title}</h2><p className="mt-2 text-[15px] text-neutral-500">{subtitle}</p></div>
    {href && <a href={href} className="hidden items-center gap-1 whitespace-nowrap text-sm font-medium text-primary-600 hover:text-primary-700 sm:inline-flex">Xem tất cả <ArrowRight size={16} /></a>}
  </div>
}

export function Categories() {
  return <section id="categories" className="bg-neutral-50 py-20"><div className={container}>
    <SectionHeading title="Danh mục phổ biến" subtitle="Chọn dịch vụ bạn đang cần" href="#featured" />
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {categories.map(category => {
        const Icon = icons[category.icon]
        return <a key={category.title} href="#featured" className="group flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:border-neutral-300 hover:shadow-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-primary-50 group-hover:bg-primary-100"><Icon className="h-6 w-6 text-primary-600" /></span>
          <span className="text-center text-sm font-medium text-ink">{category.title}</span><span className="text-xs text-neutral-500">{category.count} dịch vụ</span>
        </a>
      })}
    </div>
  </div></section>
}

function CompletedTaskCard({ task }) {
  return <article className="w-[min(380px,calc(100vw-32px))] flex-none rounded-xl border border-neutral-200 bg-neutral-50 p-6">
    <div className="flex items-start gap-4"><img src={task.image} alt="" className="h-12 w-12 rounded-full object-cover" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{task.category}</p><h3 className="mt-1.5 text-[17px] font-semibold leading-snug text-ink">{task.title}</h3></div></div>
    <div className="mt-5 flex items-center justify-between"><span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-ink"><Star className="h-3.5 w-3.5 fill-accent-500 text-accent-500" />{task.rating}</span><span className="text-[18px] font-semibold text-ink">{task.price}</span></div>
  </article>
}

export function CompletedTasks() {
  return <section className="overflow-hidden bg-white py-20">
    <div className={`${container} mb-10`}><h2 className="font-display text-[32px] font-bold leading-[1.15] text-ink sm:text-[44px] lg:text-[52px]">Xem khách hàng đã<br className="hidden sm:block" /> hoàn thành những gì</h2><p className="mt-3 max-w-xl text-[15px] text-neutral-500">Hàng nghìn công việc được hoàn thành mỗi ngày trên Nestify</p></div>
    <div className="h-marquee-wrap"><div className="h-marquee">{[...completedTasks, ...completedTasks].map((task, index) => <CompletedTaskCard key={`${task.title}-${index}`} task={task} />)}</div></div>
  </section>
}

function FeaturedServiceCard({ service }) {
  return <article className="group overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md">
    <div className="relative h-48 overflow-hidden bg-neutral-100"><img src={service.image} alt={service.category} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" /><span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-primary-700 backdrop-blur">{service.category}</span></div>
    <div className="p-5"><h3 className="mb-2 line-clamp-2 min-h-[3.25rem] text-[17px] font-semibold text-ink">{service.title}</h3>
      <div className="mb-4 flex flex-wrap items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">{service.initials}</span><span className="text-sm text-neutral-600">{service.provider}</span><span className="text-neutral-300">•</span><span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent-500 text-accent-500" /><span className="text-sm font-medium text-neutral-700">{service.rating}</span><span className="text-xs text-neutral-500">({service.reviews})</span></span></div>
      <div className="flex items-center justify-between border-t border-neutral-200 pt-4"><div><p className="text-xs text-neutral-500">Từ</p><p className="text-[17px] font-semibold text-primary-600">{service.price}</p></div><Link to="/customer/bookings/new" className="inline-flex h-9 items-center rounded-md bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600">Đặt lịch</Link></div>
    </div>
  </article>
}

export function FeaturedServices() {
  return <section id="featured" className="bg-neutral-50 py-20"><div className={container}>
    <SectionHeading title="Dịch vụ nổi bật" subtitle="Được đặt nhiều nhất tuần này" href="#providers" />
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{featuredServices.map(service => <FeaturedServiceCard key={service.title} service={service} />)}</div>
  </div></section>
}

export function HowItWorks() {
  return <section id="how-it-works" className="bg-white py-20"><div className={container}>
    <div className="mx-auto mb-14 max-w-2xl text-center"><h2 className="font-display text-[30px] font-bold leading-tight text-ink sm:text-[40px]">Chỉ với 3 bước đơn giản</h2><p className="mt-3 text-[15px] text-neutral-500">Từ lúc tìm dịch vụ đến khi hoàn thành chỉ mất vài phút</p></div>
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">{steps.map((step, index) => {
      const Icon = icons[step.icon]
      return <div key={step.title} className="text-center"><div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-primary-50"><Icon className="h-6 w-6 text-primary-600" /></div><span className="mb-3 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">Bước {index + 1}</span><h3 className="mb-2 text-[17px] font-semibold text-ink">{step.title}</h3><p className="mx-auto max-w-xs text-sm leading-relaxed text-neutral-500">{step.description}</p></div>
    })}</div>
  </div></section>
}

function ProviderCard({ provider }) {
  return <article className="rounded-lg border border-neutral-200 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md">
    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-[18px] font-semibold text-primary-700">{provider.initials}</div>
    <h3 className="mb-1 text-[16px] font-semibold text-ink">{provider.name}</h3><p className="mb-3 text-xs text-neutral-500">{provider.specialty}</p>
    <div className="mb-4 flex items-center justify-center gap-1"><Star className="h-4 w-4 fill-accent-500 text-accent-500" /><span className="text-sm font-medium text-neutral-700">{provider.rating}</span><span className="text-xs text-neutral-500">({provider.reviews})</span></div>
    <div className="mb-5 flex items-center justify-center gap-4 border-b border-neutral-200 pb-5 text-xs text-neutral-500"><span>{provider.orders}</span><span className="h-1 w-1 rounded-full bg-neutral-300" /><span>{provider.experience}</span></div>
    <a href="#featured" className="inline-flex h-9 w-full items-center justify-center rounded-md border border-neutral-200 px-4 text-sm font-medium text-primary-600 hover:border-primary-200 hover:bg-primary-50">Xem hồ sơ</a>
  </article>
}

export function TopProviders() {
  return <section id="providers" className="bg-neutral-50 py-20"><div className={container}>
    <SectionHeading title="Nhà cung cấp hàng đầu" subtitle="Được đánh giá cao nhất tháng này" href="#provider" />
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{providers.map(provider => <ProviderCard key={provider.name} provider={provider} />)}</div>
  </div></section>
}

export function ProviderCallout() {
  return <section id="provider" className="bg-white pb-20"><div className={container}>
    <div className="overflow-hidden rounded-2xl bg-ink p-10 lg:p-14"><div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
      <div className="lg:col-span-8"><h2 className="font-display text-[26px] font-bold leading-tight text-white lg:text-[36px]">Trở thành nhà cung cấp dịch vụ</h2><p className="mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-300">Tăng thu nhập bằng cách cung cấp dịch vụ trên nền tảng của chúng tôi. Đăng ký miễn phí, không phí ẩn.</p></div>
      <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:flex-col"><a href="#footer" className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-ink hover:bg-neutral-100">Đăng ký làm nhà cung cấp</a><a href="#how-it-works" className="inline-flex h-11 items-center justify-center rounded-full border border-neutral-700 px-6 text-sm font-medium text-white hover:bg-neutral-800">Tìm hiểu thêm</a></div>
    </div></div>
  </div></section>
}
