import { CalendarDays, FileSearch, MapPin, MessageSquare, Pencil, PhoneMissed, Plus, Trash2, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DietitianHero } from '@/components/dietitians/DietitianHero'
import { CredentialPreview } from '@/components/credentials/CredentialPreview'
import { Button } from '@/components/care-ui/Button'
import { AreaField } from '@/components/care-ui/Form'
import { Modal, Pill, Stars, Avatar } from '@/components/care-ui/Primitives'
import { useApp } from '@/lib/care/context'
import { unreadCountFor, unseenMissedCalls } from '@/lib/care/alerts'
import { draftDietitianFromUser } from '@/lib/care/draftDietitian'
import { patientChartPath } from '@/lib/care/profilePaths'
import { practiceBase, practicePath } from '@/lib/care/practiceBase'
import { formatDate, formatTime } from '@/lib/care/utils'
import type { CredentialDocument, Dietitian, ExperienceItem, Review } from '@/lib/care/types'

const tabs = ['About', 'Experience', 'Reviews'] as const
const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

export function DietitianProfilePage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const {
    dietitians,
    currentUser,
    addReview,
    deleteReview,
    conversations,
    messages,
    missedCalls,
    consultationRequests,
    users,
    respondConsultation,
    markMissedCallsSeen,
    updateDietitianProfile,
    saveAccount,
    applications,
  } = useApp()
  const location = useLocation()
  const requestedTab = params.get('tab')
  const [tab, setTab] = useState<(typeof tabs)[number]>(
    requestedTab?.toLowerCase() === 'reviews' ? 'Reviews' : 'About',
  )
  const [viewingDoc, setViewingDoc] = useState<CredentialDocument | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [callsOpen, setCallsOpen] = useState(false)
  const navigate = useNavigate()

  const application = applications.find((item) => item.userId === currentUser?.id)
  const listing = id
    ? dietitians.find(
        (item) => item.id === id && (item.status === 'approved' || item.userId === currentUser?.id),
      )
    : dietitians.find((item) => item.userId === currentUser?.id)
  const dietitian =
    listing ||
    (currentUser?.role === 'dietitian' && !id
      ? draftDietitianFromUser(currentUser, application)
      : undefined)

  if (!dietitian) {
    if (currentUser?.role === 'dietitian') {
      return (
        <div className="hy-card p-10 text-center">
          <p className="font-semibold text-ink">Your public profile isn’t live yet.</p>
          <p className="mt-2 text-sm text-muted">Register as a specialist so patients can find you.</p>
          <Link to={practicePath('apply')} className="mt-4 inline-block">
            <Button>Register</Button>
          </Link>
        </div>
      )
    }
    return (
      <div className="hy-card p-10 text-center">
        <p className="font-semibold">This specialist is not available.</p>
        <Link to="/dietitians" className="mt-3 inline-block text-sm font-semibold text-navy">
          Back to home
        </Link>
      </div>
    )
  }

  const carePath = `/care/${dietitian.id}`
  const isOwner = currentUser?.id === dietitian.userId
  const canReview = currentUser?.role === 'patient' && !isOwner
  const myReview = dietitian.reviews.find((item) => item.authorId === currentUser?.id)
  const unread = currentUser ? unreadCountFor(currentUser.id, conversations, messages) : 0
  const missed = currentUser ? unseenMissedCalls(currentUser.id, missedCalls) : []
  const incoming = isOwner
    ? consultationRequests.filter((item) => item.dietitianId === dietitian.id && item.status === 'pending')
    : []
  const showHomeQueue = isOwner && (practiceBase(location.pathname) !== '/admin' && (location.pathname === practicePath() || location.pathname === '/dietitian' || location.pathname === '/enterprise' || incoming.length > 0))
  const profileNotLive =
    isOwner &&
    (dietitian.status !== 'approved' || dietitian.id.startsWith('draft-') || !dietitian.verified)
  const credentialDocs = dietitian.documents.filter((doc) =>
    dietitian.status === 'approved' && !dietitian.id.startsWith('draft-')
      ? Boolean(doc.url || doc.fileName)
      : Boolean(doc.url),
  )

  return (
    <div className="space-y-5">
      {showHomeQueue && incoming.length > 0 && (
        <section className="hy-card p-5">
          <h2 className="font-bold text-ink">Incoming consultation requests</h2>
          <div className="mt-3 space-y-3">
            {incoming.map((request) => {
              const patient = users.find((item) => item.id === request.patientId)
              return (
                <article key={request.id} className="flex flex-col gap-3 rounded-2xl bg-panel p-4 sm:flex-row sm:items-center">
                  <Avatar
                    src={patient?.avatar}
                    name={patient?.name ?? 'Patient'}
                    size={48}
                    to={patient ? patientChartPath(patient.id, currentUser?.role ?? 'dietitian') : undefined}
                  />
                  <div className="flex-1">
                    {patient ? (
                      <Link to={patientChartPath(patient.id, currentUser?.role ?? 'dietitian')} className="font-semibold text-ink hover:text-navy">
                        {patient.name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-ink">Patient</p>
                    )}
                    <p className="text-sm text-muted">{request.note}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respondConsultation(request.id, 'accepted')}>
                      Accept
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => respondConsultation(request.id, 'declined')}>
                      Decline
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
      <DietitianHero
        dietitian={dietitian}
        editable={isOwner}
        onChangeCover={
          isOwner ? (coverImage) => saveAccount({ coverImage }, 'Cover photo updated.') : undefined
        }
        onChangeAvatar={
          isOwner
            ? (avatar) => {
                saveAccount({ avatar }, 'Profile photo updated.')
                try {
                  const raw = window.localStorage.getItem('user_data')
                  if (raw) {
                    const parsed = JSON.parse(raw) as Record<string, unknown>
                    parsed.photoURL = avatar
                    parsed.avatar = avatar
                    window.localStorage.setItem('user_data', JSON.stringify(parsed))
                  }
                } catch {
                  /* ignore */
                }
              }
            : undefined
        }
        actions={
          currentUser?.role === 'patient' && !isOwner ? (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
              <Button onClick={() => navigate(`${carePath}?tab=book`)}>
                <CalendarDays size={16} /> Book & consult
              </Button>
              <Button variant="outline" onClick={() => navigate(`${carePath}?tab=chat`)}>
                <MessageSquare size={16} /> Chat
              </Button>
              <Button variant="secondary" onClick={() => navigate(`${carePath}?tab=call`)}>
                <Video size={16} /> Video call
              </Button>
            </div>
          ) : isOwner ? (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
              <Button variant="outline" onClick={() => navigate(practicePath('messages'))}>
                <MessageSquare size={16} /> Inbox
                {unread > 0 ? <CountBadge count={unread} /> : null}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setCallsOpen(true)
                  markMissedCallsSeen()
                }}
              >
                <PhoneMissed size={16} /> Missed calls
                {missed.length > 0 ? <CountBadge count={missed.length} /> : null}
              </Button>
            </div>
          ) : undefined
        }
      />

      {profileNotLive ? (
        <section className="hy-card px-5 py-6 text-center sm:px-8">
          <p className="font-bold text-ink">
            Your public profile isn’t live yet, patients can&apos;t see you on the dietitian marketplace.
          </p>
          <p className="mt-2 text-sm text-muted">Register as a specialist so patients can find you.</p>
          <Link to={practicePath('apply')} className="mt-5 inline-flex justify-center">
            <Button className="animate-register-pulse shadow-elevated">Register</Button>
          </Link>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="hy-card p-5 sm:p-6">
          <div className="flex flex-wrap gap-2 border-b border-line pb-3">
            {tabs.map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  tab === item ? 'bg-navy text-white' : 'bg-panel text-muted'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="pt-5 text-sm leading-relaxed text-muted">
            {tab === 'About' && (
              <AboutPanel dietitian={dietitian} isOwner={isOwner} />
            )}
            {tab === 'Experience' && (
              <ExperiencePanel
                dietitian={dietitian}
                isOwner={isOwner}
                onSaveExperience={
                  isOwner && !dietitian.id.startsWith('draft-')
                    ? (experience) => updateDietitianProfile(dietitian.id, experience)
                    : undefined
                }
              />
            )}
            {tab === 'Reviews' && (
              <ReviewsPanel
                dietitian={dietitian}
                canReview={canReview}
                myReview={myReview}
                isOwner={isOwner}
                onWrite={() => setReviewOpen(true)}
                onDelete={() => setDeleteOpen(true)}
              />
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="hy-card p-5">
            <h2 className="font-bold text-ink">Verified credentials</h2>
            <p className="mt-1 text-xs text-muted">Checked by MealLensAI before this profile went live.</p>
            {credentialDocs.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                {isOwner ? 'No documents uploaded yet. Register and upload your credentials to show them here.' : 'No documents available.'}
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {credentialDocs.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => setViewingDoc(doc)}
                      className="flex w-full items-center justify-between rounded-xl bg-panel px-3 py-3 text-left text-sm font-medium hover:bg-navy-soft"
                    >
                      <span>{doc.name}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy">
                        <FileSearch size={14} /> View
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {currentUser?.role === 'patient' && !isOwner && (
            <button
              onClick={() => navigate(`${carePath}?tab=book`)}
              className="w-full rounded-lg bg-navy p-5 text-left text-white shadow-card"
            >
              <p className="text-sm font-bold">Start care</p>
              <p className="mt-1 text-xs text-white/80">Book a slot, chat, or jump on a video call.</p>
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => navigate(practicePath('appointments'))}
              className="w-full rounded-lg bg-navy p-5 text-left text-white shadow-card"
            >
              <p className="text-sm font-bold">Upcoming appointments</p>
              <p className="mt-1 text-xs text-white/80">Open your calendar and join the next consult.</p>
            </button>
          )}
        </aside>
      </div>

      <Modal
        open={Boolean(viewingDoc)}
        title={viewingDoc?.name ?? 'Credential'}
        onClose={() => setViewingDoc(null)}
        wide
      >
        {viewingDoc ? <CredentialPreview dietitian={dietitian} document={viewingDoc} /> : null}
      </Modal>

      <Modal
        open={reviewOpen}
        title={myReview ? 'Edit Review' : 'Write a Review'}
        onClose={() => setReviewOpen(false)}
      >
        <ReviewComposer
          key={`${dietitian.id}-${myReview?.id ?? 'new'}-${reviewOpen}`}
          specialistName={dietitian.name}
          initialRating={myReview?.rating ?? 0}
          initialText={myReview?.text ?? ''}
          onCancel={() => setReviewOpen(false)}
          onSubmit={(rating, text) => {
            addReview(dietitian.id, rating, text)
            setReviewOpen(false)
          }}
        />
      </Modal>

      <Modal open={deleteOpen} title="Delete review" onClose={() => setDeleteOpen(false)}>
        <p className="text-sm text-muted">This removes your public review from {dietitian.name}’s profile.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Keep review
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteReview(dietitian.id)
              setDeleteOpen(false)
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
      <Modal
        open={callsOpen}
        title="Missed calls"
        onClose={() => setCallsOpen(false)}
      >
        {missedCalls.filter((item) => item.userId === currentUser?.id).length === 0 ? (
          <p className="text-sm text-muted">No missed calls. New ones will show here with a count on your profile.</p>
        ) : (
          <ul className="space-y-3">
            {missedCalls
              .filter((item) => item.userId === currentUser?.id)
              .map((call) => (
                <li key={call.id} className="flex items-center justify-between gap-3 rounded-2xl bg-panel p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      src={users.find((item) => item.id === call.peerId)?.avatar}
                      name={call.peerName}
                      size={40}
                      to={patientChartPath(call.peerId, currentUser?.role ?? 'dietitian')}
                    />
                    <div>
                      <p className="font-semibold text-ink">{call.peerName}</p>
                      <p className="text-xs text-muted">
                        {formatDate(call.createdAt)} · {formatTime(call.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const conversationId = `conv-${[call.peerId, currentUser?.id].sort().join('-')}`
                      navigate(practicePath(`messages/${conversationId}`))
                    }}
                  >
                    Open chat
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}

function EmptyEditPrompt({
  message,
  to,
  label = 'Edit',
}: {
  message: string
  to: string
  label?: string
}) {
  return (
    <div className="rounded-2xl bg-panel px-4 py-6 text-center">
      <p className="text-sm text-muted">{message}</p>
      <Link to={to} className="mt-4 inline-flex">
        <Button size="sm" variant="outline">
          <Pencil size={14} /> {label}
        </Button>
      </Link>
    </div>
  )
}

function AboutPanel({ dietitian, isOwner }: { dietitian: Dietitian; isOwner: boolean }) {
  const bio = dietitian.bio?.trim()
  const workplace = dietitian.workplace?.trim()
  const country = dietitian.country?.trim()
  const location = [workplace, country].filter(Boolean).join(', ')
  const languages = dietitian.languages.filter((item) => item.trim())
  const hasAbout = Boolean(bio || location || languages.length)

  if (!hasAbout) {
    if (isOwner) {
      return (
        <EmptyEditPrompt
          message="Add your bio, workplace, and languages so patients know who you are."
          to={practicePath('profile')}
          label="Edit profile"
        />
      )
    }
    return <p>No about information yet.</p>
  }

  return (
    <div className="space-y-4">
      {bio ? <p className="text-base text-ink">{bio}</p> : null}
      {location ? (
        <p className="flex items-center gap-2">
          <MapPin size={16} className="text-navy" />
          {location}
        </p>
      ) : null}
      {languages.length > 0 ? (
        <div>
          <h3 className="mb-2 font-bold text-ink">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {languages.map((language) => (
              <Pill key={language} tone="slate">
                {language}
              </Pill>
            ))}
          </div>
        </div>
      ) : null}
      {isOwner ? (
        <Link to={practicePath('profile')} className="inline-flex">
          <Button size="sm" variant="outline">
            <Pencil size={14} /> Edit profile
          </Button>
        </Link>
      ) : null}
    </div>
  )
}

function ExperiencePanel({
  dietitian,
  isOwner,
  onSaveExperience,
}: {
  dietitian: Dietitian
  isOwner: boolean
  onSaveExperience?: (experience: ExperienceItem[]) => void
}) {
  const experience = dietitian.experience.filter((item) => item.role?.trim() && item.org?.trim())
  const education = dietitian.education.filter((item) => item.school?.trim() && item.degree?.trim())
  const hasExperience = experience.length > 0
  const hasEducation = education.length > 0

  if (!hasExperience && !hasEducation) {
    if (isOwner) {
      return (
        <EmptyEditPrompt
          message="Add your work history and education so they show on your public profile."
          to={practicePath('apply')}
          label="Edit registration"
        />
      )
    }
    return <p>No experience listed yet.</p>
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 font-bold text-ink">Professional experience</h3>
        {hasExperience ? (
          <ul className="space-y-3">
            {experience.map((item, index) => (
              <li key={`${item.org}-${index}`} className="rounded-2xl bg-panel p-3">
                <span className="font-semibold text-ink">{item.role}</span>
                <span className="block text-sm">{item.org}</span>
                {item.years ? <span className="text-xs">{item.years}</span> : null}
              </li>
            ))}
          </ul>
        ) : isOwner ? (
          <EmptyEditPrompt
            message="No work history added yet."
            to={practicePath('apply')}
            label="Edit registration"
          />
        ) : (
          <p>No work history listed.</p>
        )}
        {onSaveExperience ? (
          <ExperienceEditor experience={experience} onSave={onSaveExperience} />
        ) : null}
      </div>
      <div>
        <h3 className="mb-2 font-bold text-ink">Education</h3>
        {hasEducation ? (
          <ul className="space-y-3">
            {education.map((item) => (
              <li key={`${item.school}-${item.degree}`} className="rounded-2xl bg-panel p-3">
                <span className="font-semibold text-ink">{item.degree}</span>
                <span className="block text-sm">
                  {item.school}
                  {item.year ? ` (${item.year})` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : isOwner ? (
          <EmptyEditPrompt
            message="No education added yet."
            to={practicePath('apply')}
            label="Edit registration"
          />
        ) : (
          <p>No education listed.</p>
        )}
      </div>
    </div>
  )
}

function ReviewsPanel({
  dietitian,
  canReview,
  myReview,
  isOwner,
  onWrite,
  onDelete,
}: {
  dietitian: Dietitian
  canReview: boolean
  myReview?: Review
  isOwner: boolean
  onWrite: () => void
  onDelete: () => void
}) {
  const otherReviews = dietitian.reviews.filter((item) => item.id !== myReview?.id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-ink">Ratings & Reviews</h3>
          {isOwner && (
            <p className="mt-1 text-xs text-muted">Patients can rate your care. You can read every review here.</p>
          )}
        </div>
        {canReview && (
          <Button size="sm" onClick={onWrite}>
            Write a Review
          </Button>
        )}
      </div>

      <RatingOverview reviews={dietitian.reviews} rating={dietitian.rating} count={dietitian.reviewCount} />

      {myReview && (
        <ReviewCard review={myReview} mine canReview={canReview} onEdit={onWrite} onDelete={onDelete} />
      )}

      {otherReviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}

      {dietitian.reviews.length === 0 && (
        <p>{isOwner ? 'No patients have left a review yet.' : 'No public reviews yet.'}</p>
      )}
    </div>
  )
}

function RatingOverview({
  reviews,
  rating,
  count,
}: {
  reviews: Review[]
  rating: number
  count: number
}) {
  const buckets = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0]
    reviews.forEach((review) => {
      totals[review.rating] += 1
    })
    return totals
  }, [reviews])
  const max = Math.max(...buckets, 1)

  return (
    <div className="flex gap-6 rounded-2xl bg-panel p-4">
      <div className="shrink-0 text-center">
        <p className="text-4xl font-extrabold leading-none text-ink">{rating.toFixed(1)}</p>
        <div className="mt-2 flex justify-center">
          <Stars value={rating} />
        </div>
        <p className="mt-1 text-xs text-muted">
          {count} rating{count === 1 ? '' : 's'}
        </p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        {[5, 4, 3, 2, 1].map((star) => (
          <div key={star} className="flex items-center gap-2">
            <span className="w-3 text-right text-[11px] font-semibold text-muted">{star}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-navy"
                style={{ width: `${(buckets[star] / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewCard({
  review,
  mine,
  canReview,
  onEdit,
  onDelete,
}: {
  review: Review
  mine?: boolean
  canReview?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <article className="rounded-2xl bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {review.author}
            {mine ? <span className="ml-2 text-xs font-medium text-navy">Your review</span> : null}
          </p>
          <p className="text-xs text-muted">{formatDate(review.date)}</p>
        </div>
        <Stars value={review.rating} />
      </div>
      <p className="mt-2 text-ink">{review.text}</p>
      {mine && canReview && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil size={14} /> Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      )}
    </article>
  )
}

function ReviewComposer({
  specialistName,
  initialRating,
  initialText,
  onSubmit,
  onCancel,
}: {
  specialistName: string
  initialRating: number
  initialText: string
  onSubmit: (rating: number, text: string) => void
  onCancel: () => void
}) {
  const [rating, setRating] = useState(initialRating)
  const [text, setText] = useState(initialText)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const comment = text.trim()
        if (rating < 1 || !comment) return
        onSubmit(rating, comment)
      }}
    >
      <p className="text-sm text-muted">Tap a star to rate {specialistName}.</p>
      <div className="mt-4 flex flex-col items-center gap-2 py-2">
        <Stars value={rating} size={32} onSelect={setRating} />
        <p className="text-sm font-semibold text-ink">{rating ? ratingLabels[rating] : ' '}</p>
      </div>
      <AreaField
        label="Review"
        rows={5}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="What stood out about the care you received?"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={rating < 1 || !text.trim()}>
          Submit
        </Button>
      </div>
    </form>
  )
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-navy px-1.5 text-[10px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function ExperienceEditor({
  experience,
  onSave,
}: {
  experience: ExperienceItem[]
  onSave: (experience: ExperienceItem[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ExperienceItem>({ role: '', org: '', years: '' })

  return (
    <div className="mt-3">
      {open ? (
        <div className="rounded-2xl border border-line bg-cream/40 p-3">
          <p className="mb-2 text-sm font-bold text-ink">Add a role</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className="hy-label">Role</span>
              <input className="hy-input" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} />
            </label>
            <label>
              <span className="hy-label">Organisation</span>
              <input className="hy-input" value={draft.org} onChange={(event) => setDraft({ ...draft, org: event.target.value })} />
            </label>
            <label>
              <span className="hy-label">Years</span>
              <input
                className="hy-input"
                placeholder="2018 — Present"
                value={draft.years}
                onChange={(event) => setDraft({ ...draft, years: event.target.value })}
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!draft.role.trim() || !draft.org.trim()}
              onClick={() => {
                onSave([...experience, draft])
                setDraft({ role: '', org: '', years: '' })
                setOpen(false)
              }}
            >
              Save role
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add another role
        </Button>
      )}
    </div>
  )
}
