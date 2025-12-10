# Token Tracking System - Comprehensive Plan

## 🎯 Objective

Build a separate token tracking system to monitor:
- **Input tokens** consumed per API call
- **Output tokens** generated per API call
- **Total tokens** per user
- **Cost estimation** based on actual token usage
- **Usage analytics** and reporting

**Key Point:** This is SEPARATE from the credit system. Credits are for access control, tokens are for usage monitoring.

---

## 📊 System Architecture

### 1. Database Schema

#### New Table: `TokenUsage`

```prisma
model TokenUsage {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Operation details
  operation       String   // presentation_generate, research_paper, chat, etc.
  operationId     String?  // ID of the presentation/document/chat created
  
  // Token metrics
  inputTokens     Int      // Tokens sent to API
  outputTokens    Int      // Tokens received from API
  totalTokens     Int      // inputTokens + outputTokens
  
  // Model details
  modelProvider   String   // openai, cerebras, ollama, etc.
  modelId         String   // gpt-4, llama3.1-70b, etc.
  
  // Cost calculation
  inputCost       Float    // Cost for input tokens (in USD)
  outputCost      Float    // Cost for output tokens (in USD)
  totalCost       Float    // Total cost (in USD)
  
  // Metadata
  metadata        Json?    // Additional context (prompt length, response length, etc.)
  createdAt       DateTime @default(now())
  
  @@index([userId])
  @@index([operation])
  @@index([modelProvider])
  @@index([createdAt])
}

// Add to User model
model User {
  // ... existing fields
  tokenUsage      TokenUsage[]
  
  // Aggregate token stats (for quick access)
  totalInputTokens   Int @default(0)
  totalOutputTokens  Int @default(0)
  totalTokens        Int @default(0)
  totalTokenCost     Float @default(0) // Total cost in USD
}
```

#### Update `CreditTransaction` to include token info

```prisma
model CreditTransaction {
  // ... existing fields
  tokensUsed      Int?     // Link to actual tokens consumed
  tokenUsageId    String?  // Reference to TokenUsage record
}
```

---

## 🔧 Implementation Components

### 2. Token Service (`src/lib/tokens/token-service.ts`)

```typescript
interface TokenUsageData {
  userId: string;
  operation: string;
  operationId?: string;
  inputTokens: number;
  outputTokens: number;
  modelProvider: string;
  modelId: string;
  metadata?: Record<string, any>;
}

interface TokenPricing {
  inputPricePerMillion: number;  // Price per 1M input tokens
  outputPricePerMillion: number; // Price per 1M output tokens
}

export class TokenService {
  // Track token usage
  static async trackUsage(data: TokenUsageData): Promise<TokenUsageRecord>
  
  // Get user's token statistics
  static async getUserStats(userId: string): Promise<UserTokenStats>
  
  // Get token usage history
  static async getUsageHistory(userId: string, options?: QueryOptions): Promise<TokenUsage[]>
  
  // Calculate cost for tokens
  static calculateCost(inputTokens: number, outputTokens: number, model: string): TokenCost
  
  // Get pricing for a model
  static getModelPricing(modelProvider: string, modelId: string): TokenPricing
  
  // Aggregate stats by operation
  static async getStatsByOperation(userId: string): Promise<OperationStats[]>
  
  // Aggregate stats by model
  static async getStatsByModel(userId: string): Promise<ModelStats[]>
  
  // Get daily/weekly/monthly usage
  static async getUsageByPeriod(userId: string, period: 'day' | 'week' | 'month'): Promise<PeriodStats[]>
}
```

---

### 3. Token Pricing Configuration (`src/lib/tokens/pricing.ts`)

