# Quick Setup Script for AI Presentation Generator
# This script helps you set up the project step by step

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "AI Presentation Generator Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (Test-Path .env) {
    Write-Host "✓ .env file found" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current .env configuration:" -ForegroundColor Yellow
    Write-Host "Please manually edit .env file with your API keys" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "✗ .env file not found. Creating from .env.example..." -ForegroundColor Red
    Copy-Item .env.example .env
    Write-Host "✓ .env file created" -ForegroundColor Green
}

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Required Configuration" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "You need to configure the following in your .env file:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. DATABASE_URL (REQUIRED)" -ForegroundColor White
Write-Host "   - Get free PostgreSQL from: https://neon.tech" -ForegroundColor Gray
Write-Host "   - Or use: https://supabase.com" -ForegroundColor Gray
Write-Host ""

Write-Host "2. OPENAI_API_KEY (REQUIRED)" -ForegroundColor White
Write-Host "   - Get from: https://platform.openai.com/api-keys" -ForegroundColor Gray
Write-Host ""

Write-Host "3. GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET (REQUIRED)" -ForegroundColor White
Write-Host "   - Get from: https://console.cloud.google.com/apis/credentials" -ForegroundColor Gray
Write-Host "   - Redirect URI: http://localhost:3000/api/auth/callback/google" -ForegroundColor Gray
Write-Host ""

Write-Host "4. NEXTAUTH_SECRET (REQUIRED)" -ForegroundColor White
Write-Host "   - Generate with: openssl rand -base64 32" -ForegroundColor Gray
Write-Host "   - Or use: https://generate-secret.vercel.app/32" -ForegroundColor Gray
Write-Host ""

Write-Host "5. UPLOADTHING_TOKEN (You already have this)" -ForegroundColor White
Write-Host "   - Your token: csk-tj335y4ndpx9y2ntrt5wnm4jdtrwmj56w6vxfefy6pfmenwd" -ForegroundColor Gray
Write-Host ""

Write-Host "Optional (can configure later):" -ForegroundColor Yellow
Write-Host "   - TOGETHER_AI_API_KEY (for AI image generation)" -ForegroundColor Gray
Write-Host "   - UNSPLASH_ACCESS_KEY (for stock images)" -ForegroundColor Gray
Write-Host "   - TAVILY_API_KEY (for web search)" -ForegroundColor Gray
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Edit .env file with your API keys" -ForegroundColor White
Write-Host "2. Run: pnpm db:push (to initialize database)" -ForegroundColor White
Write-Host "3. Run: pnpm dev (to start the server)" -ForegroundColor White
Write-Host ""

$response = Read-Host "Do you want to open .env file now? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    notepad .env
}

Write-Host ""
Write-Host "For detailed instructions, see setup-guide.md" -ForegroundColor Cyan
Write-Host ""
