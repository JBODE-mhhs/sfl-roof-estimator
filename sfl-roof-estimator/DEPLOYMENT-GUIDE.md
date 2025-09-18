# 🚀 SFL Roof Estimator - Deployment Guide

This guide will help you deploy the SFL Roof Estimator application to production.

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon, Supabase, or self-hosted)
- Google Cloud Platform account for Maps API
- Vercel account (recommended) or other hosting platform

## 🔧 Environment Setup

### 1. Create Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="https://your-domain.vercel.app"

# Google Maps API Keys
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-frontend-restricted-key"
GOOGLE_GEOCODE_API_KEY="your-server-restricted-key"

# App Settings
PUBLIC_SERVICE_COUNTIES="Miami-Dade,Broward,Palm Beach"
NEXT_PUBLIC_APP_NAME="SFL Roof Estimator"
NEXT_PUBLIC_SUPPORT_PHONE="(305) 555-0123"

# Admin Settings
ADMIN_EMAIL="admin@yourcompany.com"
ADMIN_PASSWORD="secure-password-here"
```

### 2. Google Maps API Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Required APIs**
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Street View Static API

3. **Create API Keys**
   - **Frontend Key** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`):
     - Restrict to HTTP referrers
     - Add your domain: `https://your-domain.vercel.app/*`
   - **Backend Key** (`GOOGLE_GEOCODE_API_KEY`):
     - Restrict to IP addresses
     - Add your server IPs

4. **Set Billing**
   - Enable billing for the project
   - Set up usage alerts

## 🗄️ Database Setup

### Option 1: Neon (Recommended)

1. **Create Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Create a new project

2. **Get Connection String**
   - Copy the connection string
   - Update `DATABASE_URL` in your environment variables

3. **Run Migrations**
   ```bash
   npx prisma db push
   npm run db:seed
   ```

### Option 2: Supabase

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project

2. **Get Connection String**
   - Go to Settings > Database
   - Copy the connection string
   - Update `DATABASE_URL`

3. **Run Migrations**
   ```bash
   npx prisma db push
   npm run db:seed
   ```

### Option 3: Self-Hosted PostgreSQL

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib

   # macOS
   brew install postgresql
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE sfl_roof_estimator;
   CREATE USER sfl_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE sfl_roof_estimator TO sfl_user;
   ```

3. **Run Migrations**
   ```bash
   npx prisma db push
   npm run db:seed
   ```

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository

2. **Configure Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add all required environment variables

3. **Deploy**
   - Vercel will automatically deploy on every push to main
   - Your app will be available at `https://your-project.vercel.app`

### Option 2: Railway

1. **Connect Repository**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository

2. **Add PostgreSQL Database**
   - Add PostgreSQL service
   - Copy the connection string

3. **Configure Environment Variables**
   - Add all required environment variables

4. **Deploy**
   - Railway will automatically deploy

### Option 3: Docker

1. **Build Docker Image**
   ```bash
   docker build -t sfl-roof-estimator .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 --env-file .env.local sfl-roof-estimator
   ```

## 🔧 Post-Deployment Setup

### 1. Verify Database Connection

```bash
# Check if database is accessible
npx prisma studio
```

### 2. Test Google Maps Integration

1. Visit your deployed app
2. Try searching for an address
3. Check browser console for any API errors

### 3. Test Admin Dashboard

1. Visit `/admin`
2. Verify you can access the dashboard
3. Check if data is loading correctly

### 4. Test Quote Flow

1. Search for an address
2. Confirm the address on the map
3. Complete the analysis
4. Verify the estimate page loads

## 🛡️ Security Checklist

- [ ] Environment variables are properly set
- [ ] Google Maps API keys are restricted
- [ ] Database connection uses SSL
- [ ] Admin password is strong
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured

## 📊 Monitoring Setup

### 1. Vercel Analytics

- Enable Vercel Analytics in project settings
- Monitor performance and errors

### 2. Database Monitoring

- Set up database connection monitoring
- Monitor query performance

### 3. Google Maps Usage

- Monitor API usage in Google Cloud Console
- Set up billing alerts

## 🔄 Maintenance

### Regular Tasks

1. **Database Backups**
   - Set up automated daily backups
   - Test restore procedures

2. **Security Updates**
   - Keep dependencies updated
   - Monitor for security vulnerabilities

3. **Performance Monitoring**
   - Monitor response times
   - Check error rates

4. **API Usage**
   - Monitor Google Maps API usage
   - Check rate limiting effectiveness

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` format
   - Verify database is accessible
   - Check firewall settings

2. **Google Maps Not Loading**
   - Verify API keys are correct
   - Check domain restrictions
   - Verify billing is enabled

3. **Build Failures**
   - Check environment variables
   - Verify all dependencies are installed
   - Check for TypeScript errors

4. **Rate Limiting Issues**
   - Check rate limit configuration
   - Monitor IP-based limits
   - Adjust limits if needed

### Getting Help

- Check the application logs
- Review browser console errors
- Check Vercel function logs
- Contact support if needed

## 📈 Scaling Considerations

### Performance

- Enable Vercel Edge Functions
- Use CDN for static assets
- Implement caching strategies

### Database

- Consider read replicas for high traffic
- Implement connection pooling
- Monitor query performance

### API Limits

- Monitor Google Maps API usage
- Implement fallback strategies
- Consider multiple API keys

---

## 🎉 Success!

Your SFL Roof Estimator should now be deployed and running! 

**Next Steps:**
1. Test all functionality
2. Set up monitoring
3. Configure backups
4. Train your team on the admin dashboard

**Support:**
- 📧 Email: support@yourcompany.com
- 📞 Phone: (305) 555-0123
- 🐛 Issues: GitHub Issues
