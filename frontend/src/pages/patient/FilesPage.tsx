import { Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePreview } from '@/components/files/FilePreview'
import { Modal, Pill } from '@/components/care-ui/Primitives'
import { useApp } from '@/lib/care/context'
import { fileCategoryFromName, readLocalFile } from '@/lib/care/files'
import { carePatientIds, filesVisibleToViewer } from '@/lib/care/patients'
import { formatDate } from '@/lib/care/utils'
import type { PatientFile } from '@/lib/care/types'

export function FilesPage({ role = 'patient' }: { role?: 'patient' | 'dietitian' }) {
  const {
    files,
    currentUser,
    users,
    dietitians,
    appointments,
    conversations,
    consultationRequests,
    patientSettings,
    uploadFile,
  } = useApp()
  const [viewing, setViewing] = useState<PatientFile | null>(null)

  const visible = useMemo(() => {
    if (!currentUser) return []
    if (role === 'patient') {
      return files.filter((file) => file.ownerId === currentUser.id)
    }
    const ids = carePatientIds({
      currentUserId: currentUser.id,
      dietitians,
      appointments,
      conversations,
      consultationPatientIds: consultationRequests
        .filter((item) => dietitians.find((dietitian) => dietitian.id === item.dietitianId)?.userId === currentUser.id)
        .map((item) => item.patientId),
    })
    return files.filter((file) => {
      if (!ids.has(file.ownerId)) return false
      const blocked = patientSettings.find((item) => item.userId === file.ownerId)?.blockedFileAccessIds
      return (
        filesVisibleToViewer({
          files,
          patientId: file.ownerId,
          viewerId: currentUser.id,
          viewerRole: currentUser.role,
          blockedIds: blocked,
        }).some((item) => item.id === file.id)
      )
    })
  }, [appointments, consultationRequests, conversations, currentUser, dietitians, files, patientSettings, role])

  if (!currentUser) return null

  const viewingOwner = viewing ? users.find((item) => item.id === viewing.ownerId) : undefined

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">{role === 'dietitian' ? 'Patient files' : 'My Files'}</h1>
          <p className="text-sm text-muted">
            {role === 'dietitian'
              ? 'Every lab, diary, and photo your patients have uploaded. Open a file or jump to their chart.'
              : 'Labs, food diaries, and photos your dietitian can review in real time.'}
          </p>
        </div>
        {role === 'patient' && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white">
            <Upload size={16} /> Upload file
            <input
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                void readLocalFile(file).then((read) => {
                  uploadFile({
                    name: read.name,
                    category: fileCategoryFromName(read.name, read.type),
                    size: read.size,
                    url: read.url,
                  })
                })
                event.target.value = ''
              }}
            />
          </label>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-panel text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">File</th>
              {role === 'dietitian' && <th className="px-4 py-3">Patient</th>}
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Uploaded</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((file) => {
              const owner = users.find((item) => item.id === file.ownerId)
              return (
                <tr key={file.id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">{file.name}</td>
                  {role === 'dietitian' && (
                    <td className="px-4 py-3">
                      {owner ? (
                        <Link to={`/dietitian/patients/${owner.id}`} className="font-semibold text-navy hover:underline">
                          {owner.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Pill>{file.category}</Pill>
                  </td>
                  <td className="px-4 py-3 text-muted">{file.size}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(file.uploadedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-xs font-semibold text-navy hover:underline"
                      onClick={() => setViewing(file)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-8 text-center text-sm text-muted">No files uploaded yet.</p>}
      </div>
      <Modal open={Boolean(viewing)} title={viewing?.name ?? 'File'} onClose={() => setViewing(null)} wide>
        {viewing ? <FilePreview file={viewing} patientName={viewingOwner?.name} /> : null}
      </Modal>
    </div>
  )
}