```typescript
// Pricing per 1 million tokens (in USD)
export const TOKEN_PRICING = {
  openai: {
    'gpt-4': {
      input: 30.00,   // $30 per 1M input tokens
      output: 60.00,  // $60 per 1M output tokens
    },
    'gpt-4-turbo': {
      input: 10.00,
      output: 30.00,
    },
    'gpt-3.5-turbo': {
      input: 0.50,
      output: 1.50,
    },
  },
  cerebras: {
    'llama3.1-8b': {
      input: 0.10,
      output: 0.10,
    },
    'llama3.1-70b': {
      input: 0.60,
      output: 0.60,
    },
  },
  together: {
    'llama-3.1-70b': {
      input: 0.88,
      output: 0.88,
    },
  },
  ollama: {
    // Local models - no cost
    '*': {
      input: 0,
      output: 0,
    },
  },
};
```

---

### 4. Token Extraction Utilities (`src/lib/tokens/extractors.ts`)

```typescript
// Extract token usage from different API responses

export class TokenExtractor {
  // OpenAI format
  static fromOpenAI(response: any): TokenCount {
    return {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };
  }
  
  // Cerebras format
  static fromCerebras(response: any): TokenCount {
    return {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };
  }
  
  // Together AI format
  static fromTogether(response: any): TokenCount {
    return {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
    };
  }
  
  // Streaming responses (accumulate tokens)
  static fromStream(chunks: any[]): TokenCount {
    // Accumulate tokens from streaming chunks
  }
  
  // Estimate tokens if not provided (fallback)
  static estimate(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
```

---

## 📈 Integration Points

### 5. Where to Track Tokens

#### A. Presentation Generation

**File:** `src/app/api/presentation/generate-cerebras/route.ts`

```typescript
// BEFORE API call
const startTime = Date.now();

// Make API call
const response = await cerebras.chat.completions.create({...});

// AFTER API call - Extract tokens
const tokenUsage = TokenExtractor.fromCerebras(response);

// Track usage
await TokenService.trackUsage({
  userId: session.user.id,
  operation: 'presentation_generate',
  operationId: presentationId,
  inputTokens: tokenUsage.inputTokens,
  outputTokens: tokenUsage.outputTokens,
  modelProvider: 'cerebras',
  modelId: modelId,
  metadata: {
    title,
    slideCount: outline.length,
    duration: Date.now() - startTime,
  },
});

console.log(`📊 Token Usage: ${tokenUsage.inputTokens} in, ${tokenUsage.outputTokens} out`);
```

#### B. Outline Generation

**File:** `src/app/api/presentation/outline-cerebras/route.ts`

```typescript
const response = await cerebras.chat.completions.create({...});
const tokenUsage = TokenExtractor.fromCerebras(response);

await TokenService.trackUsage({
  userId: session.user.id,
  operation: 'presentation_outline',
  inputTokens: tokenUsage.inputTokens,
  outputTokens: tokenUsage.outputTokens,
  modelProvider: 'cerebras',
  modelId: modelId,
});
```

#### C. Deep Research

**File:** `src/app/api/deep-research/generate/route.ts`

```typescript
// Track tokens for each section generation
for (const section of sections) {
  const response = await generateSection(section);
  const tokenUsage = TokenExtractor.fromOpenAI(response);
  
  await TokenService.trackUsage({
    userId: session.user.id,
    operation: 'deep_research_section',
    operationId: reportId,
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    modelProvider: 'openai',
    modelId: 'gpt-4',
    metadata: { section: section.title },
  });
}
```

#### D. Chat/AI Assistant

**File:** `src/app/api/chat/route.ts`

```typescript
const response = await openai.chat.completions.create({...});
const tokenUsage = TokenExtractor.fromOpenAI(response);

await TokenService.trackUsage({
  userId: session.user.id,
  operation: 'chat_message',
  operationId: conversationId,
  inputTokens: tokenUsage.inputTokens,
  outputTokens: tokenUsage.outputTokens,
  modelProvider: 'openai',
  modelId: 'gpt-4',
});
```

#### E. Document Editor AI Assist

**File:** `src/app/api/editor/ai-assist/route.ts`

```typescript
const response = await openai.chat.completions.create({...});
const tokenUsage = TokenExtractor.fromOpenAI(response);

await TokenService.trackUsage({
  userId: session.user.id,
  operation: 'editor_assist',
  inputTokens: tokenUsage.inputTokens,
  outputTokens: tokenUsage.outputTokens,
  modelProvider: 'openai',
  modelId: 'gpt-4',
});
```

---

## 📊 Analytics & Reporting

### 6. Token Analytics Dashboard

**Component:** `src/components/analytics/TokenUsageDashboard.tsx`

**Features:**
- Total tokens consumed (input/output)
- Cost breakdown by operation
- Cost breakdown by model
- Usage trends (daily/weekly/monthly)
- Top consuming operations
- Cost projections

**Visualizations:**
- Line chart: Token usage over time
- Pie chart: Usage by operation
- Bar chart: Cost by model
- Table: Recent usage history

---

### 7. API Endpoints

#### Get User Token Stats
```typescript
GET /api/tokens/stats
Response: {
  totalInputTokens: 1234567,
  totalOutputTokens: 987654,
  totalTokens: 2222221,
  totalCost: 45.67,
  byOperation: [...],
  byModel: [...],
}
```

#### Get Token Usage History
```typescript
GET /api/tokens/history?limit=50&operation=presentation_generate
Response: {
  usage: [
    {
      id: "xxx",
      operation: "presentation_generate",
      inputTokens: 1500,
      outputTokens: 3000,
      cost: 0.15,
      createdAt: "2025-10-21T...",
    },
    ...
  ]
}
```

#### Get Usage by Period
```typescript
GET /api/tokens/usage-by-period?period=week
Response: {
  data: [
    { date: "2025-10-15", tokens: 50000, cost: 2.50 },
    { date: "2025-10-16", tokens: 45000, cost: 2.25 },
    ...
  ]
}
```

---

## 🎨 UI Components

### 8. Token Usage Display

#### A. User Dashboard Widget
```tsx
<TokenUsageWidget>
  <Stat label="Tokens Used Today" value="125,432" />
  <Stat label="Estimated Cost" value="$2.45" />
  <Stat label="Most Used" value="Presentations" />
  <Button>View Details</Button>
</TokenUsageWidget>
```

#### B. Operation-Specific Display
```tsx
// After generating presentation
<Alert>
  ✅ Presentation generated!
  📊 Tokens used: 4,523 (1,200 in, 3,323 out)
  💰 Cost: $0.12
</Alert>
```

#### C. Real-time Token Counter
```tsx
// During streaming generation
<TokenCounter>
  Generating... {currentTokens} tokens
</TokenCounter>
```

---

## 🔄 Data Flow

### 9. Complete Flow Example

```
User Request
    ↓
API Route Handler
    ↓
Check Authentication
    ↓
Check Credits (separate system)
    ↓
Make AI API Call
    ↓
Extract Token Usage from Response
    ↓
Calculate Cost
    ↓
Save to TokenUsage table
    ↓
Update User aggregate stats
    ↓
Return Response + Token Info
    ↓
Display to User
```

---

## 📋 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create Prisma schema for `TokenUsage`
- [ ] Build `TokenService` class
- [ ] Create `TokenExtractor` utilities
- [ ] Define pricing configuration
- [ ] Run database migration

### Phase 2: Integration (Week 2)
- [ ] Integrate token tracking in presentation generation
- [ ] Integrate token tracking in outline generation
- [ ] Integrate token tracking in deep research
- [ ] Integrate token tracking in chat
- [ ] Add token info to API responses

### Phase 3: Analytics (Week 3)
- [ ] Build token stats API endpoints
- [ ] Create token usage dashboard
- [ ] Add usage charts and visualizations
- [ ] Implement export functionality
- [ ] Add cost alerts/notifications

### Phase 4: Optimization (Week 4)
- [ ] Add caching for frequent queries
- [ ] Optimize database queries
- [ ] Add batch token tracking
- [ ] Implement token usage limits
- [ ] Add admin analytics panel

---

## 📊 Example Data Structure

### TokenUsage Record
```json
{
  "id": "clxxx123",
  "userId": "user123",
  "operation": "presentation_generate",
  "operationId": "pres456",
  "inputTokens": 1500,
  "outputTokens": 3500,
  "totalTokens": 5000,
  "modelProvider": "cerebras",
  "modelId": "llama3.1-70b",
  "inputCost": 0.0009,
  "outputCost": 0.0021,
  "totalCost": 0.003,
  "metadata": {
    "title": "AI in Healthcare",
    "slideCount": 10,
    "duration": 15000
  },
  "createdAt": "2025-10-21T07:30:00Z"
}
```

### User Token Stats
```json
{
  "userId": "user123",
  "totalInputTokens": 125000,
  "totalOutputTokens": 287000,
  "totalTokens": 412000,
  "totalCost": 12.45,
  "byOperation": [
    {
      "operation": "presentation_generate",
      "count": 25,
      "totalTokens": 250000,
      "totalCost": 7.50
    },
    {
      "operation": "deep_research",
      "count": 10,
      "totalTokens": 150000,
      "totalCost": 4.50
    }
  ],
  "byModel": [
    {
      "provider": "cerebras",
      "model": "llama3.1-70b",
      "totalTokens": 300000,
      "totalCost": 9.00
    },
    {
      "provider": "openai",
      "model": "gpt-4",
      "totalTokens": 112000,
      "totalCost": 3.45
    }
  ]
}
```

---

## 🎯 Benefits

### For Users
- ✅ **Transparency** - See exactly how many tokens each operation uses
- ✅ **Cost Awareness** - Understand actual API costs
- ✅ **Usage Insights** - Identify high-consuming operations
- ✅ **Budget Control** - Monitor spending in real-time

### For Admins
- ✅ **Cost Analysis** - Track actual API costs per user
- ✅ **Usage Patterns** - Identify popular features
- ✅ **Optimization** - Find opportunities to reduce costs
- ✅ **Pricing Strategy** - Data-driven credit pricing

### For Business
- ✅ **Profitability** - Ensure credit pricing covers costs
- ✅ **Forecasting** - Predict infrastructure costs
- ✅ **Reporting** - Generate usage reports for stakeholders
- ✅ **Optimization** - Identify cost-saving opportunities

---

## 🔐 Privacy & Security

- ✅ Users can only see their own token usage
- ✅ Admin role required for global analytics
- ✅ Token data encrypted at rest
- ✅ Automatic cleanup of old records (>1 year)
- ✅ GDPR-compliant data export

---

## 🚀 Advanced Features (Future)

### Token Budgets
- Set monthly token limits per user
- Alert when approaching limit
- Auto-throttle or block when exceeded

### Token Optimization
- Suggest cheaper models for simple tasks
- Prompt optimization recommendations
- Caching for repeated queries

### Token Marketplace
- Allow users to purchase token packages
- Dynamic pricing based on usage
- Bulk discounts for high-volume users

### Real-time Monitoring
- WebSocket updates for live token counting
- Dashboard with real-time charts
- Alerts for unusual usage patterns

---

## 📝 Summary

**Key Components:**
1. ✅ Separate `TokenUsage` table in database
2. ✅ `TokenService` for tracking and analytics
3. ✅ `TokenExtractor` for parsing API responses
4. ✅ Pricing configuration for all models
5. ✅ Integration in all AI API routes
6. ✅ Analytics dashboard for users
7. ✅ Admin panel for global insights

**Separation from Credits:**
- **Credits** = Access control (can user perform action?)
- **Tokens** = Usage monitoring (how much did it cost?)
- Both systems work independently but complement each other

**Next Steps:**
1. Review and approve this plan
2. Create Prisma schema
3. Implement TokenService
4. Start integrating in API routes
5. Build analytics dashboard

---

**Status:** 📋 **Plan Ready for Review**

**Estimated Timeline:** 4 weeks for full implementation

**Priority:** High - Essential for cost management and transparency
