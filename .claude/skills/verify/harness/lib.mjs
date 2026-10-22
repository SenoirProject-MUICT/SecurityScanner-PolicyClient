// Shared Playwright harness for Policy Desk journeys. Drives the system Google Chrome
// against the stack recorded by scripts/up.sh, and writes evidence that down.sh keeps.
import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

export function readStackEnv() {
  const file = path.join(root, '.verify/run/env')
  const lines = readFileSync(file, 'utf8').trim().split('\n')
  return Object.fromEntries(lines.map((line) => line.split(/=(.*)/s).slice(0, 2)))
}

/** Opens a fresh browser context (empty localStorage, so no stale session) and an evidence dir. */
export async function openApp(journey) {
  const env = readStackEnv()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const evidenceDir = path.join(root, '.verify/evidence', `${stamp}-${journey}`)
  mkdirSync(evidenceDir, { recursive: true })
  const log = (file, line) => appendFileSync(path.join(evidenceDir, file), `${line}\n`)

  const browser = await chromium.launch({ channel: 'chrome', headless: process.env.VERIFY_HEADED !== '1' })
  const context = await browser.newContext({ baseURL: env.VERIFY_WEB_URL, viewport: { width: 1440, height: 900 } })
  await context.tracing.start({ screenshots: true, snapshots: true })
  const page = await context.newPage()
  page.on('console', (message) => log('console.log', `[${message.type()}] ${message.text()}`))
  page.on('pageerror', (error) => log('console.log', `[pageerror] ${error.message}`))
  page.on('response', (response) => {
    if (response.url().startsWith(env.VERIFY_API_URL)) log('network.log', `${response.request().method()} ${response.status()} ${response.url()}`)
  })

  let step = 0
  async function shot(name) {
    step += 1
    const file = path.join(evidenceDir, `${String(step).padStart(2, '0')}-${name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    log('steps.log', `${String(step).padStart(2, '0')} ${name} ${page.url()}`)
  }
  async function close() {
    await context.tracing.stop({ path: path.join(evidenceDir, 'trace.zip') })
    await browser.close()
  }
  return { page, env, evidenceDir, shot, close, record: (name, value) => writeFileSync(path.join(evidenceDir, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2)) }
}

/** Runs SQL against the local Supabase database only. */
export function sql(query) {
  return execFileSync('docker', ['exec', 'supabase_db_policies-client', 'psql', '-U', 'postgres', '-tA', '-F', '\t', '-c', query], { encoding: 'utf8' }).trim()
}

export function uniqueUser(prefix = 'verify') {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return { name: `Verify ${id}`, email: `${prefix}-${id}@example.com`, password: 'verify-password-123' }
}

/** Login page → "Create an account" → lands on workspace setup ("Where should we take you?"). */
export async function signUp(page, user) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Your name').fill(user.name)
  await page.getByLabel('Email address').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByRole('heading', { name: 'Where should we take you?' }).waitFor()
}

export async function signIn(page, user) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** From workspace setup, creates a workspace, enters it from the picker, and returns its id from the URL. */
export async function createWorkspace(page, name) {
  await page.getByRole('button', { name: /Create a workspace/ }).click()
  await page.getByLabel('Workspace name').fill(name)
  await page.getByRole('button', { name: 'Create workspace' }).click()
  // Creating does not enter the workspace: the app lands on the "Choose a workspace" picker.
  await page.getByRole('heading', { name: 'Choose a workspace' }).waitFor()
  await page.getByRole('button').filter({ hasText: name }).click()
  await page.waitForURL(/\/[0-9a-f-]{36}\/?$/)
  return new URL(page.url()).pathname.split('/')[1]
}

export function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

/** Wraps a journey so failures still leave a final screenshot and trace. */
export async function runJourney(name, body) {
  const app = await openApp(name)
  try {
    await body(app)
    app.record('RESULT', 'PASS\n')
    console.log(`PASS ${name} evidence=${app.evidenceDir}`)
  } catch (error) {
    await app.shot('failure').catch(() => {})
    app.record('RESULT', `FAIL\n${error.stack}\n`)
    console.error(`FAIL ${name} evidence=${app.evidenceDir}\n${error.stack}`)
    process.exitCode = 1
  } finally {
    await app.close()
  }
}
