import type { ChangedFile, ChangedFileStatus, ChangedFileSummary, ConnectedRepository, ReviewRequestDetail, ReviewRequestState } from './types'

type FileSeed = { path: string; status: ChangedFileStatus; additions: number; deletions: number; patch: string | null; previousPath?: string }
type RequestSeed = {
  repo: 0 | 1 | 2
  number: number
  title: string
  description: string
  author: string
  source: string
  target?: string
  state?: ReviewRequestState
  isDraft?: boolean
  updatedHoursAgo: number
  files: FileSeed[]
}

const repositorySeeds = [
  { name: 'policydesk-web', isPrivate: true },
  { name: 'payments-api', isPrivate: true },
  { name: 'infra-config', isPrivate: false },
] as const

const accountLogin = 'acme-labs'

export function buildMockRepositories(connectionId: string, now: string): ConnectedRepository[] {
  return repositorySeeds.map((seed, index) => ({
    id: repositoryId(connectionId, index),
    connectionId,
    provider: 'github',
    owner: accountLogin,
    name: seed.name,
    fullName: `${accountLogin}/${seed.name}`,
    url: `https://github.com/${accountLogin}/${seed.name}`,
    defaultBranch: 'main',
    isPrivate: seed.isPrivate,
    syncStatus: 'succeeded',
    syncError: null,
    lastSyncedAt: now,
    openRequestCount: 0,
  }))
}

export const mockAccount = { accountLogin, accountType: 'Organization', installationId: 48213907 } as const

export function summarizeFiles(files: ChangedFile[]): ChangedFileSummary {
  const count = (status: ChangedFileStatus) => files.filter((file) => file.status === status).length
  return {
    added: count('added'), modified: count('modified'), removed: count('removed'), renamed: count('renamed'),
    additions: files.reduce((sum, file) => sum + file.additions, 0),
    deletions: files.reduce((sum, file) => sum + file.deletions, 0),
    total: files.length,
  }
}

export function buildMockRequests(workspaceId: string, connectionId: string, now: string): ReviewRequestDetail[] {
  return requestSeeds.map((seed) => {
    const repo = repositorySeeds[seed.repo]
    const fullName = `${accountLogin}/${repo.name}`
    const state = seed.state ?? 'open'
    const updatedAt = hoursAgo(seed.updatedHoursAgo)
    const files: ChangedFile[] = seed.files.map((file, index) => ({
      id: `${repositoryId(connectionId, seed.repo)}-pr-${seed.number}-file-${index}`,
      path: file.path, previousPath: file.previousPath ?? null, status: file.status,
      additions: file.additions, deletions: file.deletions, changes: file.additions + file.deletions, patch: file.patch,
    }))
    return {
      id: `${repositoryId(connectionId, seed.repo)}-pr-${seed.number}`,
      workspaceId, repositoryId: repositoryId(connectionId, seed.repo), repositoryFullName: fullName, provider: 'github',
      number: seed.number, title: seed.title, description: seed.description,
      url: `https://github.com/${fullName}/pull/${seed.number}`,
      state, isDraft: seed.isDraft ?? false,
      author: { login: seed.author, avatarUrl: null },
      sourceBranch: seed.source, targetBranch: seed.target ?? 'main',
      headSha: fakeSha(seed.number * 7 + seed.repo), baseSha: fakeSha(seed.number * 13 + seed.repo + 1),
      fileSummary: summarizeFiles(files),
      createdAt: hoursAgo(seed.updatedHoursAgo + 30), updatedAt,
      closedAt: state === 'open' ? null : updatedAt, mergedAt: state === 'merged' ? updatedAt : null,
      lastSyncedAt: now, files,
    }
  })
}

export function repositoryId(connectionId: string, index: number) { return `${connectionId}-repo-${index + 1}` }
function hoursAgo(amount: number) { return new Date(Date.now() - amount * 3_600_000).toISOString() }
function fakeSha(seed: number) {
  let value = seed * 2654435761 >>> 0
  let out = ''
  while (out.length < 40) { value = (value * 1103515245 + 12345) >>> 0; out += value.toString(16).padStart(8, '0') }
  return out.slice(0, 40)
}

const rateLimitPatch = `@@ -1,12 +1,24 @@
 import { createHash } from 'node:crypto'
+import { RateLimiter } from './rate-limiter'
 
 export interface PaymentRequest {
   amount: number
   currency: string
-  customerId: string
+  customerId: string
+  idempotencyKey: string
 }
 
-export async function charge(request: PaymentRequest) {
-  return gateway.charge(request)
+const limiter = new RateLimiter({ perMinute: 60 })
+
+export async function charge(request: PaymentRequest) {
+  if (!limiter.tryTake(request.customerId)) {
+    throw new Error('Too many payment attempts. Try again in a minute.')
+  }
+  return gateway.charge(request, { idempotencyKey: request.idempotencyKey })
 }`

const authPatch = `@@ -8,7 +8,9 @@ export function useSession() {
   const token = readToken()
-  if (!token) return null
+  if (!token || isExpired(token)) {
+    clearToken()
+    return null
+  }
   return parse(token)
 }`

const largePatch = buildLargePatch()

function buildLargePatch() {
  const lines = ['@@ -1,40 +1,150 @@ export const routes = [']
  for (let index = 0; index < 40; index += 1) lines.push(` { path: '/legacy/${index}', handler: legacy${index} },`)
  for (let index = 0; index < 110; index += 1) lines.push(`+  { path: '/v2/resource-${index}', handler: handleResource${index}, auth: 'required' },`)
  for (let index = 0; index < 12; index += 1) lines.push(`-  { path: '/v1/resource-${index}', handler: handleResourceV1${index} },`)
  return lines.join('\n')
}

