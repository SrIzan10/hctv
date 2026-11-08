# Next -> Nuxt port: conventions

Source of truth for behaviour: `apps/web/src` (Next) and `apps/chat` (done). Port 1:1, don't redesign.

- **URLs stay identical.** Next `app/**/route.ts` -> `server/api/**/<name>.<method>.ts` (or `server/routes` when
  the path is not under /api). External clients (SDK, OBS, mediamtx webhooks) depend on them.
- **Server actions** -> `server/api/actions/<actionName>.post.ts`, JSON body, same `{ success, error | data }`
  result. Validate with `zodVerify` (server/utils, auto-imported) and schemas in `shared/schemas/forms.ts`.
  `revalidatePath` is gone: client calls `refreshNuxtData()` after mutating.
- **Auth:** `validateRequest()` (no args, uses nitro asyncContext), `requireUser(event)`, `requireAdmin(event)`.
  Throw `createError({ statusCode })` for 4xx. Files in `server/utils/*.ts` (top level) are auto-imported.
  Nested dirs are not: import explicitly.
- **Env:** server `process.env`; browser `getEnv('NEXT_PUBLIC_X')` from `shared/utils/env.ts` (window.__ENV).
- **Client:** Vue 3 `<script setup lang="ts">`, shadcn-vue in `app/components/ui` (already installed; add more
  with `pnpm ui:add`), icons from `@lucide/vue`, toasts via `vue-sonner`, data via `useFetch`/`$fetch`,
  query-string state via VueUse `useRouteQuery`-style `useRoute().query`, no Prisma in `app/`.
- **Imports:** `~/` = app/, `~~/` = project root, `#shared` / `~~/shared` for shared/.
- **Style:** Prettier (2 spaces, single quotes, semicolons, 100 cols). `pnpm --filter=@hctv/web-nuxt check-types`
  must stay clean.

## Cross-area contracts (so parallel workers agree)

**Actions call convention.** `POST /api/actions/<exportedFunctionName>` with a JSON body. Form actions
(`(prev, formData)`) take the form fields as the JSON object; plain-arg actions take named fields, e.g.
`addChannelManager(channelId, userChannel)` -> `{ channelId, userChannel }`. Always return the original
`{ success: boolean, error?, data? }` shape with HTTP 200 (validation failures are `success: false`);
401/403 only for auth. Client helper: `callAction(name, body)` in `app/lib/actions.ts` (owned by the app-shell area).

**Component ownership & import paths** (React `Foo.tsx` -> `Foo.vue`, same dir under `app/components/app/`;
props -> Vue props, callback props -> emits, children -> slots; keep prop names/semantics):
- app-shell area: NavBar, Sidebar, ThemeSwitcher, SubmitButton, UniversalForm (+types.ts), UserCombobox,
  BotCombobox, ChannelSelect, SonnerNewVersion, LandingPage; `app/components/ui/confuseddino`,
  `ui/channel-desc-fancy-area`; composables; layouts; route middleware.
- stream area: ChatPanel(+EmojiSearch, message), Livestream, StreamPlayer, StreamGrid, UserInfoCard(+parts),
  EditLivestream, RegenerateKey.
- settings/admin area: only pages under `app/pages/settings`, `app/pages/admin` and their local components.

**Composables** (app-shell area writes them in `app/composables/`, everyone else imports by auto-import):
`useUser()` -> `{ user: Ref<User|null>, refresh }`, `useConfirm()` -> `confirm({title, description, ...}) => Promise<boolean>`
(mirror `@omit/react-confirm-dialog` usage in the Next code), `useIsMobile()`, `useFullscreen()`,
`useUserList` (port of lib/hooks/useUserList), `useChannelStreamKey`, `useScreensharePublisher`,
`useStreamInfo` (replaces StreamInfoProvider). SWR usage -> `useFetch`/`useAsyncData` with `refresh`.

**Pages** live in `app/pages` mirroring the Next route groups: `(ui)` -> `layouts/default.vue`,
`(other)` -> `layouts/bare.vue`; `(protected)` -> `definePageMeta({ middleware: 'protected' })`.
Dynamic segments `[username].vue`. Next `page.tsx` + `page.client.tsx` pairs become one `.vue` page.

**Do NOT** run `pnpm add`/`pnpm install` (concurrent installs corrupt the lockfile); if you need a package, say so
in your final report and use what is installed. Do not edit files outside your area except to fix a type error you
caused. Do not commit. Verify with `pnpm --filter=@hctv/web-nuxt check-types` and read only errors in your files
(other areas are mid-flight).
