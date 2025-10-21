# OuroC AI Agent Integration

This directory contains AI-focused documentation and utilities to help AI coding agents (Cursor, Lovable, v0.dev, Bolt, Claude Code, etc.) successfully integrate OuroC SDK into applications.

## 🤖 For AI Coding Agents

### Quick Access
```typescript
// AI agents can import the AI helper directly
import { getAIInstructions, getEffectivePrompts } from '@ouroc/sdk/ai';

// Get latest instructions with fallback chain
const instructions = await getAIInstructions();

// Get working prompts for AI tools
const prompts = await getEffectivePrompts();
```

### What AI Agents Get

1. **Working Prompts**: Tested prompts that consistently work
2. **Current API Info**: Up-to-date component and hook documentation
3. **Code Examples**: Ready-to-use implementation patterns
4. **Troubleshooting**: Common issues and solutions
5. **Best Practices**: AI-specific implementation tips

## 📁 File Structure

```
packages/sdk/src/ai/
├── index.ts              # Main AI integration module
├── instructions.json     # NPM-published instructions
├── prompts.md           # Effective prompts for AI agents
└── README.md           # This file
```

## 🔧 Three Delivery Methods

### 1. Built-in Instructions (Always Available)
```typescript
import { getBuiltinInstructions } from '@ouroc/sdk/ai';
// Always works, no network required
```

### 2. GitHub Updates (Live from Repository)
```typescript
import { fetchGitHubInstructions } from '@ouroc/sdk/ai';
// Gets latest from your GitHub repo
```

### 3. NPM Published Instructions (With Releases)
```typescript
import { fetchNPMInstructions } from '@ouroc/sdk/ai';
// Gets version-specific instructions from npm
```

## 🎯 Unified API

AI agents should use the unified API for best results:

```typescript
import { getAIInstructions } from '@ouroc/sdk/ai';

// Automatically tries GitHub → NPM → Built-in fallback
const latestInstructions = await getAIInstructions();
```

## ⚠️ Important Implementation Notes

The OuroC SDK requires **complex subscription configuration**. AI agents should note:

### Price Format
- **Required**: Prices must be in **lamports** (1 SOL = 1,000,000,000 lamports)
- **Example**: $29 USD ≈ 29,000,000 lamports (0.029 SOL)
- **Component**: `<SubscriptionCard price={29000000} />`

### Required Subscription Parameters
`createSubscription` requires these parameters:
- `subscription_id` (from your backend)
- `amount` (in lamports)
- `intervalSeconds` (use `getIntervalSeconds()`)
- `plan_name`
- `solana_contract_address` (your contract)
- `api_key` (your service API key)
- `token_mint` (USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)

### Backend Integration Required
AI agents should emphasize that **backend integration is required** for:
- Generating subscription IDs
- Providing contract addresses
- Managing API keys
- Handling subscription lifecycle

## 📋 Effective Prompts

### High Success Rate Prompts
- "Add @ouroc/sdk subscription payments to my React app"
- "Create a SaaS pricing page using OuroC"
- "Implement crypto recurring payments without wallet requirement"

### Prompt Patterns
1. **Problem + Solution**: "I need to [PROBLEM] using OuroC"
2. **Feature-Focused**: "Add [FEATURE] with OuroC"
3. **Technology-Specific**: "Integrate OuroC with [TECHNOLOGY]"

See [prompts.md](./prompts.md) for comprehensive prompt guide.

## 🔄 Automatic Updates

The system automatically:
- **Syncs version** with package.json on each release
- **Validates** instruction format and compatibility
- **Provides fallbacks** when external sources are unavailable
- **Logs status** for debugging AI agent issues

## 🛠️ AI Tool Compatibility

### Tested Platforms
- ✅ **Cursor** - IDE integration
- ✅ **Lovable** - Frontend development
- ✅ **v0.dev** - React component generation
- ✅ **Bolt** - AI coding assistant
- ✅ **Claude Code** - Anthropic's coding tool
- ✅ **GitHub Copilot** - Code completion

### Success Factors
- **Clear package name**: Always mention "@ouroc/sdk"
- **Specific requirements**: Include pricing, features, constraints
- **Technical context**: Mention React, Next.js, TypeScript
- **Error handling**: Request proper error handling

## 📊 AI Agent Success Metrics

### Expected Success Rates
- **Basic prompts**: 90%+ success rate
- **Intermediate prompts**: 70-90% success rate
- **Advanced prompts**: 50-70% success rate

### Common AI Mistakes to Watch For
❌ Missing `<OuroCProvider>` wrapper
❌ Using micro-units directly in components
❌ No wallet connection checks
❌ Missing error handling
❌ Incorrect network configuration

## 🔍 Debugging AI Implementations

### Validation Checklist
When AI agents generate OuroC code, verify:

1. ✅ Provider wrapper present
2. ✅ Correct prop types (lamports for price, not whole dollars)
3. ✅ Wallet connection checks
4. ✅ Error handling implemented
5. ✅ Network configuration correct
6. ✅ All required createSubscription parameters included
7. ✅ getIntervalSeconds used for interval conversion
8. ✅ Backend integration requirements clearly documented

### Troubleshooting Prompts
```
"Please fix the OuroC implementation:
1. Add missing OuroCProvider wrapper
2. Use lamports for price prop (not whole dollars)
3. Add all required createSubscription parameters
4. Add error handling for subscription creation
5. Use getIntervalSeconds for interval conversion
6. Set correct network (devnet for development)"
```

## 📈 Performance Optimization

### For AI Agents
- **Synchronous access**: Use `getBuiltinInstructions()` for immediate results
- **Async updates**: Use `getAIInstructions()` for latest information
- **Error resilience**: System gracefully handles network failures

### For Developers
- **Bundle size**: AI module is tree-shakeable
- **Network usage**: Minimal, only when fetching updates
- **Caching**: Built-in validation and error handling

## 🚀 Future Enhancements

### Planned Features
- **Real-time validation**: Live API compatibility checking
- **Code generation**: AI-powered code templates
- **Performance metrics**: AI implementation success tracking
- **Community prompts**: Crowd-sourced effective prompts

### Contribution Guidelines
When adding new AI-focused features:
1. Test with multiple AI tools
2. Update prompt effectiveness metrics
3. Maintain backward compatibility
4. Update documentation and examples

---

**Last Updated**: 2025-10-21
**Compatibility**: OuroC SDK v1.0.0+
**AI Tools Tested**: Cursor, Lovable, v0.dev, Bolt, Claude Code, GitHub Copilot