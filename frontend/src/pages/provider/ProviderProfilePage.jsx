import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  MapPin,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { providerProfileSchema } from '../../features/provider/schemas'
import {
  getMyProviderProfile,
  updateMyProviderProfile,
} from '../../features/provider/api'
import { FormField } from '../../components/ui/FormField'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'

export const ProviderProfilePage = () => {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadTick, setReloadTick] = useState(0)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(providerProfileSchema),
    defaultValues: {
      businessName: '',
      city: '',
      address: '',
      bio: '',
      logoUrl: '',
    },
  })

  const watchedBusinessName = useWatch({ control, name: 'businessName' })
  const watchedCity = useWatch({ control, name: 'city' })
  const watchedBio = useWatch({ control, name: 'bio' })
  const watchedLogoUrl = useWatch({ control, name: 'logoUrl' })

  useEffect(() => {
    let isMounted = true

    const loadProfileData = async () => {
      try {
        const result = await getMyProviderProfile()
        if (!isMounted) return
        const data = result.data
        setProfile(data)
        setLoadError('')
        reset({
          businessName: data?.businessName || '',
          city: data?.city || '',
          address: data?.address || '',
          bio: data?.bio || '',
          logoUrl: data?.logoUrl || '',
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
      reset({
        businessName: result.data.businessName || '',
        city: result.data.city || '',
        address: result.data.address || '',
        bio: result.data.bio || '',
        logoUrl: result.data.logoUrl || '',
      })
      toast.success('Đã cập nhật hồ sơ.')
    } catch (err) {
      const fieldErrors = err?.response?.data?.fieldErrors
      if (fieldErrors && typeof fieldErrors === 'object') {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          setError(field, { type: 'server', message: String(msg) })
        })
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
          Đang tải hồ sơ...
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
        <h2 className="text-[17px] font-semibold text-ink mb-2">
          Không thể tải hồ sơ
        </h2>
        <Button variant="secondary" size="sm" onClick={handleRetry}>
          Thử lại
        </Button>
      </div>
    )
  }

  const isVisibleProfile = Boolean(profile?.visible ?? profile?.isVisible ?? true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-ink">
          Hồ sơ nhà cung cấp
        </h2>
        <StatusBadge
          status={isVisibleProfile ? 'PUBLISHED' : 'ARCHIVED'}
          customLabel={isVisibleProfile ? 'Đang hiển thị' : 'Tạm ẩn'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-lg shadow-xs p-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                label="Tên cơ sở"
                htmlFor="businessName"
                required
                error={errors.businessName?.message}
              >
                <Input
                  id="businessName"
                  placeholder="Điện Lạnh Bách Khoa 247"
                  leftIcon={<Building2 className="w-4 h-4" />}
                  {...register('businessName')}
                />
              </FormField>

              <FormField
                label="Thành phố"
                htmlFor="city"
                required
                error={errors.city?.message}
              >
                <Input
                  id="city"
                  placeholder="Hà Nội"
                  leftIcon={<MapPin className="w-4 h-4" />}
                  {...register('city')}
                />
              </FormField>
            </div>

            <FormField
              label="Địa chỉ"
              htmlFor="address"
              error={errors.address?.message}
            >
              <Input
                id="address"
                placeholder="Số nhà, đường, phường/xã, quận/huyện"
                {...register('address')}
              />
            </FormField>

            <FormField
              label="Đường dẫn ảnh đại diện"
              htmlFor="logoUrl"
              error={errors.logoUrl?.message}
            >
              <Input
                id="logoUrl"
                placeholder="https://example.com/logo.jpg"
                leftIcon={<ImageIcon className="w-4 h-4" />}
                {...register('logoUrl')}
              />
            </FormField>

            <FormField
              label="Giới thiệu"
              htmlFor="bio"
              error={errors.bio?.message}
            >
              <textarea
                id="bio"
                rows={4}
                placeholder="Giới thiệu về kinh nghiệm và dịch vụ cung cấp..."
                className={`w-full rounded-md border px-3 py-2.5 text-[15px] font-sans text-ink bg-white outline-none transition-colors duration-150 placeholder:text-neutral-400 ${
                  errors.bio
                    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                    : 'border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
                }`}
                {...register('bio')}
              />
            </FormField>

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
                Lưu hồ sơ
              </Button>
            </div>
          </form>
        </div>

        <div>
          <div className="bg-white border border-neutral-200 rounded-lg shadow-xs p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
              Xem trước
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
                  {watchedBusinessName || 'Tên đơn vị'}
                </p>
                <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {watchedCity || 'Chưa cập nhật khu vực'}
                  </span>
                </p>
              </div>
            </div>

            <p className="text-sm text-neutral-700 line-clamp-4 leading-relaxed">
              {watchedBio || 'Chưa có thông tin giới thiệu.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProviderProfilePage
