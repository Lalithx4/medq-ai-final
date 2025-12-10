# BioDocs.ai Ad Integration Documentation

## Overview

BioDocs.ai provides a comprehensive ad management system that integrates with MiroTalk SFU (video.biodocs.ai) to display sponsored ads in video meeting rooms. This document describes the integration protocol for the MiroTalk side.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BioDocs.ai (biodocs.ai)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Admin Dashboard (/admin/ads)                                               │
│    - Create/Edit/Delete ad campaigns                                        │
│    - Set targeting criteria (specialty, location, room type)                │
│    - View analytics (impressions, clicks, CTR, spend)                       │
│                                                                             │
│  Ad Service                                                                 │
│    - Selects best ad based on user context                                  │
│    - Creates impressions when ads are served                                │
│    - Tracks clicks and dismissals                                           │
│                                                                             │
│  Video Streaming Token API (/api/video-streaming/token)                     │
│    - Generates meeting URL with embedded ad data                            │
│    - Ad data encrypted inside JWT token                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ User joins meeting
                                    │ (URL with ?token=<jwt>)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MiroTalk SFU (video.biodocs.ai)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Decode JWT token from URL                                               │
│  2. Decrypt AES payload using shared secret                                 │
│  3. Extract ad data from payload                                            │
│  4. Display ad banner in meeting room                                       │
│  5. Track user interactions → POST to biodocs.ai/api/ads/track              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

### BioDocs.ai (.env)

```bash
# For MiroTalk API calls (meeting creation, etc.)
MIROTALK_API_SECRET=e129k4wiy76WSH9ccrjoZHFS3ei+CHi6ExUNWcEtKkk=

# For JWT token encryption (ads integration) - MUST match MiroTalk's secret
MIROTALK_JWT_SECRET=6266bec0a8411f4e6fa67bdee0de29c2ce4b2eddf8085c09e7614c1d7f1282a3
```

### MiroTalk SFU (video.biodocs.ai)

```bash
# JWT secret for decrypting ad tokens - MUST match BioDocs.ai's MIROTALK_JWT_SECRET
JWT_SECRET=6266bec0a8411f4e6fa67bdee0de29c2ce4b2eddf8085c09e7614c1d7f1282a3
```

**Important:** The `MIROTALK_JWT_SECRET` (BioDocs) and `JWT_SECRET` (MiroTalk) must be identical for token decryption to work.

This secret is used for:
1. **AES encryption** of the JWT payload
2. **JWT signing** of the token

---

## Token Format

### Meeting URL Structure

```
https://video.biodocs.ai/join?room=<roomId>&roomPassword=false&name=<userName>&audio=true&video=true&screen=false&hide=false&notify=true&token=<jwt_token>
```

### JWT Token Structure

The `token` query parameter contains a JWT signed with `MIROTALK_API_SECRET`:

```javascript
// JWT payload
{
  "data": "<AES_encrypted_payload>",
  "iat": 1733456789,
  "exp": 1733543189  // 24 hours
}
```

### Decrypting the Payload

```javascript
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');

function decodeToken(token, secret) {
  // 1. Verify and decode JWT
  const decoded = jwt.verify(token, secret);
  
  // 2. Decrypt AES payload
  const bytes = CryptoJS.AES.decrypt(decoded.data, secret);
  const decryptedPayload = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  
  return decryptedPayload;
}
```

### Decrypted Payload Structure

```typescript
interface TokenPayload {
  // User info
  username: string;        // Display name
  password: string;        // Random hex string (for MiroTalk auth)
  presenter: '0' | '1';    // '1' if host/presenter
  userId: string;          // BioDocs user ID
  userImage: string | null; // Avatar URL
  redirectUrl: string;     // Where to redirect after meeting (default: https://biodocs.ai)
  
  // Ad data (null if no ad selected)
  ad: AdData | null;
}

interface AdData {
  sponsor: string;           // Sponsor/company name (e.g., "Pfizer")
  sponsorLogo: string | null; // Logo URL
  message: string | null;    // Ad message/tagline
  url: string;               // Click destination URL
  ctaText: string;           // Call-to-action button text (e.g., "Learn More")
  impressionId: string;      // UUID - unique ID for this impression
  campaignId: string;        // UUID - campaign this ad belongs to
  trackingUrl: string;       // URL to POST tracking events (https://biodocs.ai/api/ads/track)
}
```

