import enApplications from '@/locales/en/applications.json'
import enAuth from '@/locales/en/auth.json'
import enCommon from '@/locales/en/common.json'
import viApplications from '@/locales/vi/applications.json'
import viAuth from '@/locales/vi/auth.json'
import viCommon from '@/locales/vi/common.json'

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'vi'

export const NAMESPACES = ['common', 'auth', 'applications'] as const
export const DEFAULT_NS = 'common'

/** Vietnamese is the source language: its files define the keys every other language must have. */
export const resources = {
  vi: { common: viCommon, auth: viAuth, applications: viApplications },
  en: { common: enCommon, auth: enAuth, applications: enApplications },
} as const
