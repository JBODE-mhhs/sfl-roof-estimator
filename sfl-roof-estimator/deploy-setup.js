#!/usr/bin/env node

/**
 * SFL Roof Estimator - Deployment Setup Script
 * This script helps set up the database and verify the deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 SFL Roof Estimator - Deployment Setup');
console.log('==========================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the sfl-roof-estimator directory');
  process.exit(1);
}

// Check environment variables
console.log('📋 Checking environment variables...');
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'GOOGLE_GEOCODE_API_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease set these in your Vercel environment variables.');
  process.exit(1);
}

console.log('✅ All required environment variables are set\n');

// Test database connection
console.log('🗄️ Testing database connection...');
try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'pipe' });
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed:');
  console.error(error.message);
  process.exit(1);
}

// Run database seed
console.log('\n🌱 Seeding database...');
try {
  execSync('npm run db:seed', { stdio: 'inherit' });
  console.log('✅ Database seeded successfully');
} catch (error) {
  console.error('❌ Database seeding failed:');
  console.error(error.message);
  process.exit(1);
}

// Build the application
console.log('\n🔨 Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Application built successfully');
} catch (error) {
  console.error('❌ Build failed:');
  console.error(error.message);
  process.exit(1);
}

console.log('\n🎉 Deployment setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Push your changes to GitHub');
console.log('2. Vercel will automatically deploy');
console.log('3. Test your application at: https://sfl-roof-estimator-1v5a8r2t0-jbode-mhhs-projects.vercel.app');
console.log('4. Admin dashboard: https://sfl-roof-estimator-1v5a8r2t0-jbode-mhhs-projects.vercel.app/admin');
console.log('\n🔧 Environment Variables to Update in Vercel:');
console.log('   NEXTAUTH_URL: https://sfl-roof-estimator-1v5a8r2t0-jbode-mhhs-projects.vercel.app');
console.log('   ADMIN_EMAIL: your-actual-admin-email@yourcompany.com');
console.log('   ADMIN_PASSWORD: your-secure-password-here');
