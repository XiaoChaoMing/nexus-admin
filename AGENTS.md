# AGENTS.md — nexuslive-admin

Admin console of NexusLive (separate from `nexuslive-web`, see README "Vì sao là một app riêng").

## Rules

- **No new dependencies** without asking. The stack and version ranges mirror `nexuslive-web/package.json`.
- Code, identifiers and comments in **English**; UI copy in **Vietnamese** by default.
- Every UI string goes through i18n: add the key to `src/locales/vi/*.json` first, then `en` (both are required, tests check parity).
  Outside components return a `"ns:path"` key and translate with `useMessage()`.
- Server data lives in TanStack Query; Zustand holds the session only. The access token never touches storage.
- `POST /v1/auth/refresh` and `/v1/auth/logout` must send `X-NXL-Client: admin` (`CLIENT_HEADER` in `src/lib/api-client.ts`).
- Admin checks in the UI are a convenience; identity enforces `ADMIN` on `/v1/admin/**`. Never rely on the UI gate for security.
- Components in `src/components/ui/` are copied from `nexuslive-web` (README "UI dùng chung"): keep them in sync, note the copy date.
- Obsidian Pulse: tokens from `src/styles/tokens.css`, no shadows or decorative blur, colour is never the only cue.
- Accessibility: keyboard reachable rows and controls, labelled icon buttons, focus kept inside dialogs.
- API contracts come from the TSD/specs listed in the README; do not invent fields or codes.

## Before reporting done

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Run `pnpm e2e` when the backend stack is up (needs Mailpit and the dev seed admin).