---

## Displaying Ads in MiroTalk

### Recommended UI

Display a non-intrusive banner in the meeting room:

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Sponsored by Pfizer                                     │
│  Discover our latest medical innovations                        │
│                                          [Learn More] [✕]       │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Example

```javascript
// In MiroTalk client code
function displayAd(adData) {
  if (!adData) return;
  
  const adBanner = document.createElement('div');
  adBanner.className = 'sponsored-ad-banner';
  adBanner.innerHTML = `
    <div class="ad-content">
      ${adData.sponsorLogo ? `<img src="${adData.sponsorLogo}" alt="${adData.sponsor}" class="ad-logo" />` : ''}
      <div class="ad-text">
        <span class="ad-sponsor">Sponsored by ${adData.sponsor}</span>
        ${adData.message ? `<p class="ad-message">${adData.message}</p>` : ''}
      </div>
      <a href="${adData.url}" target="_blank" class="ad-cta" onclick="trackAdClick('${adData.impressionId}', '${adData.trackingUrl}')">
        ${adData.ctaText}
      </a>
      <button class="ad-dismiss" onclick="dismissAd('${adData.impressionId}', '${adData.trackingUrl}')">✕</button>
    </div>
  `;
  
  document.body.appendChild(adBanner);
}
```

---

## Tracking Events

MiroTalk must send tracking events to BioDocs.ai when users interact with ads.

### Endpoint

```
POST https://biodocs.ai/api/ads/track
Content-Type: application/json
```

### Request Body

```typescript
interface TrackingRequest {
  event: 'click' | 'dismiss' | 'impression';
  impressionId: string;  // From adData.impressionId
}
```

### Events

| Event | When to Send | Description |
|-------|--------------|-------------|
| `impression` | Ad is displayed | Already tracked by BioDocs when ad is selected (optional to send again) |
| `click` | User clicks CTA button | User clicked the ad link |
| `dismiss` | User closes ad banner | User dismissed the ad |

### Implementation Example

```javascript
async function trackAdClick(impressionId, trackingUrl) {
  try {
    await fetch(trackingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'click',
        impressionId: impressionId
      })
    });
  } catch (error) {
    console.error('Failed to track ad click:', error);
  }
}

async function dismissAd(impressionId, trackingUrl) {
  try {
    await fetch(trackingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'dismiss',
        impressionId: impressionId
      })
    });
  } catch (error) {
    console.error('Failed to track ad dismiss:', error);
  }
  
  // Remove ad banner from UI
  document.querySelector('.sponsored-ad-banner')?.remove();
}
```

### Response

```json
{
  "success": true
}
```

Or on error:

```json
{
  "success": false,
  "message": "Already clicked"  // or "Impression not found"
}
```

---

## CORS Configuration

The tracking endpoint (`/api/ads/track`) is configured to accept cross-origin requests from `video.biodocs.ai`:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Complete Integration Example

```javascript
// MiroTalk integration code

const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');

const SHARED_SECRET = process.env.MIROTALK_API_SECRET;

// 1. Extract token from URL when user joins
function onUserJoin(urlParams) {
  const token = urlParams.get('token');
  if (!token) return;
  
  try {
    // 2. Decode and decrypt token
    const payload = decodeToken(token, SHARED_SECRET);
    
    // 3. Use user info
    const { username, presenter, userId, userImage } = payload;
    initializeUser(username, presenter === '1', userId, userImage);
    
    // 4. Display ad if present
    if (payload.ad) {
      displayAd(payload.ad);
    }
  } catch (error) {
    console.error('Failed to decode token:', error);
  }
}

function decodeToken(token, secret) {
  const decoded = jwt.verify(token, secret);
  const bytes = CryptoJS.AES.decrypt(decoded.data, secret);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

function displayAd(adData) {
  // Create and show ad banner
  const banner = createAdBanner(adData);
  document.body.appendChild(banner);
  
  // Auto-hide after 30 seconds (optional)
  setTimeout(() => {
    banner.classList.add('fade-out');
    setTimeout(() => banner.remove(), 500);
  }, 30000);
}

function createAdBanner(ad) {
  const banner = document.createElement('div');
  banner.className = 'sponsored-ad-banner';
  banner.innerHTML = `
    <div class="ad-inner">
      ${ad.sponsorLogo ? `<img src="${ad.sponsorLogo}" class="ad-logo" />` : ''}
      <div class="ad-body">
        <div class="ad-label">Sponsored by ${ad.sponsor}</div>
        ${ad.message ? `<div class="ad-message">${ad.message}</div>` : ''}
      </div>
      <a href="${ad.url}" target="_blank" class="ad-cta-btn" 
         onclick="trackEvent('click', '${ad.impressionId}', '${ad.trackingUrl}')">
        ${ad.ctaText}
      </a>
      <button class="ad-close-btn" 
              onclick="closeAd(this, '${ad.impressionId}', '${ad.trackingUrl}')">
        ×
      </button>
    </div>
  `;
  return banner;
}

// Global functions for onclick handlers
window.trackEvent = async function(event, impressionId, trackingUrl) {
  fetch(trackingUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, impressionId })
  }).catch(console.error);
};

window.closeAd = function(btn, impressionId, trackingUrl) {
  trackEvent('dismiss', impressionId, trackingUrl);
  btn.closest('.sponsored-ad-banner').remove();
};
```

