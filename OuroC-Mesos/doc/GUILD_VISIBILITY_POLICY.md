# Guild Visibility & Access Control Policy

**Date**: November 4, 2025
**Purpose**: Define what information is public vs member-only in guilds

---

## Visibility Matrix

| Information | Public (Non-Members) | Members Only | Notes |
|------------|---------------------|--------------|-------|
| **Basic Info** | | | |
| Guild name | ✅ Public | ✅ | - |
| Description | ✅ Public | ✅ | - |
| Category | ✅ Public | ✅ | - |
| Logo emoji | ✅ Public | ✅ | - |
| Tags | ✅ Public | ✅ | - |
| Creation date | ✅ Public | ✅ | - |
| **Stats** | | | |
| Member count | ✅ Public | ✅ | Shows guild size/popularity |
| Treasury balance | ✅ Public | ✅ | Shows guild resources (transparency) |
| Governance type | ✅ Public | ✅ | DAO vs Multisig |
| Voting threshold | ✅ Public | ✅ | Shows decision-making process |
| Subscription price | ✅ Public | ✅ | Need to see to join |
| **Proposals** | | | |
| Proposal count | ✅ Public | ✅ | Shows guild activity |
| Executed proposals (titles only) | ✅ Public | ✅ | Past decisions (transparency) |
| Executed proposals (full details) | ❌ Hidden | ✅ Members | Full transaction details |
| Active proposals (exists) | ✅ Public | ✅ | "X active proposals" |
| Active proposals (titles) | ❌ Hidden | ✅ Members | Current deliberations |
| Active proposals (details) | ❌ Hidden | ✅ Members | Amounts, recipients, votes |
| Voting results (live) | ❌ Hidden | ✅ Members | Real-time vote counts |
| Voting results (final) | ✅ Public | ✅ | Final tally for executed proposals |
| Proposal descriptions | ❌ Hidden | ✅ Members | Strategy/plans |
| Vote buttons | ❌ Hidden | ✅ Members | Can't vote if not member |
| Create proposal button | ❌ Hidden | ✅ Members | Must be member |
| **Members** | | | |
| Total member count | ✅ Public | ✅ | Shows size |
| Member wallet addresses | ❌ Hidden | ✅ Members | Privacy |
| Member roles | ❌ Hidden | ✅ Members | Internal structure |
| Member join dates | ❌ Hidden | ✅ Members | Internal info |
| Member voting power | ❌ Hidden | ✅ Members | Internal governance |
| Member directory | ❌ Hidden | ✅ Members | Full list |
| **Treasury** | | | |
| Current balance | ✅ Public | ✅ | Transparency |
| Executed transactions (summary) | ✅ Public | ✅ | What was spent |
| Transaction amounts | ✅ Public | ✅ | Transparency |
| Transaction types | ✅ Public | ✅ | Subscription vs execution |
| Transaction dates | ✅ Public | ✅ | Timeline |
| From/To addresses | ❌ Hidden | ✅ Members | Privacy |
| Transaction hashes | ❌ Hidden | ✅ Members | Can track on explorer |
| Pending transactions | ❌ Hidden | ✅ Members | Internal operations |
| **Other** | | | |
| Guild chat/forum | ❌ Hidden | ✅ Members | Private discussions |
| Member contact info | ❌ Hidden | ✅ Members | Privacy |
| Vote history | ❌ Hidden | ✅ Members | Who voted what |

---

## Rationale

### ✅ Public Information (Transparency)

**Why Public:**
- **Build Trust**: Show guild is active and well-funded
- **Attract Members**: Display success and activity
- **Accountability**: Show how funds were used (executed proposals)
- **Discovery**: Help users find the right guild

**What's Public:**
- Guild basics (name, description, category)
- Member count (social proof)
- Treasury balance (shows resources)
- Executed proposal summaries (past decisions)
- Subscription price (need to know to join)
- Governance model (transparency)

### ❌ Member-Only Information (Privacy & Strategy)

**Why Hidden:**
- **Privacy**: Protect member identities and wallet addresses
- **Strategy**: Don't reveal current deliberations to competitors
- **Security**: Prevent front-running or exploitation
- **Exclusivity**: Provide value for paid members
- **Focus**: Avoid external noise in internal discussions

**What's Hidden:**
- Active proposal details (current strategy)
- Member wallet addresses (privacy)
- Live voting counts (avoid bandwagon effect)
- Transaction hashes (can dox wallets)
- Member roles and hierarchy (internal)

---

## Implementation Strategy

### Public View (Non-Members)

```
Guild Detail Page (Public)
├── Overview Tab
│   ✅ Guild info (name, description, logo, tags)
│   ✅ Quick stats (members, treasury, governance)
│   ✅ "X active proposals" (count only)
│   ❌ Proposal details hidden
│   ✅ Join Guild CTA
│   ✅ Recent activity (summary)
│       ├── "Subscription payment received - $50"
│       └── "Proposal executed - $300"
│
├── Proposals Tab
│   ✅ Executed proposals (titles + final results)
│       ├── "Purchase GitHub Subscription"
│       ├── Amount: $300
│       ├── Status: ✅ Executed
│       ├── Final vote: 105 For, 8 Against (93%)
│       └── Executed: Oct 26, 2025
│   ❌ Active proposal details hidden
│   ✅ "X active proposals" + Join CTA
│
├── Members Tab
│   ✅ Total member count
│   ❌ Member list hidden
│   ✅ Join CTA: "Join to see member directory"
│
└── Treasury Tab
    ✅ Current balance: $42,500
    ✅ Transaction summary
        ├── "Subscription payment - $50 - Nov 4"
        ├── "Proposal execution - $300 - Oct 26"
        └── (Without addresses/hashes)
    ❌ Detailed transaction info hidden
    ✅ Join CTA: "Join to see full transaction history"
```

### Member View (Full Access)

```
Guild Detail Page (Members)
├── Overview Tab
│   ✅ Everything
│   ✅ Active proposal cards with voting
│   ✅ Vote For/Against buttons
│   ✅ "Create Proposal" button
│
├── Proposals Tab
│   ✅ All proposals (active + executed)
│   ✅ Full details
│   ✅ Live voting counts
│   ✅ Vote buttons
│
├── Members Tab
│   ✅ Full member directory
│   ✅ Wallet addresses
│   ✅ Roles
│   ✅ Join dates
│
└── Treasury Tab
    ✅ Current balance
    ✅ Full transaction history
    ✅ From/To addresses
    ✅ Transaction hashes (clickable to explorer)
```

---

## UI Components for Access Control

### 1. **Join CTA Card** (for restricted content)

```typescript
<Card className="glass border-2 border-primary/20 bg-primary/5">
  <CardContent className="p-8 text-center">
    <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
    <h3 className="text-xl font-bold mb-2">Members Only</h3>
    <p className="text-muted-foreground mb-4">
      Join this guild to see {contentType}
    </p>
    <Button size="lg" onClick={handleJoinGuild}>
      Join Guild - ${guild.subscriptionPrice}/{guild.interval}
    </Button>
  </CardContent>
</Card>
```

**Usage:**
- Replace active proposal details
- Replace member list
- Replace detailed transaction info

### 2. **Blurred Preview** (tease content)

```typescript
<div className="relative">
  {/* Blurred content */}
  <div className="filter blur-md select-none pointer-events-none">
    {/* Proposal details... */}
  </div>

  {/* Overlay */}
  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
    <div className="text-center">
      <Lock className="w-8 h-8 mx-auto mb-2" />
      <p className="font-semibold">Members Only</p>
      <Button size="sm" onClick={handleJoinGuild} className="mt-2">
        Join to View
      </Button>
    </div>
  </div>
</div>
```

### 3. **Public Summary Card** (for proposals)

