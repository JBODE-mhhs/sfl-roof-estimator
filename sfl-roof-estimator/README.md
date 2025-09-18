# SFL Roof Estimator

A production-ready web application that provides instant roofing quotes for South Florida, featuring AI-powered roof measurements and a comprehensive admin backend.

## 🏠 Overview

The SFL Roof Estimator allows homeowners in Miami-Dade, Broward, and Palm Beach counties to get instant, accurate roofing estimates using advanced computer vision and AI measurement technology. The system correctly handles mixed roof types (sloped shingle sections with separate flat sections) and enforces South Florida business rules.

### Key Features

- **Instant AI Measurements**: Satellite imagery analysis with roof section detection
- **Mixed Roof Support**: Properly handles both sloped and flat sections independently
- **South Florida Focused**: HVHZ compliance, county-specific pricing, local regulations
- **No Full-Metal Conversion**: Enforces business rule that flat sections remain flat
- **Comprehensive Admin**: Full backend for pricing, waste rules, financing management
- **Type-Safe**: End-to-end TypeScript with strict validation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google Maps API keys (Places, Geocoding, Maps JavaScript)

### Installation

1. **Clone and setup**:
```bash
git clone <repository>
cd sfl-roof-estimator
npm install
```

2. **Environment setup**:
```bash
cp .env.example .env
# Edit .env with your values
```

3. **Database setup**:
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

4. **Development server**:
```bash
npm run dev
```

Visit http://localhost:3000

## 📋 Environment Variables

Create `.env` file with these required variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/sfl_roof_estimator"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google Maps API Keys
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-frontend-restricted-key"
GOOGLE_GEOCODE_API_KEY="your-server-restricted-key"

# App Settings
PUBLIC_SERVICE_COUNTIES="Miami-Dade,Broward,Palm Beach"
NEXT_PUBLIC_APP_NAME="SFL Roof Estimator"
NEXT_PUBLIC_SUPPORT_PHONE="(305) 555-0123"

# Admin Settings
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-this-password"
```

### Google Maps API Setup

1. **Create Google Cloud Project**
2. **Enable APIs**: Places API, Geocoding API, Maps JavaScript API
3. **Create API Keys**:
   - Frontend key: Restrict to HTTP referrers (your domain)
   - Backend key: Restrict to IP addresses (your server)

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, React
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Next.js Route Handlers, tRPC-style API
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js with role-based access control
- **Maps**: Google Maps JavaScript API + Places
- **Validation**: Zod schemas throughout

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API route handlers
│   ├── admin/             # Admin dashboard (protected)
│   └── estimate/[id]/     # Quote results page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature components
└── lib/                  # Core business logic
    ├── calculations/     # Pitch, waste, pricing, finance
    ├── measurement/      # Pluggable measurement service
    └── ...              # Utilities, validation, DB
```

## 🔧 Core Business Logic

### Measurement Service

Pluggable adapter pattern supporting:

- **Third-party APIs**: Integrate with professional measurement services
- **Heuristic fallback**: Google Maps + building footprint analysis
- **Manual override**: Admin can input measurements directly

```typescript
interface MeasurementAdapter {
  measure(input: MeasurementInput): Promise<MeasurementResult>;
  getName(): string;
  isAvailable(): Promise<boolean>;
}
```

### South Florida Rules

The application enforces these critical business rules:

1. **Mixed Roof Handling**: Homes can have both sloped shingle sections AND separate flat sections
2. **No Cross-Conversion**: Flat sections cannot be converted to full metal roofs
3. **Independent Pricing**: Sloped and flat sections are measured and priced separately
4. **HVHZ Compliance**: Miami-Dade and Broward counties have HVHZ multipliers
5. **County-Specific Pricing**: Different rates for Miami-Dade, Broward, Palm Beach

### Calculation Pipeline

1. **Measurement**: AI detects roof sections (sloped vs flat)
2. **Pitch Calculation**: For sloped sections: `area * √(1 + (rise/12)²)`
3. **Waste Calculation**: Server-side only, based on complexity factors
4. **Pricing**: County + system type + multipliers + fixed costs
5. **Financing**: Multiple plans with payment ranges

## 🛡️ Security Features

- **Rate limiting**: IP-based limits on public APIs
- **RBAC**: Role-based admin access (ADMIN, SALES, VIEWER)
- **Data isolation**: Waste percentages never sent to client
- **Input validation**: Zod schemas on all endpoints
- **CORS protection**: Configured for production domains
- **API key restrictions**: Google Maps keys properly scoped

## 📊 Database Schema

Key entities:

- **Quote**: Customer request with address and total pricing
- **RoofSection**: Individual roof sections with measurements
- **PricingMatrix**: County/system/story/HVHZ pricing rules
- **WasteRules**: Complexity-based waste percentage calculations
- **FinancePlan**: Available financing options

See `prisma/schema.prisma` for complete schema.

## 🔄 Public API Flow

1. `POST /api/geo/resolve-address` - Geocode and validate address
2. `POST /api/quote/create` - Create new quote record
3. `POST /api/measure/run` - Run AI measurement analysis
4. `PATCH /api/quote/update-selections` - Update material selections
5. `POST /api/quote/price` - Calculate final pricing
6. `POST /api/lead/submit` - Submit customer contact info

## 👨‍💼 Admin Features

Access `/admin` (requires ADMIN role):

- **Pricing Matrix**: Manage county/system/story pricing
- **Waste Rules**: Configure complexity-based waste percentages
- **Finance Plans**: Set up financing options and rates
- **Quotes Browser**: View and manage all customer quotes
- **Settings**: Brand, service areas, disclaimers

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🚀 Deployment

### Vercel + Neon (Recommended)

1. **Database**: Create Neon PostgreSQL database
2. **Deploy**: Connect GitHub repo to Vercel
3. **Environment**: Set all environment variables in Vercel
4. **Seed**: Run `npm run db:seed` via Vercel CLI

### Docker Deployment

```bash
# Build image
docker build -t sfl-roof-estimator .

# Run with database
docker run -p 3000:3000 --env-file .env sfl-roof-estimator
```

### Environment-Specific Notes

- **Production**: Use IP restrictions on Google API keys
- **Staging**: Separate database and API keys
- **Development**: Localhost restrictions OK for API keys

## 🔍 Monitoring & Analytics

### Performance Monitoring

- Next.js built-in analytics
- Database query performance via Prisma
- API response times and error rates
- Google Maps API usage tracking

### Business Metrics

- Quotes generated per day/county
- Conversion rates (quote → lead)
- Average quote values by system type
- Financing option selection rates

## 🛠️ Maintenance

### Regular Tasks

- Monitor Google Maps API usage and costs
- Review and update pricing matrices quarterly
- Update waste rules based on field data
- Backup database regularly
- Review security logs and rate limiting

### Scaling Considerations

- Add Redis for rate limiting and caching
- Implement proper logging (Winston, Datadog)
- Add automated testing in CI/CD
- Consider CDN for static assets
- Monitor database performance and indexing

## 📚 Additional Documentation

- [API Documentation](./docs/API.md)
- [Admin Guide](./docs/ADMIN.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Security Guide](./docs/SECURITY.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm run test && npm run type-check`
4. Submit pull request

## 📄 License

Proprietary - All rights reserved

---

## Support

- 📧 Email: support@sflroof.com
- 📞 Phone: (305) 555-0123
- 🐛 Issues: GitHub Issues tab
- 📖 Docs: See `/docs` folder