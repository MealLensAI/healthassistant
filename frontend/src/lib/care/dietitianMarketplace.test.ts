import { describe, expect, it } from 'vitest'
import { DIETITIANS } from '@/lib/care/data/mock'
import { isDietitianMarketplaceApproved } from '@/lib/care/dietitianMarketplace'

describe('dietitianMarketplace', () => {
  it('treats approved listings as marketplace-open', () => {
    expect(isDietitianMarketplaceApproved(DIETITIANS, 'user-emily')).toBe(true)
  })

  it('keeps pending applicants locked out of marketplace tools', () => {
    expect(isDietitianMarketplaceApproved(DIETITIANS, 'user-marcus')).toBe(false)
  })
})