const requestSeeds: RequestSeed[] = [
  {
    repo: 1, number: 214, title: 'Add per-customer rate limiting to the charge endpoint', author: 'priya-shah', source: 'feat/charge-rate-limit', updatedHoursAgo: 2,
    description: 'Adds a token bucket limiter in front of `charge` and requires an idempotency key so retries cannot double charge.\n\nPolicy check: matches the "Secure code review" policy for payment paths.',
    files: [
      { path: 'src/payments/charge.ts', status: 'modified', additions: 14, deletions: 3, patch: rateLimitPatch },
      { path: 'src/payments/rate-limiter.ts', status: 'added', additions: 38, deletions: 0, patch: '@@ -0,0 +1,38 @@\n+export class RateLimiter {\n+  private readonly buckets = new Map<string, number[]>()\n+  constructor(private readonly options: { perMinute: number }) {}\n+  tryTake(key: string) {\n+    const now = Date.now()\n+    const recent = (this.buckets.get(key) ?? []).filter((time) => now - time < 60_000)\n+    if (recent.length >= this.options.perMinute) return false\n+    this.buckets.set(key, [...recent, now])\n+    return true\n+  }\n+}' },
      { path: 'docs/payments.md', status: 'modified', additions: 6, deletions: 0, patch: '@@ -20,3 +20,9 @@\n ## Errors\n \n+### Rate limiting\n+\n+Each customer may start 60 payment attempts per minute.\n+Callers must send an `idempotencyKey` with every charge.\n+' },
    ],
  },
  {
    repo: 0, number: 128, title: 'Expire stale sessions on the client', author: 'alex-morgan', source: 'fix/session-expiry', updatedHoursAgo: 5,
    description: 'Clears expired tokens before parsing so users land on the login page instead of seeing a broken dashboard.',
    files: [
      { path: 'src/libs/auth/session.ts', status: 'modified', additions: 4, deletions: 1, patch: authPatch },
      { path: 'src/libs/auth/token.ts', status: 'renamed', previousPath: 'src/libs/auth/jwt.ts', additions: 3, deletions: 0, patch: '@@ -1,4 +1,7 @@\n export function parse(token: string) {\n   return JSON.parse(atob(token.split(\'.\')[1]))\n }\n+\n+export function isExpired(token: string) {\n+  return parse(token).exp * 1000 < Date.now()\n+}' },
      { path: 'src/libs/auth/legacy-cookie.ts', status: 'removed', additions: 0, deletions: 22, patch: '@@ -1,22 +0,0 @@\n-export function readLegacyCookie() {\n-  return document.cookie.split(\'; \').find((row) => row.startsWith(\'pd_session=\'))\n-}' },
    ],
  },
  {
    repo: 0, number: 131, title: 'Redesign the policy library empty state', author: 'jordan-lee', source: 'design/library-empty-state', isDraft: true, updatedHoursAgo: 9,
    description: 'Work in progress. Needs copy review before it is ready.',
    files: [
      { path: 'src/components/policies-section.tsx', status: 'modified', additions: 18, deletions: 6, patch: '@@ -120,6 +120,18 @@\n-<h2>Your library is ready</h2>\n+<h2>Start your policy library</h2>\n+<p>Create a draft, or generate one with AI.</p>' },
      { path: 'src/assets/library-empty.png', status: 'added', additions: 0, deletions: 0, patch: null },
    ],
  },
  {
    repo: 2, number: 57, title: 'Rotate staging database credentials', author: 'sam-okafor', source: 'ops/rotate-staging-db', updatedHoursAgo: 26,
    description: 'Moves staging credentials to the shared secret store and renames the config file to match production.',
    files: [
      { path: 'environments/staging/database.tf', status: 'renamed', previousPath: 'environments/staging/db.tf', additions: 5, deletions: 5, patch: '@@ -3,8 +3,8 @@ resource "aws_db_instance" "staging" {\n   engine         = "postgres"\n-  password       = var.staging_db_password\n+  password       = data.aws_secretsmanager_secret_version.staging_db.secret_string\n   instance_class = "db.t4g.medium"\n }' },
      { path: 'environments/staging/secrets.tf', status: 'added', additions: 12, deletions: 0, patch: '@@ -0,0 +1,12 @@\n+data "aws_secretsmanager_secret_version" "staging_db" {\n+  secret_id = "staging/database"\n+}' },
    ],
  },
  {
    repo: 1, number: 209, title: 'Regenerate the API route table', author: 'priya-shah', source: 'chore/route-table-v2', updatedHoursAgo: 52,
    description: 'Large generated change. The route table is rebuilt from the OpenAPI spec and the bundled fixture is replaced.',
    files: [
      { path: 'src/routes/table.ts', status: 'modified', additions: 110, deletions: 12, patch: largePatch },
      { path: 'fixtures/openapi-snapshot.bin', status: 'modified', additions: 0, deletions: 0, patch: null },
    ],
  },
  {
    repo: 0, number: 120, title: 'Group team members by role', author: 'alex-morgan', source: 'feat/team-roles-grouping', state: 'merged', updatedHoursAgo: 96,
    description: 'Shows admins first and adds a role summary above the list.',
    files: [{ path: 'src/pages/team/page.tsx', status: 'modified', additions: 21, deletions: 9, patch: '@@ -140,4 +140,16 @@\n-{members.map(renderMember)}\n+{admins.map(renderMember)}\n+{others.map(renderMember)}' }],
  },
  {
    repo: 2, number: 52, title: 'Pin terraform provider versions', author: 'sam-okafor', source: 'ops/pin-providers', state: 'closed', updatedHoursAgo: 140,
    description: 'Superseded by the shared module update.',
    files: [{ path: 'versions.tf', status: 'modified', additions: 3, deletions: 1, patch: '@@ -1,4 +1,6 @@\n terraform {\n-  required_version = ">= 1.5"\n+  required_version = "~> 1.9"\n }' }],
  },
]
