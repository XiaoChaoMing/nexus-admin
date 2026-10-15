import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMessage } from '@/i18n/messages'
import { AUDIT_ACTIONS, RESOURCE_TYPES } from '@/features/audit/types'

const known = (list: readonly string[], value: string) => list.includes(value)
const ROLES = ['OWNER', 'MODERATOR', 'ADMIN', 'USER', 'SYSTEM']

/** Labels of audit codes; codes this console does not know yet (new services) are shown as sent. */
export function useAuditLabels() {
  useTranslation('audit')
  const msg = useMessage()

  return {
    action: useCallback((a: string) => (known(AUDIT_ACTIONS, a) ? (msg(`audit:action.${a}`) ?? a) : a), [msg]),
    resourceType: useCallback((r: string) => (known(RESOURCE_TYPES, r) ? (msg(`audit:resourceType.${r}`) ?? r) : r), [msg]),
    role: useCallback((r: string) => (known(ROLES, r) ? (msg(`audit:role.${r}`) ?? r) : r), [msg]),
  }
}
