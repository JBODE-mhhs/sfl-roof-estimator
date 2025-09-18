import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create admin user
  const hashedPassword = await bcryptjs.hash(process.env.ADMIN_PASSWORD || 'admin123', 12)

  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@sflroof.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@sflroof.com',
      name: 'SFL Admin',
      role: 'ADMIN',
      hashedPassword
    }
  })
  console.log('✅ Admin user created:', adminUser.email)

  // Create waste rules
  const wasteRules = await prisma.wasteRules.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      basePercent: 12,
      maxPercent: 22,
      addersJson: {
        facets: [
          { min: 0, max: 6, add: 0 },
          { min: 7, max: 12, add: 2 },
          { min: 13, max: 20, add: 4 },
          { min: 21, max: 999, add: 6 }
        ],
        hipsValleys: [
          { min: 0, max: 2, add: 0 },
          { min: 3, max: 5, add: 1 },
          { min: 6, max: 10, add: 3 },
          { min: 11, max: 999, add: 5 }
        ],
        penetrations: [
          { min: 0, max: 3, add: 0 },
          { min: 4, max: 8, add: 1 },
          { min: 9, max: 15, add: 2 },
          { min: 16, max: 999, add: 4 }
        ]
      }
    }
  })
  console.log('✅ Waste rules created')

  // Create financing plans
  const financePlans = [
    {
      name: 'Standard Financing',
      aprMin: 7.99,
      aprMax: 15.99,
      termMinMonths: 84,
      termMaxMonths: 180,
      dealerFeePercent: null,
      amountMinCents: 500000, // $5,000
      amountMaxCents: 10000000, // $100,000
      active: true
    },
    {
      name: 'Premium Financing',
      aprMin: 5.99,
      aprMax: 12.99,
      termMinMonths: 120,
      termMaxMonths: 240,
      dealerFeePercent: 2.5,
      amountMinCents: 1000000, // $10,000
      amountMaxCents: 15000000, // $150,000
      active: true
    }
  ]

  for (const plan of financePlans) {
    // Model does not have a unique constraint on name, so we can't use upsert by name.
    // Ensure idempotency by checking for an existing plan with the same name first.
    const existingPlan = await prisma.financePlan.findFirst({ where: { name: plan.name } })
    if (existingPlan) {
      // Nothing to update right now; keep seed idempotent without mutating existing data
      continue
    } else {
      await prisma.financePlan.create({ data: plan })
    }
  }
  console.log('✅ Finance plans created')

  // Create pricing matrices for South Florida counties
  const counties = ['Miami-Dade', 'Broward', 'Palm Beach', 'DEFAULT']
  const systemTypes = ['SHINGLE', 'METAL', 'FLAT_TPO', 'FLAT_MODBIT', 'FLAT_BUR']
  const pitchTiers = [null, 'LOW', 'MEDIUM', 'STEEP'] // null for flat roofs
  const storyTiers = [1, 2, 3]
  const tearOffLayers = [0, 1, 2]
  const hvhzOptions = [false, true]

  // Base prices per square in cents (per 100 sq ft)
  const basePrices = {
    SHINGLE: { base: 45000, hvhzMultiplier: 1.15 }, // $450/sq
    METAL: { base: 85000, hvhzMultiplier: 1.20 }, // $850/sq
    FLAT_TPO: { base: 75000, hvhzMultiplier: 1.10 }, // $750/sq
    FLAT_MODBIT: { base: 65000, hvhzMultiplier: 1.10 }, // $650/sq
    FLAT_BUR: { base: 70000, hvhzMultiplier: 1.10 } // $700/sq
  }

  // County multipliers
  const countyMultipliers = {
    'Miami-Dade': 1.15,
    'Broward': 1.10,
    'Palm Beach': 1.05,
    'DEFAULT': 1.00
  }

  console.log('🏗️ Creating pricing matrices...')

  for (const county of counties) {
    for (const systemType of systemTypes) {
      const isFlat = systemType.startsWith('FLAT_')
      const relevantPitchTiers = isFlat ? [null] : ['LOW', 'MEDIUM', 'STEEP']

      for (const pitchTier of relevantPitchTiers) {
        for (const storyTier of storyTiers) {
          for (const tearOff of tearOffLayers) {
            for (const hvhz of hvhzOptions) {
              // Skip HVHZ false for Miami-Dade and Broward (they are HVHZ areas)
              if ((county === 'Miami-Dade' || county === 'Broward') && !hvhz) {
                continue
              }

              const basePrice = basePrices[systemType as keyof typeof basePrices]
              const countyMultiplier = countyMultipliers[county as keyof typeof countyMultipliers]
              const hvhzMultiplier = hvhz ? basePrice.hvhzMultiplier : 1.0

              let pricePerSquare = Math.round(
                basePrice.base * countyMultiplier * hvhzMultiplier
              )

              const multipliers = {
                pitch: {
                  LOW: 1.0,
                  MEDIUM: 1.05,
                  STEEP: 1.15
                },
                story: 1.08, // 8% per additional story
                tearOff: 0.12, // 12% per layer
                hvhz: hvhz ? 1.0 : 1.0 // Already factored into base price
              }

              const fixedAdders = {
                permit: Math.round(pricePerSquare * 0.02), // 2% of job
                disposal: Math.round(tearOff * 15000 + 25000), // $250 + $150/layer
                cleanup: 15000 // $150
              }

              const existingPricing = await prisma.pricingMatrix.findFirst({
                where: {
                  county,
                  systemType: systemType as any,
                  pitchTier: pitchTier as any,
                  storyTier,
                  tearOffLayers: tearOff,
                  hvhz
                }
              })

              if (!existingPricing) {
                await prisma.pricingMatrix.create({
                  data: {
                    county,
                    systemType: systemType as any,
                    pitchTier: pitchTier as any,
                    storyTier,
                    tearOffLayers: tearOff,
                    hvhz,
                    pricePerSquareCents: pricePerSquare,
                    multipliers,
                    fixedAdders
                  }
                })
              }
            }
          }
        }
      }
    }
  }
  console.log('✅ Pricing matrices created')

  // Create app settings
  const appSettings = await prisma.appSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      brandName: 'SFL Roof Estimator',
      primaryColor: '#3b82f6',
      supportPhone: '(305) 555-0123',
      supportEmail: 'support@sflroof.com',
      serviceCounties: ['Miami-Dade', 'Broward', 'Palm Beach'],
      disclaimerText: 'Estimates are based on remote measurements and admin-configured pricing. On-site inspection may adjust final scope and pricing. Flat sections remain flat - no full-metal conversion options displayed.',
      ctaButtonText: 'Get Free Inspection',
      enableDetached: true,
      maxQuotesPerHour: 10
    }
  })
  console.log('✅ App settings created')

  console.log('🎉 Database seeded successfully!')
  console.log('\n📊 Summary:')
  console.log(`- Admin user: ${adminUser.email}`)
  console.log(`- Waste rules: Created`)
  console.log(`- Finance plans: ${financePlans.length} plans`)
  console.log(`- Pricing matrices: ${counties.length * systemTypes.length * 3 * 3 * 3} entries`)
  console.log(`- App settings: Configured for South Florida`)

  // Count total pricing matrix entries
  const totalEntries = await prisma.pricingMatrix.count()
  console.log(`- Total pricing entries created: ${totalEntries}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })