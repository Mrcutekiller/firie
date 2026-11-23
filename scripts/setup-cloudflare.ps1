# ==============================================================================
# Firie - Cloudflare Edge Automated Setup Script
# Sets up Cloudflare D1 SQLite Database and R2 Zero-Egress Storage
# ==============================================================================

Write-Host "⚡ Setting up Firie Cloudflare Backend Services..." -ForegroundColor Cyan

# 1. Login check
Write-Host "Checking Cloudflare Authentication..." -ForegroundColor Yellow
npx wrangler whoami

# 2. Create Cloudflare D1 Database
Write-Host "`n[1/3] Creating Cloudflare D1 Database: firie-db..." -ForegroundColor Yellow
npx wrangler d1 create firie-db

# 3. Apply SQL Schema
Write-Host "`n[2/3] Applying D1 Database Schema from schema.sql..." -ForegroundColor Yellow
npx wrangler d1 execute firie-db --remote --file=./schema.sql

# 4. Create Cloudflare R2 Object Storage Bucket
Write-Host "`n[3/3] Creating Cloudflare R2 Storage Bucket: firie-photos..." -ForegroundColor Yellow
npx wrangler r2 bucket create firie-photos

Write-Host "`n✅ Cloudflare backend resources successfully provisioned!" -ForegroundColor Green
Write-Host "Next steps: Copy your D1 database_id from step [1/3] into wrangler.jsonc under d1_databases, then run: npx wrangler deploy" -ForegroundColor Cyan
