import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = path.join(root, 'apps', 'backend')
const isWindows = process.platform === 'win32'
const python = path.join(backend, '.venv', isWindows ? 'Scripts' : 'bin', isWindows ? 'python.exe' : 'python')
const mode = process.argv[2] === 'run' ? 'run' : 'dev'
const args = ['-m', 'uvicorn', 'policydesk_api.main:app', '--app-dir', 'src']
if (mode === 'dev') args.push('--reload')

const child = spawn(python, args, { cwd: backend, stdio: 'inherit', shell: false })
child.on('error', (error) => {
  console.error(`Could not start the backend. Run "pnpm install:all" first. ${error.message}`)
  process.exitCode = 1
})
child.on('exit', (code) => { process.exitCode = code ?? 1 })
