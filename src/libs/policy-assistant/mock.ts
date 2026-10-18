import type { PolicyDraftInput } from '@/libs/policies'

const policyTitles: Array<[RegExp, string]> = [
  [/security incident|incident response|incident handling/i, 'Security Incident Response'],
  [/accessible|accessibility|wcag/i, 'Accessibility Standards'],
  [/customer data|personal data|privacy|gdpr/i, 'Customer Data Handling'],
  [/secure code|code review/i, 'Secure Code Review'],
  [/production deployment|release management|software release/i, 'Release Management'],
]

export function generateMockPolicy(prompt: string): PolicyDraftInput {
  const cleanPrompt = prompt.trim().replace(/\s+/g, ' ')
  const topic = cleanPrompt.split(/[.!?]/)[0].replace(/^(?:please\s+)?(?:(?:create|draft|write)\s+)?(?:(?:a|an|the)\s+)?(?:(?:policy|process|guidelines?|standard|rules?)\s+(?:for|on|about|to)\s+)?/i, '').trim()
  const knownTitle = policyTitles.find(([pattern]) => pattern.test(cleanPrompt))?.[1]
  const titleTopic = knownTitle || (topic.length > 42 ? `${topic.slice(0, 39).trimEnd()}…` : topic)
  const name = `${titleTopic.charAt(0).toLocaleUpperCase()}${titleTopic.slice(1).replace(/[,:;]+$/, '')} policy`.replace(/\s+/g, ' ').slice(0, 80)
  return {
    name,
    description: `This policy establishes a consistent approach to ${topic.toLocaleLowerCase().replace(/[.!?]+$/, '')}. It sets clear expectations, assigns ownership, and provides a consistent basis for review.`,
    labels: [], status: 'draft', effectiveFrom: null, effectiveUntil: null,
  }
}

