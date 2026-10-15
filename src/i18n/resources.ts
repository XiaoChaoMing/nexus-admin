import enApplications from '@/locales/en/applications.json'
import enAudit from '@/locales/en/audit.json'
import enAuth from '@/locales/en/auth.json'
import enChannels from '@/locales/en/channels.json'
import enCommon from '@/locales/en/common.json'
import enReports from '@/locales/en/reports.json'
import enStreams from '@/locales/en/streams.json'
import enUsers from '@/locales/en/users.json'
import viApplications from '@/locales/vi/applications.json'
import viAudit from '@/locales/vi/audit.json'
import viAuth from '@/locales/vi/auth.json'
import viChannels from '@/locales/vi/channels.json'
import viCommon from '@/locales/vi/common.json'
import viReports from '@/locales/vi/reports.json'
import viStreams from '@/locales/vi/streams.json'
import viUsers from '@/locales/vi/users.json'

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'vi'

export const NAMESPACES = ['common', 'auth', 'applications', 'reports', 'users', 'channels', 'streams', 'audit'] as const
export const DEFAULT_NS = 'common'

/** Vietnamese is the source language: its files define the keys every other language must have. */
export const resources = {
  vi: {
    common: viCommon,
    auth: viAuth,
    applications: viApplications,
    reports: viReports,
    users: viUsers,
    channels: viChannels,
    streams: viStreams,
    audit: viAudit,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    applications: enApplications,
    reports: enReports,
    users: enUsers,
    channels: enChannels,
    streams: enStreams,
    audit: enAudit,
  },
} as const
