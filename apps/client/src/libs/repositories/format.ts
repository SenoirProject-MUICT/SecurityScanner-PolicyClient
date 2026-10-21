import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function formatRelative(timestamp: string) { return dayjs(timestamp).fromNow() }
export function shortSha(sha: string) { return sha.slice(0, 7) }
