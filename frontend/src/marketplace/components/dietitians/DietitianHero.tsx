import { Camera } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Dietitian } from '../../types'
import { ProfilePhoto } from '../ui/PhotoViewer'
import { Pill, Stars } from '../ui/Primitives'

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
      <div className="relative h-44 md:h-52">
        <img src={dietitian.coverImage} alt="" className="h-full w-full object-cover object-left" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-white" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
        {editable && onChangeCover ? (
          <ImagePicker label="Change cover photo" className="absolute right-4 top-4" onImage={onChangeCover} />
        ) : null}
      </div>
      <div className="relative px-5 pb-6 sm:px-8">
        <div className="relative z-10 -mt-14 w-fit">
          <ProfilePhoto
            src={dietitian.avatar}
            name={dietitian.name}
            className="h-[72px] w-[72px] rounded-2xl object-cover shadow-md ring-[5px] ring-white md:h-20 md:w-20"
            fallbackClassName="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-navy-soft text-xl font-bold text-navy shadow-md ring-[5px] ring-white md:h-20 md:w-20"
          />
          {editable && onChangeAvatar ? (
            <ImagePicker label="Change profile photo" className="absolute -bottom-1 -right-1 z-20" onImage={onChangeAvatar} />
          ) : null}
        </div>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">{dietitian.name}</h1>
            <p className="mt-1 text-sm font-medium text-muted">
              {dietitian.title} · {dietitian.country}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Stars value={dietitian.rating} />
              <span className="text-muted">{dietitian.yearsExperience} years experience</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {dietitian.specialties.map((item) => (
                <Pill key={item}>{item}</Pill>
              ))}
            </div>
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
          const reader = new FileReader()
          reader.onload = () => onImage(String(reader.result))
          reader.readAsDataURL(file)
          event.target.value = ''
        }}
      />
    </label>
  )
}
