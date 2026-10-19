import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = path.join(root, 'apps', 'backend')
const environment = path.join(backend, '.venv')
const isWindows = process.platform === 'win32'
const python = isWindows ? 'python' : 'python3'
const createVenv = ['-m', 'venv', environment]

run(python, createVenv, root)

const environmentPython = path.join(environment, isWindows ? 'Scripts' : 'bin', isWindows ? 'python.exe' : 'python')
run(environmentPython, ['-m', 'pip', 'install', '-e', backend], root)

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false })
  if (result.error) {
    console.error(`Could not run ${command}: ${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}
