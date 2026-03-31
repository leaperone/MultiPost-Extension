# Pricing System Documentation

## Overview

MultiPost uses a credit-based pricing system for all AI and generation features. All pricing is centrally managed and calculated using Decimal.js for financial precision.

## Pricing Configuration

### Location
All pricing constants are defined in `apps/web/actions/credit/types.ts`:

```typescript
export const PRICING = {
  DEFAULT: new Decimal(0.001 * 10), // per token
  LLM: {
    DEEPSEEK_CHAT: {
      INPUT: new Decimal(0.027 * 10).div(new Decimal(10 ** 6)), // per token
      OUTPUT: new Decimal(0.11 * 10).div(new Decimal(10 ** 6)), // per token
    },
  },
  IMAGE_GENERATION: new Decimal(0.004 * 10), // per image
  POSTER_GENERATION: new Decimal(0.004 * 10), // per image
  FILE_HOSTING: new Decimal(0.04), // 1GB Transfer
  AUDIO_TRANSCRIPTION: new Decimal(0.000017 * 2), // per second
} as const;
```

## Current Pricing

### Image Generation
- **Price**: $0.04 per image
- **Implementation**:
  - `apps/web/app/dashboard/draw/image/action.ts` - UI action
  - `apps/web/lib/image.ts` - Background processing
- **Calculation**: `PRICING.IMAGE_GENERATION × number_of_images`
- **Pre-check**: `preCheckCredit(userId, totalCost)`
- **Deduction**: `deductCreditWorker(userId, 'IMAGE_GENERATION', totalCost)`

### Poster Generation
- **Price**: $0.04 per poster
- **Implementation**: `apps/web/app/dashboard/draw/poster/action.ts`
- **Pre-check**: `preCheckCredit(session.user.id, PRICING.POSTER_GENERATION.toNumber())`
- **Deduction**: After successful completion in `updatePosterGeneration()`

### AI Text Generation (DeepSeek)
- **Input Tokens**: $0.00000027 per token
- **Output Tokens**: $0.0000011 per token
- **Implementation**: `apps/web/app/api/draft/ai/creation/route.ts`
- **Usage**: AI content creation for drafts

### Audio Transcription
- **Price**: $0.000034 per second
- **Implementation**: `apps/web/app/api/internal/audio/transcriptions/route.ts`
- **Calculation**: `PRICING.AUDIO_TRANSCRIPTION.mul(durationSeconds)`

### File Hosting
- **Price**: $0.04 per GB transfer
- **Usage**: Applied when images are uploaded to internal file hosting
- **Source Tracking**: `X-Source` header indicates the source (IMAGE_GENERATION, POSTER_GENERATION)

## Credit System Architecture

### Credit Types
1. **Free Credits**
   - Signup: 0.5 credits
   - GitHub signup: 1.0 credits
   - Auto-allocated during user registration

2. **Paid Credits**
   - Stripe integration: $10 minimum
   - Alipay integration: $1 minimum
   - Purchased through recharge system

### Usage Priority
1. Free credits are consumed first
2. Paid credits are used when free credits are exhausted
3. Both types are tracked separately in the database

### Usage Tracking
All pricing calculations use the `USAGE_TYPE_MAP` for categorization:
- `IMAGE_GENERATION`: 'image_generation'
- `POSTER_GENERATION`: 'poster_generation'
- `LLM_DEEPSEEK_CHAT_INPUT`: 'llm_deepseek_chat_input'
- `LLM_DEEPSEEK_CHAT_OUTPUT`: 'llm_deepseek_chat_output'
- `AUDIO_TRANSCRIPTION`: 'audio_transcription'

## Key Implementation Files

### Core Credit System
- `apps/web/actions/credit/types.ts` - All pricing constants and type definitions
- `apps/web/actions/credit/index.ts` - Main credit operations (deduct, add, batch)
- `apps/web/actions/credit/worker.ts` - Credit deduction for worker processes
- `apps/web/actions/credit/recharge.ts` - Stripe/Alipay recharge functionality

### Feature-Specific Implementations
- `apps/web/app/dashboard/draw/image/action.ts` - Image generation pricing
- `apps/web/lib/image.ts` - Image generation worker pricing
- `apps/web/app/dashboard/draw/poster/action.ts` - Poster generation pricing
- `apps/web/app/api/draft/ai/creation/route.ts` - LLM usage (DeepSeek)
- `apps/web/app/api/internal/audio/transcriptions/route.ts` - Audio transcription pricing

### Database Schema
- `creditUsage` table logs all credit deductions
- Separate tracking for free vs paid credit usage
- Usage type categorization for analytics

## Recent Changes

### Image Generation Pricing Update (Commit: ca350ff)
- **Before**: $0.004 per image
- **After**: $0.04 per image (10x increase)
- **Reason**: Corrected pricing calculation error
- **Impact**: More accurate market pricing for image generation services

## Development Guidelines

### Adding New Pricing Features
1. Define pricing constant in `apps/web/actions/credit/types.ts`
2. Add usage type to `USAGE_TYPE_MAP`
3. Implement pre-check using `preCheckCredit()`
4. Implement deduction using `deductCredit()` or `deductCreditWorker()`
5. Add proper error handling for insufficient credits

### Testing Pricing Changes
1. Update pricing constants in `apps/web/actions/credit/types.ts`
2. Test with different credit scenarios (free/paid/insufficient)
3. Verify usage tracking in `creditUsage` table
4. Test recharge functionality with payment providers

### Monitoring and Analytics
- All credit usage is logged for analytics
- Admin dashboard provides usage management
- Real-time credit balance tracking
- Geographic and device analytics for usage patterns