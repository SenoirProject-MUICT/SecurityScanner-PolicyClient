import { withSupabase } from 'npm:@supabase/server@1'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { Database } from '../../../../../apps/client/src/libs/supabase/database.types.ts'

type Role = 'admin' | 'member'
type MemberStatus = 'active' | 'invited' | 'disabled'

const json = (body: unknown, status = 200) => Response.json(body, { status })

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

    try {
      // Resolve the authenticated user through Supabase Auth instead of relying
      // on a particular shape for the claims object provided by the wrapper.
      const { data: authData, error: authError } = await context.supabase.auth.getUser()
      const actorId = authData.user?.id
      if (authError || !authData.user || typeof actorId !== 'string' || !isUuid(actorId)) {
        console.error('workspace-members could not resolve authenticated user', {
          hasUser: Boolean(authData.user),
          userIdIsUuid: isUuid(actorId ?? ''),
          authError: authError?.message ?? null,
        })
        return json({ error: 'Your Supabase session has an invalid user ID. Sign out and sign in again with Supabase Auth.' }, 401)
      }
      const admin = context.supabaseAdmin as SupabaseClient<Database>

      const body = await request.json().catch(() => ({}))
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return json({ error: 'Invalid request body.' }, 400)
      }
      const action = typeof body.action === 'string' ? body.action : ''

      if (action === 'list-workspaces') {
        const workspaceOptions = await resolveUserWorkspaces(admin, authData.user)
        return json({ workspaces: workspaceOptions })
      }

      if (action === 'create-workspace') {
        const { count, error: countError } = await admin.from('workspace_memberships')
          .select('id', { count: 'exact', head: true }).eq('user_id', actorId).eq('status', 'active')
        if (countError) throw countError
        if (count) return json({ error: 'You already belong to a workspace.' }, 409)
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        if (!name || name.length > 100) return json({ error: 'Enter a workspace name up to 100 characters.' }, 400)
        const { data: workspace, error: workspaceError } = await admin.from('workspaces')
          .insert({ name, created_by: actorId }).select('id, name').single()
        if (workspaceError) throw workspaceError
        const { error: membershipError } = await admin.from('workspace_memberships').insert({
          workspace_id: workspace.id, user_id: actorId, email: authData.user.email ?? null,
          display_name: getDisplayName(authData.user), role: 'admin', status: 'active', is_default: true,
        })
        if (membershipError) {
          await admin.from('workspaces').delete().eq('id', workspace.id)
          throw membershipError
        }
        return json({ workspace: { workspaceId: workspace.id, name: workspace.name, role: 'admin', isDefault: true } })
      }

      if (action === 'join-workspace') {
        const code = typeof body.code === 'string' ? body.code : ''
        const codeHash = await hashJoinCode(code)
        if (!codeHash) return json({ error: 'Enter a valid workspace join code.' }, 400)
        const { data: joinCode, error: codeError } = await admin.from('workspace_join_codes')
          .select('id, workspace_id, expires_at, revoked_at')
          .eq('code_hash', codeHash).maybeSingle()
        if (codeError) throw codeError
        if (!joinCode || joinCode.revoked_at || Date.parse(joinCode.expires_at) <= Date.now()) {
          return json({ error: 'This join code is invalid or has expired.' }, 404)
        }
        const { data: existingMembership, error: existingError } = await admin.from('workspace_memberships')
          .select('id, status').eq('workspace_id', joinCode.workspace_id).eq('user_id', actorId).maybeSingle()
        if (existingError) throw existingError
        if (existingMembership?.status === 'active') return json({ error: 'You already belong to this workspace.' }, 409)
        if (existingMembership?.status === 'disabled') return json({ error: 'Your access to this workspace is disabled. Contact an admin.' }, 403)

        const email = authData.user.email?.trim().toLowerCase() ?? ''
        const displayName = getDisplayName(authData.user)
        const { data: activeMemberships, error: activeError } = await admin.from('workspace_memberships')
          .select('id, is_default').eq('user_id', actorId).eq('status', 'active')
        if (activeError) throw activeError
        const isDefault = !activeMemberships?.some((membership: { is_default: boolean }) => membership.is_default)
        const pending = email ? await admin.from('workspace_memberships').select('id')
          .eq('workspace_id', joinCode.workspace_id).eq('email', email).eq('status', 'invited').maybeSingle() : { data: null, error: null }
        if (pending.error) throw pending.error
        if (pending.data) {
          const { error } = await admin.from('workspace_memberships').update({ user_id: actorId, email, display_name: displayName, status: 'active', is_default: isDefault, updated_at: new Date().toISOString() }).eq('id', pending.data.id)
          if (error) throw error
        } else {
          const { error } = await admin.from('workspace_memberships').insert({ workspace_id: joinCode.workspace_id, user_id: actorId, email, display_name: displayName, role: 'member', status: 'active', is_default: isDefault })
          if (error) throw error
        }
        return json({ success: true })
      }

      const workspaceId = typeof body.workspaceId === 'string' ? body.workspaceId : ''
      if (!workspaceId) return json({ error: 'Choose a workspace first.' }, 400)
      if (!isUuid(workspaceId)) return json({ error: 'The selected workspace ID is invalid. Refresh the page and choose a workspace again.' }, 400)

      const { data: actorMembership, error: actorError } = await admin
        .from('workspace_memberships')
        .select('id, role, status')
        .eq('workspace_id', workspaceId)
        .eq('user_id', actorId)
        .maybeSingle()
      if (actorError) throw actorError
      if (!actorMembership || actorMembership.status !== 'active') {
        return json({ error: 'You are not an active member of this workspace.' }, 403)
      }

      if (action === 'list-members') {
        const { data, error } = await admin
          .from('workspace_memberships')
          .select('id, workspace_id, user_id, email, display_name, role, status, is_default, created_at')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: true })
        if (error) throw error
        return json({ members: data, canManage: actorMembership.role === 'admin' })
      }

      if (actorMembership.role !== 'admin') return json({ error: 'Only workspace admins can manage members.' }, 403)

      if (action === 'list-join-codes') {
        const { data, error } = await admin.from('workspace_join_codes')
          .select('id, workspace_id, expires_at, created_at, revoked_at')
          .eq('workspace_id', workspaceId).order('created_at', { ascending: false })
        if (error) throw error
        return json({ joinCodes: data })
      }

      if (action === 'create-join-code') {
        const expiresInDays = body.expiresInDays
        if (expiresInDays !== 1 && expiresInDays !== 7 && expiresInDays !== 30) {
          return json({ error: 'Choose an expiration of 1, 7, or 30 days.' }, 400)
        }
        const code = createJoinCode()
        const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        const { data, error } = await admin.from('workspace_join_codes')
          .insert({ workspace_id: workspaceId, code_hash: await hashJoinCode(code), created_by: actorId, expires_at: expiresAt })
          .select('id, workspace_id, expires_at, created_at').single()
        if (error) throw error
        return json({ joinCode: { ...data, code } })
      }

      if (action === 'revoke-join-code') {
        const codeId = typeof body.codeId === 'string' ? body.codeId : ''
        if (!isUuid(codeId)) return json({ error: 'Choose a valid join code.' }, 400)
        const { data, error } = await admin.from('workspace_join_codes')
          .update({ revoked_at: new Date().toISOString() }).eq('id', codeId).eq('workspace_id', workspaceId)
          .is('revoked_at', null).select('id').maybeSingle()
        if (error) throw error
        if (!data) return json({ error: 'This join code is no longer active.' }, 404)
        return json({ success: true })
      }

      if (action === 'invite') {
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
        const role = parseRole(body.role)
        if (!isValidEmail(email)) return json({ error: 'Enter a valid email address.' }, 400)
        if (!role) return json({ error: 'Choose either admin or member.' }, 400)

        const { data: duplicate, error: duplicateError } = await admin
          .from('workspace_memberships')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('email', email)
          .maybeSingle()
        if (duplicateError) throw duplicateError
        if (duplicate) return json({ error: 'This email already belongs to the workspace.' }, 409)

        const existingUser = await findUserByEmail(admin, email)
        let invitedUserId: string | null = null
        if (!existingUser) {
          const redirectTo = Deno.env.get('APP_BASE_URL')
          const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
            ...(redirectTo ? { redirectTo } : {}),
          })
          if (inviteError) throw inviteError
          invitedUserId = inviteData.user?.id ?? null
        }

        const { data: created, error: createError } = await admin
          .from('workspace_memberships')
          .insert({
            workspace_id: workspaceId,
            user_id: existingUser?.id ?? invitedUserId,
            email,
            display_name: getDisplayName(existingUser),
            role,
            status: existingUser ? 'active' : 'invited',
            is_default: false,
          })
          .select('id, workspace_id, user_id, email, display_name, role, status, is_default, created_at')
          .single()
        if (createError) throw createError
        return json({ member: created })
      }

      const memberId = typeof body.memberId === 'string' ? body.memberId : ''
      if (!memberId) return json({ error: 'Choose a workspace member.' }, 400)
      if (!isUuid(memberId)) return json({ error: 'The selected member ID is invalid. Refresh the page and try again.' }, 400)
      const { data: target, error: targetError } = await admin
        .from('workspace_memberships')
        .select('id, role, status, workspace_id')
        .eq('id', memberId)
        .eq('workspace_id', workspaceId)
        .maybeSingle()
      if (targetError) throw targetError
      if (!target) return json({ error: 'That member is no longer in this workspace.' }, 404)

      if (action === 'set-role') {
        const role = parseRole(body.role)
        if (!role) return json({ error: 'Choose either admin or member.' }, 400)
        if (target.role === 'admin' && target.status === 'active' && role !== 'admin') {
          const adminCount = await countActiveAdmins(admin, workspaceId)
          if (adminCount <= 1) return json({ error: 'A workspace must have at least one active admin.' }, 409)
        }
        const { error } = await admin.from('workspace_memberships').update({ role, updated_at: new Date().toISOString() }).eq('id', memberId)
        if (error) throw error
        return json({ success: true })
      }

      if (action === 'set-status') {
        const status = body.status === 'active' || body.status === 'disabled' ? body.status as MemberStatus : null
        if (!status) return json({ error: 'Choose active or disabled.' }, 400)
        if (target.role === 'admin' && target.status === 'active' && status !== 'active') {
          const adminCount = await countActiveAdmins(admin, workspaceId)
          if (adminCount <= 1) return json({ error: 'A workspace must have at least one active admin.' }, 409)
        }
        const { error } = await admin.from('workspace_memberships').update({ status, updated_at: new Date().toISOString() }).eq('id', memberId)
        if (error) throw error
        return json({ success: true })
      }

      if (action === 'remove') {
        if (target.role === 'admin' && target.status === 'active') {
          const adminCount = await countActiveAdmins(admin, workspaceId)
          if (adminCount <= 1) return json({ error: 'A workspace must have at least one active admin.' }, 409)
        }
        const { error } = await admin.from('workspace_memberships').delete().eq('id', memberId)
        if (error) throw error
        return json({ success: true })
      }

      return json({ error: 'Unknown workspace member action.' }, 400)
    } catch (error) {
      console.error('Workspace member operation failed:', error)
      return json({ error: error instanceof Error ? error.message : 'Workspace member operation failed.' }, 500)
    }
  }),
}