```typescript
// Non-members see:
<Card>
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <Badge className="mb-2">⏳ 3 Active Proposals</Badge>
        <p className="text-sm text-muted-foreground">
          Guild members are currently voting on important decisions
        </p>
      </div>
      <Button onClick={handleJoinGuild}>
        Join to Participate
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## Code Implementation

### Check Membership Function

```typescript
// Helper function (add to GuildDetail.tsx)
const isMember = useMemo(() => {
  if (!publicKey) return false;
  // TODO: Check database if publicKey is in guild members
  // For now, mock check:
  return mockIsMember;
}, [publicKey]);

// Usage in component:
{isMember ? (
  // Show full details
  <ProposalDetails proposal={proposal} />
) : (
  // Show join CTA
  <JoinCTA contentType="active proposals" />
)}
```

### Conditional Rendering Examples

#### Active Proposals:
```typescript
{isMember ? (
  // Members: Show full proposal with voting
  proposals.filter(p => p.status === 'active').map(proposal => (
    <ProposalCard
      proposal={proposal}
      showVoting={true}
      showDetails={true}
    />
  ))
) : (
  // Non-members: Show count + join CTA
  <Card>
    <CardContent className="text-center py-8">
      <Badge className="mb-4">
        ⏳ {proposals.filter(p => p.status === 'active').length} Active Proposals
      </Badge>
      <p className="text-muted-foreground mb-4">
        Guild members are voting on important decisions
      </p>
      <Button onClick={handleJoinGuild}>
        Join to See Details
      </Button>
    </CardContent>
  </Card>
)}
```

#### Member Directory:
```typescript
{isMember ? (
  // Members: Show full directory
  members.map(member => (
    <MemberCard member={member} showWallet={true} />
  ))
) : (
  // Non-members: Show count + join CTA
  <Card>
    <CardContent className="text-center py-8">
      <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-bold mb-2">
        {guild.memberCount} Active Members
      </h3>
      <p className="text-muted-foreground mb-4">
        Join to connect with guild members
      </p>
      <Button onClick={handleJoinGuild}>
        Join Guild
      </Button>
    </CardContent>
  </Card>
)}
```

#### Treasury Transactions:
```typescript
{isMember ? (
  // Members: Show full details with addresses
  <TransactionRow
    transaction={tx}
    showAddresses={true}
    showHash={true}
  />
) : (
  // Non-members: Show summary only
  <TransactionRow
    transaction={tx}
    showAddresses={false}
    showHash={false}
    summarized={true}
  />
)}
```

---

## Benefits of This Approach

### For Guilds:
✅ **Privacy**: Member identities protected
✅ **Strategy**: Internal deliberations stay private
✅ **Value**: Membership provides exclusive access
✅ **Security**: Reduces attack surface

### For Users:
✅ **Transparency**: Can verify guild is legitimate
✅ **Discovery**: Can evaluate before joining
✅ **Trust**: See past decisions and fund usage
✅ **Clarity**: Know what they're paying for

### For Platform:
✅ **Conversion**: Strong incentive to join
✅ **Trust**: Public transparency builds credibility
✅ **Flexibility**: Easy to adjust policy per guild
✅ **Compliance**: Privacy-first approach

---

## Future Enhancements

### Guild-Specific Visibility Settings

Allow guild admins to customize:

```typescript
interface GuildVisibilitySettings {
  publicProposals: 'none' | 'executed-only' | 'all';
  publicMembers: 'count-only' | 'anonymous-list' | 'full';
  publicTreasury: 'balance-only' | 'summary' | 'full';
  publicVoting: 'hidden' | 'final-results' | 'live';
}
```

**Examples:**
- **Ultra-transparent guild**: Show everything publicly
- **Private guild**: Show only basics + member count
- **Standard guild**: Current policy (recommended default)

---

## Summary

### ✅ Public (Attract & Build Trust):
- Basic info, stats, member count, treasury balance
- Executed proposal summaries
- Transaction summaries (without sensitive details)

### ❌ Member-Only (Privacy & Value):
- Active proposal details and voting
- Member wallet addresses and roles
- Transaction addresses and hashes
- Internal communications

### 🎯 Goal:
Balance **transparency** (build trust) with **privacy** (protect members) to create **value** for paid membership.
