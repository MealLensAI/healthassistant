import { Camera } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Dietitian } from '@/lib/care/types'
import { ProfilePhoto } from '@/components/care-ui/PhotoViewer'
import { Pill, Stars } from '@/components/care-ui/Primitives'

export function DietitianHero({
  dietitian,
  editable = false,
  onChangeCover,
  onChangeAvatar,
  actions,
}: {
  dietitian: Dietitian
  editable?: boolean
  onChangeCover?: (url: string) => void
  onChangeAvatar?: (url: string) => void
  actions?: ReactNode
}) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="relative h-36 overflow-hidden bg-panel sm:h-44 md:h-52">
        {dietitian.coverImage ? (
          <img
            src={dietitian.coverImage}
            alt=""
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-navy-soft via-panel to-cream px-4 text-center">
            <p className="text-sm font-medium text-muted">
              {editable && onChangeCover ? 'Upload a cover photo' : ''}
            </p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-white/40" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
        {editable && onChangeCover ? (
          <ImagePicker
            label={dietitian.coverImage ? 'Change cover photo' : 'Upload cover photo'}
            className="absolute right-3 top-3 sm:right-4 sm:top-4"
            onImage={onChangeCover}
          />
        ) : null}
      </div>
      <div className="relative px-4 pb-5 sm:px-8 sm:pb-6">
        <div className="relative z-10 -mt-12 w-fit sm:-mt-14">
          <ProfilePhoto
            src={dietitian.avatar}
            name={dietitian.name}
            className="h-16 w-16 rounded-2xl object-cover shadow-md ring-[4px] ring-white sm:h-[72px] sm:w-[72px] sm:ring-[5px] md:h-20 md:w-20"
            fallbackClassName="grid h-16 w-16 place-items-center rounded-2xl bg-navy-soft text-lg font-bold text-navy shadow-md ring-[4px] ring-white sm:h-[72px] sm:w-[72px] sm:text-xl sm:ring-[5px] md:h-20 md:w-20"
          />
          {editable && onChangeAvatar ? (
            <ImagePicker label="Change profile photo" className="absolute -bottom-1 -right-1 z-20" onImage={onChangeAvatar} />
          ) : null}
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:mt-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-tight tracking-tight text-ink sm:text-2xl sm:text-[28px]">{dietitian.name}</h1>
            {(dietitian.title || dietitian.country) && (
              <p className="mt-1 text-sm font-medium text-muted">
                {[dietitian.title, dietitian.country].filter(Boolean).join(' · ')}
              </p>
            )}
            {(dietitian.rating > 0 || dietitian.yearsExperience > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {dietitian.rating > 0 ? <Stars value={dietitian.rating} /> : null}
                {dietitian.yearsExperience > 0 ? (
                  <span className="text-muted">{dietitian.yearsExperience} years experience</span>
                ) : null}
              </div>
            )}
            {dietitian.specialties.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {dietitian.specialties.map((item) => (
                  <Pill key={item}>{item}</Pill>
                ))}
              </div>
            ) : null}
          </div>
          {actions}
        </div>
      </div>
    </article>
  )
}

function ImagePicker({
  label,
  className,
  onImage,
}: {
  label: string
  className?: string
  onImage: (url: string) => void
}) {
  return (
    <label
      className={`grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white text-navy shadow-md ring-1 ring-line hover:bg-navy-soft ${className ?? ''}`}
    >
      <Camera size={16} />
      <span className="sr-only">{label}</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          void compressImageFile(file)
            .then((dataUrl) => onImage(dataUrl))
            .catch(() => {
              const reader = new FileReader()
              reader.onload = () => onImage(String(reader.result))
              reader.readAsDataURL(file)
            })
          event.target.value = ''
        }}
      />
    </label>
  )
}

/** Shrink cover/avatar uploads so they persist through the care API. */
function compressImageFile(file: File, maxWidth = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / Math.max(image.width, 1))
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas unavailable'))
          return
        }
        ctx.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read image'))
    }
    image.src = objectUrl
  })
}
