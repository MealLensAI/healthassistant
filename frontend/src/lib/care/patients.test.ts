import { describe, expect, it } from 'vitest'
import { filesVisibleToViewer } from '@/lib/care/patients'
import type { PatientFile } from '@/lib/care/types'

const files: PatientFile[] = [
  {
    id: 'file-1',
    ownerId: 'user-sarah',
    name: 'labs.pdf',
    category: 'labs',
    size: '12 KB',
    uploadedAt: '2026-09-01T00:00:00.000Z',
  },
]

describe('filesVisibleToViewer', () => {
  it('hides patient files from a blocked dietitian', () => {
    const visible = filesVisibleToViewer({
      files,
      patientId: 'user-sarah',
      viewerId: 'viewer-dietitian',
      viewerRole: 'dietitian',
      blockedIds: ['viewer-dietitian'],
    })
    expect(visible).toEqual([])
  })

  it('shows files to the patient and to a dietitian who is not blocked', () => {
    expect(
      filesVisibleToViewer({
        files,
        patientId: 'user-sarah',
        viewerId: 'user-sarah',
        viewerRole: 'patient',
      }),
    ).toHaveLength(1)
    expect(
      filesVisibleToViewer({
        files,
        patientId: 'user-sarah',
        viewerId: 'viewer-dietitian',
        viewerRole: 'dietitian',
        blockedIds: [],
      }),
    ).toHaveLength(1)
  })
})