async function resolveUserWorkspaces(admin: SupabaseClient<Database>, user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const email = user.email?.trim().toLowerCase() ?? ''
  const { data: pendingInvites, error: pendingError } = await admin
    .from('workspace_memberships')
    .select('id, workspace_id')
    .eq('email', email)
    .eq('status', 'invited')
  if (pendingError) throw pendingError

  if (pendingInvites?.length) {
    const { count, error: countError } = await admin
      .from('workspace_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')
    if (countError) throw countError
    for (const [index, invitation] of pendingInvites.entries()) {
      const { error } = await admin.from('workspace_memberships').update({
        user_id: user.id,
        status: 'active',
        is_default: !count && index === 0,
        display_name: getDisplayName(user),
        updated_at: new Date().toISOString(),
      }).eq('id', invitation.id)
      if (error) throw error
    }
  }

  const { data: memberships, error: membershipError } = await admin
    .from('workspace_memberships')
    .select('workspace_id, role, is_default, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('is_default', { ascending: false })
  if (membershipError) throw membershipError

  if (!memberships?.length) {
    const { data: prior, error: priorError } = await admin
      .from('workspace_memberships')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
    if (priorError) throw priorError
    if (prior?.length) throw new Error('Workspace access is disabled. Contact a workspace admin.')

    return []
  }

  const workspaceIds = memberships.map((membership) => membership.workspace_id)
  const { data: workspaceRows, error: workspaceError } = await admin
    .from('workspaces')
    .select('id, name')
    .in('id', workspaceIds)
  if (workspaceError) throw workspaceError
  const workspaceNames = new Map((workspaceRows ?? []).map((workspace) => [workspace.id, workspace.name]))

  if (!memberships.some((membership) => membership.is_default)) {
    const { error: defaultError } = await admin.from('workspace_memberships')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('workspace_id', memberships[0].workspace_id)
      .eq('user_id', user.id)
    if (defaultError) throw defaultError
    memberships[0].is_default = true
  }

  return memberships.map((membership) => ({
    workspaceId: membership.workspace_id,
    name: workspaceNames.get(membership.workspace_id),
    role: membership.role as Role,
    isDefault: membership.is_default,
  }))
}

async function findUserByEmail(admin: SupabaseClient<Database>, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const match = data.users.find((user: { email?: string }) => user.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < 1000) break
  }
  return null
}

async function countActiveAdmins(admin: SupabaseClient<Database>, workspaceId: string) {
  const { count, error } = await admin.from('workspace_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('role', 'admin')
    .eq('status', 'active')
  if (error) throw error
  return count ?? 0
}

function parseRole(value: unknown): Role | null { return value === 'admin' || value === 'member' ? value : null }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) }
function isValidEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }
function createJoinCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join('')
  return `PD-${value.match(/.{4}/g)!.join('-')}`
}
async function hashJoinCode(code: string) {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^PD[A-F0-9]{24}$/.test(normalized)) return ''
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
function getDisplayName(user: { email?: string; user_metadata?: Record<string, unknown> } | null) {
  if (!user) return ''
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name
  return typeof name === 'string' ? name.trim().slice(0, 60) : user.email?.split('@')[0] ?? ''
}
