import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  MapPin,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Landmark,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { providerProfileSchema } from '../../features/provider/schemas'
import {
  getMyProviderProfile,
  updateMyProviderProfile,
} from '../../features/provider/api'
import { BANK_VERIFICATION_CONFIG } from '../../constants/status'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'

export const ProviderProfilePage = () => {
  const [profile, setProfile] = useState(null)
  const [isMockMode, setIsMockMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(providerProfileSchema),
    defaultValues: {
      businessName: '',
      city: '',
      address: '',
      bio: '',
      logoUrl: '',
      isVisible: true,
    },
  })

  const watchedBusinessName = useWatch({ control, name: 'businessName' })
  const watchedCity = useWatch({ control, name: 'city' })
  const watchedBio = useWatch({ control, name: 'bio' })
  const watchedLogoUrl = useWatch({ control, name: 'logoUrl' })
  const watchedIsVisible = useWatch({ control, name: 'isVisible' })

  useEffect(() => {
    let isMounted = true

    const loadProfileData = async () => {
      try {
        const result = await getMyProviderProfile()
        if (!isMounted) return
        const data = result.data
        setProfile(data)
        setIsMockMode(Boolean(result.isMock))
        setLoadError('')
        reset({
          businessName: data?.businessName || '',
          city: data?.city || '',
          address: data?.address || '',
          bio: data?.bio || '',
          logoUrl: data?.logoUrl || '',
          isVisible: data?.isVisible ?? true,
        })
      } catch (err) {
        if (!isMounted) return
        setLoadError(
          err?.response?.data?.message ||
            err?.message ||
            'Không thể tải thông tin hồ sơ nhà cung cấp.'
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProfileData()

    return () => {
      isMounted = false
    }
  }, [reloadTick, reset])

  const handleRetry = () => {
    setIsLoading(true)
    setLoadError('')
    setReloadTick((prev) => prev + 1)
  }

  const onSubmit = async (values) => {
    try {
      const result = await updateMyProviderProfile(values)
      setProfile(result.data)
      setIsMockMode(Boolean(result.isMock))
      reset({
        businessName: result.data.businessName || '',
        city: result.data.city || '',
        address: result.data.address || '',
        bio: result.data.bio || '',
        logoUrl: result.data.logoUrl || '',
        isVisible: result.data.isVisible ?? true,
      })
      toast.success('Đã cập nhật hồ sơ công khai thành công.')
    } catch (err) {
      const fieldErrors = err?.response?.data?.fieldErrors
      if (fieldErrors && typeof fieldErrors === 'object') {
        const firstMsg = Object.values(fieldErrors)[0]
        toast.error(firstMsg || 'Dữ liệu nhập vào chưa hợp lệ.')
      } else {
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            'Cập nhật hồ sơ thất bại.'
        )
      }
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
        <p className="text-sm text-neutral-500 font-medium">
          Đang tải hồ sơ nhà cung cấp...
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-10 text-center">
        <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-[17px] font-semibold text-ink mb-1">
          Không thể tải hồ sơ
        </h2>
        <p className="text-sm text-neutral-500 mb-4">{loadError}</p>
        <Button variant="secondary" size="sm" onClick={handleRetry}>
          Thử lại
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang & trạng thái kết nối hợp đồng API */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">
            Hồ sơ công khai Nhà cung cấp
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            UC18 — Cập nhật thông tin hiển thị với khách hàng. Trạng thái xét duyệt và ngân hàng được bảo vệ riêng.
          </p>
        </div>

        {isMockMode && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700">
            <Info className="w-4 h-4 shrink-0 text-primary-600" />
            <span>Chế độ dữ liệu mẫu theo hợp đồng API (chờ nối BE UC18)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái (2/3): Form cập nhật trường công khai UC18 */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-lg shadow-xs p-5 sm:p-6">
          <div className="pb-4 mb-5 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h3 className="text-[17px] font-semibold text-ink">
                Thông tin giới thiệu công khai
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Hiển thị trên trang chi tiết dịch vụ và hồ sơ đối tác
              </p>
            </div>
            <StatusBadge
              status={watchedIsVisible ? 'PUBLISHED' : 'ARCHIVED'}
              customLabel={
                watchedIsVisible ? 'Đang hiển thị hồ sơ' : 'Đang ẩn hồ sơ'
              }
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                label="Tên đơn vị / Cửa hàng"
                htmlFor="businessName"
                required
                error={errors.businessName?.message}
              >
                <Input
                  id="businessName"
                  placeholder="Ví dụ: Điện Lạnh Bách Khoa 247"
                  leftIcon={<Building2 className="w-4 h-4" />}
                  {...register('businessName')}
                />
              </FormField>

              <FormField
                label="Tỉnh / Thành phố hoạt động"
                htmlFor="city"
                required
                error={errors.city?.message}
              >
                <Input
                  id="city"
                  placeholder="Ví dụ: Hà Nội, TP. Hồ Chí Minh"
                  leftIcon={<MapPin className="w-4 h-4" />}
                  {...register('city')}
                />
              </FormField>
            </div>

            <FormField
              label="Địa chỉ cơ sở / Khu vực phục vụ chính"
              htmlFor="address"
              error={errors.address?.message}
              hint="Địa chỉ hiển thị trên hồ sơ công khai để khách hàng tham khảo phạm vi phục vụ."
            >
              <Input
                id="address"
                placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                {...register('address')}
              />
            </FormField>

            <FormField
              label="Đường dẫn ảnh đại diện / Logo (URL)"
              htmlFor="logoUrl"
              error={errors.logoUrl?.message}
            >
              <Input
                id="logoUrl"
                placeholder="https://example.com/logo-don-vi.jpg"
                leftIcon={<ImageIcon className="w-4 h-4" />}
                {...register('logoUrl')}
              />
            </FormField>

            <FormField
              label="Giới thiệu năng lực & Kinh nghiệm (Bio)"
              htmlFor="bio"
              error={errors.bio?.message}
              hint="Mô tả ngắn gọn thế mạnh, cam kết chất lượng và quy trình làm việc (tối đa 2000 ký tự)."
            >
              <textarea
                id="bio"
                rows={4}
                placeholder="Giới thiệu về đội ngũ kỹ thuật viên, kinh nghiệm thực tế và cam kết bảo hành..."
                className={`w-full rounded-md border px-3 py-2.5 text-[15px] font-sans text-ink bg-white outline-none transition-colors duration-150 placeholder:text-neutral-400 ${
                  errors.bio
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                }`}
                {...register('bio')}
              />
            </FormField>

            {/* Bật / tắt hiển thị công khai */}
            <div className="p-4 rounded-md bg-neutral-50 border border-neutral-200 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {watchedIsVisible ? (
                  <Eye className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                ) : (
                  <EyeOff className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <label
                    htmlFor="isVisible"
                    className="text-sm font-semibold text-ink cursor-pointer"
                  >
                    Cho phép hiển thị hồ sơ công khai
                  </label>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                    Theo đặc tả UC18 & mục 4.3: chỉ các gói dịch vụ PUBLISHED thuộc nhà cung cấp đang hiển thị hồ sơ mới nhận được yêu cầu đặt lịch mới từ khách hàng.
                  </p>
                </div>
              </div>

              <input
                id="isVisible"
                type="checkbox"
                className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mt-0.5 cursor-pointer"
                {...register('isVisible')}
              />
            </div>

            <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={!isDirty || isSubmitting}
                onClick={() =>
                  reset({
                    businessName: profile?.businessName || '',
                    city: profile?.city || '',
                    address: profile?.address || '',
                    bio: profile?.bio || '',
                    logoUrl: profile?.logoUrl || '',
                    isVisible: profile?.isVisible ?? true,
                  })
                }
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Hoàn tác
              </Button>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Lưu hồ sơ công khai
              </Button>
            </div>
          </form>
        </div>

        {/* Cột phải (1/3): Xem trước thẻ công khai & Thông tin chỉ đọc (Tài khoản/Ngân hàng) */}
        <div className="space-y-6">
          {/* Xem trước thẻ NCC */}
          <div className="bg-white border border-neutral-200 rounded-lg shadow-xs p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
              Xem trước hiển thị khách hàng
            </h3>

            <div className="flex items-center gap-3.5 mb-3">
              {watchedLogoUrl ? (
                <img
                  src={watchedLogoUrl}
                  alt="Logo đơn vị"
                  className="w-14 h-14 rounded-full object-cover border border-neutral-200 shrink-0 bg-neutral-100"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary-50 text-primary-600 font-bold text-lg flex items-center justify-center shrink-0 border border-primary-100">
                  {(watchedBusinessName || 'N').trim().charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-[17px] font-semibold text-ink truncate">
                  {watchedBusinessName || 'Tên đơn vị cung cấp'}
                </p>
                <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {watchedCity || 'Chưa cập nhật khu vực'}
                  </span>
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-700 line-clamp-3 leading-relaxed">
              {watchedBio ||
                'Chưa có mô tả giới thiệu năng lực của nhà cung cấp.'}
            </p>
          </div>

          {/* Thông tin bảo vệ chỉ đọc (Ngân hàng & Xét duyệt - phân tách với UC44) */}
          <div className="bg-white border border-neutral-200 rounded-lg shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[17px] font-semibold text-ink flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary-600" />
                <span>Tài khoản nhận chi trả</span>
              </h3>
              <StatusBadge
                status={profile?.bankVerificationStatus}
                configMap={BANK_VERIFICATION_CONFIG}
              />
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed mb-4">
              Thông tin ngân hàng và trạng thái duyệt không tự chỉnh sửa tại màn hình hồ sơ công khai (UC18) để đảm bảo an toàn đối soát.
            </p>

            <dl className="space-y-2.5 text-sm border-t border-neutral-200 pt-3.5">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-neutral-500">Ngân hàng:</dt>
                <dd className="font-medium text-ink text-right">
                  {profile?.bankCode || 'Chưa khai báo'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-neutral-500">Số tài khoản:</dt>
                <dd className="font-medium text-ink text-right">
                  {profile?.bankAccountNumberMasked || 'Chưa khai báo'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-neutral-500">Chủ tài khoản:</dt>
                <dd className="font-medium text-ink text-right">
                  {profile?.bankAccountHolderName || 'Chưa khai báo'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProviderProfilePage
