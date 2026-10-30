# hctv redesign notes

Notes from walking through the Nuxt app at `localhost:3000` (home, `/ethan`, channel settings,
follows, bot accounts, user menu). First what looks broken, then a proposed direction.

## What reads as jank today

### Outright bugs

- **Navbar avatar fallback prints the pfp URL.** `NavBar.vue:81` renders
  `<AvatarFallback>{{ user.pfpUrl }}</AvatarFallback>`, so before the image loads (and on every
  navigation) the top-right shows clipped text like `k.sh/u…`. Should be the initial, like the
  dropdown header does.
- **Stream info avatar has no fallback.** `UserInfoCard.vue:21` has no `AvatarFallback`, so it's an
  empty gap next to the title until the image arrives.
- **Channel settings shows "E" instead of the pfp** even though the channel has one.
- **Bot card date renders empty**: the calendar icon sits next to nothing
  (`pages/settings/bot/index.vue:59`, the `ClientOnly` date).
- **Offline channel looks like a broken player.** `/ethan` while offline is a full-height black
  box with live controls (play, volume, refresh, fullscreen) and nothing explaining the channel
  is offline. It's the state viewers will see most often.

### Color

- Everything is hue 350 at low saturation: background, borders, muted text, cards, inputs. In
  dark mode it lands on a muddy plum-brown where nothing separates: the sidebar, navbar, page and
  cards are within a few % lightness of each other, borders are pinkish-brown lines.
- Pink is used for everything: primary buttons, links, chat usernames, follower icons, focus
  rings, slider fill, counter pills, selected tabs. So "live" has no color of its own; the red
  LIVE pill on cards is a different red from the pink UI.
- Light mode is a pale pink wash with rose text. Same problem in reverse.

### Layout and hierarchy

- **Home is empty when nobody's live (most of the time).** A small dino and a button float at the
  top, then offline channels are 44px avatars in a carousel with arrows pinned at the far edges of
  a 1300px row. Everything below is blank.
- **The sidebar duplicates the home page** (live / 24/7 / offline in both places), and when
  collapsed it shows stray separator lines with nothing between them.
- The navbar's "Edit Livestream" button shows on every page, including settings.
- Stream page: title/description block is a fixed `md:h-48` strip under the player; long
  descriptions scroll inside a tiny box. Chat column has no header and the empty top half is dead
  space.
- Settings: card-inside-card-inside-page, the tab bar is a pink-tinted pill, inputs and the
  textarea are the same tint as the card, so fields don't read as fields.
- Type is all 12–14px with very little scale. Page titles ("Bot Accounts", "ethan") are the only
  large text. Sidebar labels are tiny ALL CAPS.
- Radii are all over the place: `rounded-md` 43×, `rounded-lg` 36×, `rounded-xl` 10×, `rounded-sm`,
  `rounded-xs`, `rounded-3xl`. Cards, buttons, pills, tabs and menus don't share a logic.
- Effects that add noise: `shadow-md` on the fixed navbar, `hover:scale-105` on the logo,
  `scale(1.1)` + pink fill on player controls, a pulsing dot on every live pill.

## Direction

hctv is where Hack Club teenagers stream themselves building things. Its real neighbors are
Twitch and YouTube Live, but it should feel like Hack Club: a bit handmade (the dino), friendly,
and focused on the work on screen rather than on the chrome around it.

The idea: **the UI is quiet and neutral; red means "on air."** Like a tally light on a studio
camera, red only shows up when someone is broadcasting. That gives the live state, which is the
thing people come here for, the strongest signal on the page, and fixes the pink-everywhere
problem at the root.

### Palette

Built from Hack Club's own palette instead of a rose tint, so it stays on-brand.

| Token        | Dark      | Light     | Use                                                    |
| ------------ | --------- | --------- | ------------------------------------------------------ |
| `background` | `#17171d` | `#f9fafc` | page                                                   |
| `mantle`     | `#121217` | `#ffffff` | navbar, sidebar, chat column (recessed surfaces)       |
| `card`       | `#1f2029` | `#ffffff` | cards, inputs, popovers (raised surfaces)              |
| `border`     | `#2c2e3a` | `#e0e6ed` | hairlines                                              |
| `muted-fg`   | `#8492a6` | `#5b6678` | secondary text                                         |
| `foreground` | `#e8ecf2` | `#1f2d3d` | text                                                   |
| `live`       | `#ec3750` | `#ec3750` | live badges, "Go live", on-air ring on avatars. Only.  |
| `primary`    | `#e8ecf2` | `#1f2d3d` | primary buttons are ink-on-paper (inverted foreground) |
| `link`       | `#5bc0de` | `#338eda` | links, focus ring, slider fill                         |

- Primary buttons become the inverted foreground (white button in dark, ink button in light). Red
  is reserved for going live and live state, destructive actions use a separate darker red only in
  confirm dialogs.
- Chat usernames get a stable color per user from Hack Club's secondary colors (orange `#ff8c37`,
  yellow `#f1c40f`, green `#33d6a6`, cyan `#5bc0de`, blue `#338eda`, purple `#a633d6`) instead of
  all being pink. That makes chat readable at a glance.
- Surfaces separate by lightness, not by borders: mantle is darker than the page, cards are
  lighter. Fewer borders overall.

### Type

Keep **Phantom Sans** as the only family. It's Hack Club's and it's already the right voice; the
problem is scale, not the typeface.

- Scale: 13 / 15 / 18 / 24 / 32. Body 15px (up from 14), meta 13px. Stream titles on cards 15px
  bold, on the stream page 24px bold, home section headings 18px bold.
- Drop the uppercase sidebar labels; use sentence-case 13px muted ("Live", "Offline").
- Numbers (viewers, followers, uptime) use `tabular-nums` so they don't jitter as they update.

### Shape

- Two radii: **12px** for containers (cards, player, dialogs, menus) and **full** for things you
  press or that represent a person (buttons, pills, avatars). Inputs use 12px. No `rounded-sm`/`xs`/`3xl`.
- One shadow, used only on things that float (menus, popovers, dialogs). Remove the navbar
  shadow and card hover shadows; hover on cards is a 1px lighter border and the thumbnail
  brightening slightly.

### The one bold thing: the live state

- A live avatar gets a 2px red ring with a small gap (`ring-2 ring-live ring-offset-2
  ring-offset-background`), everywhere avatars appear: sidebar, cards, stream page, chat. You can
  see who's on air without reading a single label.
- The LIVE pill is solid red with white text, sentence case ("Live"), no pulsing dot. One static
  red pill reads stronger than a blinking one.
- "Go live" in the navbar is the only red button in the app.

## Per-surface changes

### Navbar

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [≡] [h] hackclub.tv                          [● Go live]   (avatar)       │
└──────────────────────────────────────────────────────────────────────────┘
```

- Sidebar toggle first, then logo + wordmark. No logo hover scale.
- `bg-mantle`, bottom hairline, no shadow. Height 56px everywhere.
- "Edit livestream" moves to the stream page next to the title (only for owners/managers).
- Fix the avatar fallback.
- User menu: drop the "Manage your account" subtitle, merge GitHub/Sponsor into the bottom row
  with the version string, use plain foreground hover instead of pink.

### Sidebar

- Rename to "Following" when signed in, falling back to "Live" for signed-out users. Home already
  lists every channel, so the sidebar should be the personal shortcut list.
- Each row: avatar (red ring if live), name, and either the stream title (live) or "Offline".
  Viewer count on the right for live rows.
- Collapsed: just the avatar column, no separators.
- Empty state: "Follow a channel to see it here," not just a blank group.

### Home

When people are live:

```
Live now (3)
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  thumbnail    │ │  thumbnail    │ │  thumbnail    │
│ [Live]   12 👁 │ │               │ │               │
└───────────────┘ └───────────────┘ └───────────────┘
(●) Building a keyboard firmware
    ethan · Hardware
```

- Cards lose the bordered box. Thumbnail (12px radius) with the meta below on the page
  background, like YouTube/Twitch. Removes the card-in-a-card look.
- Remove `max-w-sm` on cards so the grid fills its columns evenly.
- 24/7 channels get a smaller row below with "24/7" in place of "Live".

When nobody's live (the common case, so it gets real design):

```
         (dino)
   Nobody's streaming right now
   Channels you follow will show up here when they go live.
   [Go live]   [Browse channels]

Channels
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│ (av)  ethan          │ │ (av)  orpheus        │ │ (av)  …              │
│       Last live 2d   │ │       Last live 3w   │ │                      │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

- Replace the avatar carousel with a wrapping grid of channel tiles (avatar, name, follower count;
  "last live" would need a new timestamp, since the schema only has `startedAt`
  on StreamInfo). Easier to scan, no edge arrows, works on mobile without a carousel.
- Center the empty-state block vertically in the first viewport instead of leaving the bottom
  two-thirds blank.

### Stream page

- **Offline state:** replace the black player with the channel's offline card: blurred
  avatar/thumbnail background, "ethan is offline", last live date, and a Follow button. Hide the
  player controls entirely until there's a stream.
- Info block below the player: avatar (with live ring), title 24px, channel name + follower
  count on one line, then actions on the right: Follow (primary), Edit livestream (owners), share.
  Viewers and uptime sit as a small meta row under the title, `tabular-nums`.
- Description is in a "About ethan" section that flows with the page (the column scrolls), not a
  fixed 192px box.
- Chat: add a slim header ("Chat" + viewer count + settings), stack messages from the bottom,
  colored usernames, 15px text. Input is a full-radius field with the send button inside it.
- Player controls: no scale-on-hover, no pink fill. White icons, subtle `white/10` hover
  background, `link` color for the volume slider fill.

### Settings

- One container, not three: page title, then tabs as an underline row (not a pink pill), then
  sections separated by spacing and a hairline.
- Inputs on `card` color with a visible border so they read as fields against the page.
- Two-column rows for settings that are a label + control (24/7 toggle, notifications), so the
  switch isn't floating far right of its label.
- "Save changes" sticks to the bottom of the section when there are unsaved changes, disabled
  otherwise.
- Bot accounts: list rows instead of mostly empty cards; fix the empty date.

### Motion

- Keep: sidebar collapse, menu/dialog open, toast.
- Remove: logo hover scale, control button scale, card hover shadow, pulsing live dot.
- The one moment: when a channel you're watching goes live, the offline card cross-fades into
  the player.

## Implementation order

1. Bug fixes listed at the top (small, independent).
2. Token swap in `app/assets/css/tailwind.css`: new palette, add `--live` and `--link`, set
   `--radius: 0.75rem`, collapse radius usages to `rounded-xl` / `rounded-full`. This alone fixes
   most of the muddy look.
3. Live ring + live pill as shared components; apply in sidebar, cards, stream page, chat.
4. Home empty state + channel tile grid.
5. Stream page offline state, info block, chat header/colors.
6. Settings layout.
