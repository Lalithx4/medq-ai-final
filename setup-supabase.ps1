# Supabase Setup Script for Windows
# Run this after configuring your .env file

Write-Host "🚀 BioDocsAI - Supabase Setup Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-Not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "📝 Please create .env file from env-template.txt first" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor White
    Write-Host "1. Copy env-template.txt to .env" -ForegroundColor White
    Write-Host "2. Fill in your Supabase credentials" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    exit 1
}

Write-Host "✅ Found .env file" -ForegroundColor Green
Write-Host ""

# Check for required environment variables
Write-Host "🔍 Checking environment variables..." -ForegroundColor Yellow

$envContent = Get-Content .env -Raw
$requiredVars = @(
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "DATABASE_URL",
    "NEXTAUTH_SECRET"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if ($envContent -notmatch "$var=.+") {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "   - $var" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "📝 Please update your .env file with these values" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ All required environment variables found" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Generate Prisma Client
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
pnpm prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client generated" -ForegroundColor Green
Write-Host ""

# Push database schema
Write-Host "🗄️  Pushing database schema to Supabase..." -ForegroundColor Yellow
Write-Host "   This will create all tables including:" -ForegroundColor White
Write-Host "   - User, Account (authentication)" -ForegroundColor White
Write-Host "   - ChatConversation, ChatMessage (chat history)" -ForegroundColor White
Write-Host "   - Document, DeepResearchReport (research files)" -ForegroundColor White
Write-Host "   - Presentation, CustomTheme (presentations)" -ForegroundColor White
Write-Host ""

pnpm db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push database schema" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Check DATABASE_URL is correct" -ForegroundColor White
    Write-Host "2. Verify database password" -ForegroundColor White
    Write-Host "3. Ensure Supabase project is active" -ForegroundColor White
    exit 1
}
Write-Host "✅ Database schema pushed successfully" -ForegroundColor Green
Write-Host ""

# Success message
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Database tables created in Supabase" -ForegroundColor Green
Write-Host "✅ Prisma Client generated" -ForegroundColor Green
Write-Host "✅ Ready to start development" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Create storage bucket in Supabase:" -ForegroundColor White
Write-Host "   - Go to Supabase Dashboard > Storage" -ForegroundColor White
Write-Host "   - Create bucket named: research-files" -ForegroundColor White
Write-Host "   - Make it PUBLIC" -ForegroundColor White
Write-Host ""
Write-Host "2. Start the development server:" -ForegroundColor White
Write-Host "   pnpm dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Open your browser:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 For more details, see:" -ForegroundColor Yellow
Write-Host "   SUPABASE_MIGRATION_COMPLETE.md" -ForegroundColor White
Write-Host ""