### CSS Styles

```css
.sponsored-ad-banner {
  position: fixed;
  bottom: 20px;
  right: 20px;
  max-width: 400px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
}

.sponsored-ad-banner.fade-out {
  animation: fadeOut 0.5s ease-out forwards;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

.ad-inner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ad-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

.ad-body {
  flex: 1;
}

.ad-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.ad-message {
  font-size: 14px;
  color: white;
  line-height: 1.4;
}

.ad-cta-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.ad-cta-btn:hover {
  filter: brightness(1.1);
}

.ad-close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.ad-close-btn:hover {
  color: white;
}
```

---

## API Reference

### BioDocs.ai Endpoints (for MiroTalk)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ads/track` | POST | None | Track ad events (click, dismiss) |
| `/api/ads/targeted` | POST | None | Get targeted ad for a context (alternative to token-embedded ads) |

### Tracking Endpoint Details

**POST /api/ads/track**

Request:
```json
{
  "event": "click",
  "impressionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Response (success):
```json
{
  "success": true
}
```

Response (already tracked):
```json
{
  "success": false,
  "message": "Already clicked"
}
```

---

## Targeting Criteria

Ads can be targeted based on:

| Criteria | Description | Example |
|----------|-------------|---------|
| `specialties` | Medical specialties | `["cardiology", "oncology"]` |
| `locations` | Geographic locations | `["india", "usa", "uk"]` |
| `roomTypes` | Type of meeting room | `["consultation", "live", "webinar"]` |
| `userIds` | Specific user IDs | `["user-123", "user-456"]` |
| `userEmails` | Specific user emails | `["doctor@hospital.com"]` |

If no targeting is specified, the ad shows to all users.

---

## Testing

### Test Token Generation

You can test token decoding with this Node.js script:

```javascript
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');

const SECRET = 'your_mirotalk_api_secret';
const TEST_TOKEN = 'paste_token_from_url_here';

try {
  const decoded = jwt.verify(TEST_TOKEN, SECRET);
  const bytes = CryptoJS.AES.decrypt(decoded.data, SECRET);
  const payload = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  
  console.log('Decoded payload:', JSON.stringify(payload, null, 2));
  
  if (payload.ad) {
    console.log('\nAd data:');
    console.log('- Sponsor:', payload.ad.sponsor);
    console.log('- Message:', payload.ad.message);
    console.log('- URL:', payload.ad.url);
    console.log('- Impression ID:', payload.ad.impressionId);
  } else {
    console.log('\nNo ad in this token');
  }
} catch (error) {
  console.error('Failed to decode:', error.message);
}
```

---

## Troubleshooting

### Token Decryption Fails

1. Verify both apps use the same `MIROTALK_API_SECRET`
2. Check the token hasn't expired (24h validity)
3. Ensure the token is URL-decoded before verification

### Ad Not Displaying

1. Check if `payload.ad` is not null
2. Verify the ad campaign is active and approved in BioDocs admin
3. Check campaign date range (startDate ≤ now ≤ endDate)

### Tracking Requests Fail

1. Check CORS - requests should come from `video.biodocs.ai`
2. Verify `impressionId` is valid UUID
3. Check network connectivity to `biodocs.ai`

---

## Contact

For integration support, contact the BioDocs.ai development team.
