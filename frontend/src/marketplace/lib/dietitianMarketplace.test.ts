import { describe, expect, it } from 'vitest'
import { DIETITIANS } from '../data/mock'
import { isDietitianMarketplaceApproved } from './dietitianMarketplace'

describe('dietitianMarketplace', () => {
  it('treats approved listings as marketplace-open', () => {
    expect(isDietitianMarketplaceApproved(DIETITIANS, 'user-emily')).toBe(true)
  })

  it('keeps pending applicants locked out of marketplace tools', () => {
    expect(isDietitianMarketplaceApproved(DIETITIANS, 'user-marcus')).toBe(false)
  })
})
