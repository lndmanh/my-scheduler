# Scheduler Page Redesign — Design

**Date:** 2026-08-12
**Target:** `app/pages/scheduler/[id].vue` and the scheduler component family
**Status:** Approved design, pending implementation plan

## Goal

Redesign the schedule detail page so the timetable — the thing users actually came for — owns the
viewport, reads at a glance, and works on a phone. Today the grid starts roughly 500px down the
page, every course card is the same neutral grey, and six unwrapped toolbar buttons overflow on
anything narrower than a desktop.

## Scope

In scope:

- `app/pages/scheduler/[id].vue`
- `app/components/scheduler/SchedulerGrid.vue`
- `app/components/scheduler/CourseCard.vue`
- `app/components/scheduler/DayToggle.vue`
- `app/components/scheduler/SessionConfigPanel.vue`
- New: a bottom action dock component
- New: a course-colour utility
- Shared design tokens in `app/assets/css/tailwind.css`
- `types/scheduler.ts` (hoisting shared day labels)

Out of scope:

- `CourseSheet.vue` internals (the form itself works; only its imported day labels change)
- The Pinia store's API surface — no action signatures change
- Any database migration or schema change. The colour system is derived, not stored.
- `CourseCardPixelBackground.vue` and the GSAP hover-expand animation. Both work; touching them
  does not serve this goal.

## Problems being fixed

Observed in the current implementation:

1. **The timetable is below the fold.** Header, then the always-open `DayToggle` card, then the
   always-open `SessionConfigPanel` card, and only then the grid.
2. **Six buttons in an unwrapped flex row** (`[id].vue:329`) with no `flex-wrap` and no responsive
   collapse. Overflows below desktop widths.
3. **No mobile handling.** `grid-template-columns: auto repeat(6, 1fr)` with `min-h-30` cells is
   unusable under roughly 900px. The `useResponsive` / `useScreenType` composables already exist and
   go unused here.
4. **The page ignores its own design system.** `.app-card`, `.app-toolbar`, and `.app-kicker` are
   defined in `tailwind.css:376-397` but the page hand-rolls `bg-primary/10 rounded-lg border`
   instead. The three stat tiles use three different background treatments for parallel data.
5. **Hardcoded colours that break dark mode.** `text-green-500 hover:bg-green-50` (`[id].vue:313`)
   and `hover:bg-red-50` (`[id].vue:321`), while `--success` and `--destructive` tokens exist.
6. **Zero colour differentiation between courses.** Every card is `bg-card`, so the week reads as an
   undifferentiated wall and repeated subjects are invisible.
7. **Silent double-booking.** Two courses in the same day+session just stack with no signal.
8. **`alert()` for import errors** (`[id].vue:246`) while the rest of the app uses `vue-sonner`.
9. **Grid cells are click-handled `<div>`s** with no role, no keyboard access, no ARIA.
10. **Raw spinner on load**, causing layout shift when data lands.
11. **Silent load failure.** A failed `loadSchedule` leaves the default "My Schedule" with no
    courses and no error shown.
12. **Read-only viewers cannot share.** The `Chia sẻ` button sits inside the `v-if="!readonly"`
    block, so someone given a share link cannot pass it on.
13. **Typos.** "Tổng sô môn" and "Tổng sô tín chỉ" should be "Tổng số".
14. **Dead code.** The `else` branch in `onMounted` cannot run — the route is `/scheduler/[id]`, so
    `id` always exists — and it pushes `{ query: { id } }`, the wrong shape for this route.
15. **`DAY_LABELS` duplicated** across `SchedulerGrid.vue`, `DayToggle.vue`, and `CourseSheet.vue`.
16. **`handleSessionUpdate(sessions: any)`** is untyped.

## Decisions

Settled during brainstorming:

| Question | Decision |
|---|---|
| Scope | Page + scheduler components + shared tokens |
| Mobile strategy | One grid everywhere; horizontal scroll with sticky time column below `md` |
| Course colour | Auto-derived by hashing course code; no schema change |
| Added UX | Conflict detection, skeleton loading, keyboard + a11y pass |
| Page layout | Full-bleed grid with a floating bottom dock |
| Zero courses | Render the grid normally so any cell can be clicked to fast-add |
| Load failure | Render only a shadcn-vue `<Empty>`; no grid, no dock |

## Architecture

### 1. Page shell

Document scroll stays normal. No nested scroll container — native scrolling is preserved and the
sticky offsets stay simple.

"Full-bleed" means edge-to-edge *within the app shell*, not breaking out of it. `MaxWidthWrapper`
caps content at `max-w-screen-2xl` with `px-6 lg:px-10`, and `AppLayout`'s header is
`sticky top-0 z-10`. The page stays inside that container so it still reads as a dashboard page.

- The schedule name is pushed into the breadcrumb via `usePageBreadcrumbs`, replacing the static
  "Thời khóa biểu". Orientation at zero vertical cost, and it is already sticky.
- The grid's horizontal scroll track breaks out of the wrapper padding with `-mx-6 lg:-mx-10` plus
  matching inner padding, so cards scroll edge-to-edge but align to the content grid at rest.
- The grid carries bottom padding so the last session row always clears the dock:
  `pb-28` on desktop, `pb-24` plus `env(safe-area-inset-bottom, 0px)` on mobile. This is the fix for
  dock occlusion. Auto-hide-on-scroll was considered and rejected as unnecessary machinery.
- The dead `else` branch in `onMounted` is deleted.

### 2. Page states

Three mutually exclusive top-level states:

**Loading** (`initializing === true`) — a grid-shaped skeleton built from the existing `skeleton` UI
component, matching the final geometry so nothing shifts when data lands. No dock.

**Load failure** (`loadError !== null`) — only a shadcn-vue `<Empty>`:

- `<EmptyMedia variant="icon">` with a `TriangleAlert` icon
- `<EmptyTitle>`: "Không tải được thời khóa biểu"
- `<EmptyDescription>`: explains the schedule may not exist or the connection failed
- `<EmptyContent>`: **Thử lại** (re-runs `loadSchedule`) and **Về trang chủ** (navigates to `/`)

No grid and no dock render in this state — there is nothing to interact with.

**Loaded** — grid plus dock, regardless of whether there are any courses.

A schedule with zero courses is *not* an empty state. The grid renders normally so any cell can be
clicked to fast-add a course. To make that discoverable, the empty-cell `+` affordance (currently
`opacity-0`, hover-only) rests at `opacity-40` while `courses.length === 0`, and reverts to
hover-only (`opacity-0`, `hover:opacity-100`) once the first course exists. The grid teaches the
interaction, then gets out of the way.

### 3. The dock

A new component, `app/components/scheduler/SchedulerDock.vue`. Fixed, bottom-centred, `z-30`,
styled with the existing `.app-toolbar` class.

```
╭──────────────────────────────────────────────────────╮
│  Lịch của Mạnh ✎  │  ● 12 môn  ● 34 tín  ● 8 GV      │
│  ─────────────────┴──────────────────────────────────│
│  [＋ Thêm môn học]  [👁]  [🕐]  [⋯]                   │
╰──────────────────────────────────────────────────────╯
```

**Left segment — identity and stats.** The schedule name, click-to-edit inline: the label swaps to
an `Input` in place, Enter saves, Esc cancels. The existing `isEditingName` / `tempName` state
machine moves here unchanged. The separate green-check and red-X icon buttons are deleted; a single
confirm checkmark plus Enter/Esc replaces them, which also removes the two hardcoded non-token
colours.

Three stat chips sharing one consistent treatment, replacing the three-different-backgrounds tiles:
`Tổng số môn`, `Tổng số tín chỉ`, `Giảng viên`. The existing `uniqueCourses` / `totalUniqueCredits`
computeds carry over as-is.

**Right segment — actions.**

- `＋ Thêm môn học` — primary, always labelled. This is the main action.
- `👁 Hiển thị` — popover containing `DayToggle`
- `🕐 Ca học` — popover containing `SessionConfigPanel`
- `⋯` — dropdown containing Nhập file, Xuất file, Xuất lịch, Sao chép mã HP, Chia sẻ

Moving the two config panels into popovers reclaims roughly 280px of vertical space.

**Mobile.** Below `md` the dock becomes a full-width bottom bar with icon-only actions, honouring
`env(safe-area-inset-bottom)`.

**Read-only.** The dock shows name, stats, `Chia sẻ`, and `Đăng nhập`. `Chia sẻ` must be available
in read-only mode — this fixes the current bug where a share-link recipient cannot pass the link on.
The full-width read-only banner card collapses into a compact inline badge in the dock.

### 4. The grid

- **Day header row**: `sticky top-[calc(var(--header-height)+env(safe-area-inset-top,0px))]`,
  `z-[5]`. Sits below the app header's `z-10` so it always slides underneath.
- **Time column**: `sticky left-0`, `z-[4]`, with an opaque background. This is what makes the
  horizontal-scroll mobile strategy work.
- **Day columns**: `min-w-[9rem]`, inside an `overflow-x-auto` track. Above `md` the columns expand
  to fill; below `md` the track scrolls horizontally with the time column pinned.
- **Today's column**: subtle tint plus a marker on the header chip. `new Date().getDay()` maps onto
  `DAYS` (`0` = Sunday has no column, so no highlight on Sundays).
- **Conflicts**: a cell holding more than one course gets a `--warning`-toned ring and a count
  badge.
- **Cells become real `<button>` elements** — see accessibility below.

**Stacking order**, lowest to highest, chosen so the result is deterministic regardless of which
elements form their own stacking contexts:

| Layer | z-index |
|---|---|
| Resting course card | `z-0` |
| Sticky time column | `z-[4]` |
| Sticky day-header row | `z-[5]` |
| Hover-expanded course card | `z-[8]` |
| App header (`AppLayout`) | `z-10` (existing) |
| Dock | `z-30` |

The expanded card drops from its current `z-20` to `z-[8]`. This keeps it above both sticky grid
layers while staying below the app header, so a card expanding near the top of the viewport can
never cover the breadcrumb bar. An expanded card *may* overlap the sticky day-header row; that is
accepted, since expansion is hover-driven and transient.

This ordering matters because `CourseCard` sets `will-change-transform` and GSAP applies transforms,
both of which create stacking contexts. Keeping every layer below the app header means the outcome
does not depend on reasoning about which ancestor establishes which context.

`DAY_LABELS` is hoisted to `types/scheduler.ts` beside `DAYS`, and imported by `SchedulerGrid`,
`DayToggle`, and `CourseSheet`.

### 5. Course colour system

A new utility, `app/utils/courseColor.ts`:

```ts
const COURSE_HUE_COUNT = 8;

export function courseHue(course: Pick<Course, 'code' | 'name'>): number {
  const key = (course.code?.trim() || course.name.trim()).toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return (hash % COURSE_HUE_COUNT) + 1;
}
```

Keying on `code` with a `name` fallback means the same subject renders the same colour in every slot
it occupies across the week — the single biggest scannability win in this redesign.

`CourseCard` binds exactly one inline style, mapping the hue index onto CSS variables:

```ts
:style="{
  '--course-accent': `var(--course-${hue}-accent)`,
  '--course-surface': `var(--course-${hue}-surface)`,
  '--course-border': `var(--course-${hue}-border)`,
}"
```

Every class in the template is then static — `bg-[var(--course-surface)]`,
`border-[var(--course-border)]`, and a left rail using `bg-[var(--course-accent)]`. No dynamic class
strings, so Tailwind's scanner is unaffected.

Cards get a coloured left rail plus a tinted surface rather than a saturated fill, so text contrast
holds in both themes.

### 6. Design tokens

Added to `app/assets/css/tailwind.css`, defined in both `:root` and `.dark`:

```
--course-1-surface / --course-1-border / --course-1-accent
… through …
--course-8-surface / --course-8-border / --course-8-accent
```

Built on the same `oklch` system as the existing "Luminous Ink" palette, with chroma held low enough
that eight can coexist on one screen without the grid turning into confetti. Hues are spread across
the wheel and chosen so no two adjacent indices are easily confused.

These are raw custom properties consumed via `var()`. They are deliberately **not** registered in
`@theme inline` — registering 24 tokens to generate utility classes that only one component uses
would bloat the generated CSS for no gain.

The hardcoded `text-green-500`, `hover:bg-green-50`, and `hover:bg-red-50` are removed along with
the icon buttons that carried them.

### 7. Accessibility

- Grid cells become `<button>` elements with descriptive labels, e.g.
  `aria-label="Thứ 2, Ca 1, trống"` or `aria-label="Thứ 2, Ca 1, 2 môn học"`.
- Roving tabindex across the grid: exactly one cell is tabbable at a time. Arrow Left/Right moves
  between days, Arrow Up/Down between sessions, Home/End jump to the first/last day in the row.
  Enter or Space opens the add-course sheet for that slot.
- Visible focus rings via the existing `outline-ring/50` base rule.
- The dock's popovers and dropdown use the existing shadcn-vue primitives, which already handle
  focus trapping and Escape.
- Existing `prefers-reduced-motion` handling in `CourseCard` is preserved.

### 8. Feedback and typing

- The `alert()` on import failure becomes a `vue-sonner` `toast.error`, matching the rest of the
  app. Success toasts are added for import, export, and ICS export.
- `handleSessionUpdate(sessions: any)` is typed as `SessionConfig[]`.

## Component boundaries

| Component | Responsibility | Depends on |
|---|---|---|
| `[id].vue` | Route state, store orchestration, top-level state switch (loading / error / loaded) | store, dock, grid, sheet |
| `SchedulerDock.vue` | Identity, stats, and all actions. Emits intent; owns no schedule data. | `DayToggle`, `SessionConfigPanel` (as popover content) |
| `SchedulerGrid.vue` | Layout, sticky behaviour, keyboard navigation, conflict marking | `CourseCard` |
| `CourseCard.vue` | One course's presentation, hover-expand, drag source | `courseColor`, `CourseCardPixelBackground` |
| `DayToggle.vue` | Day visibility controls only — card chrome removed, since it now lives in a popover | — |
| `SessionConfigPanel.vue` | Session time editing only — its own collapse chrome removed for the same reason | — |
| `courseColor.ts` | Pure function: course → hue index | — |

`DayToggle` and `SessionConfigPanel` both currently render their own card wrapper and, in
`SessionConfigPanel`'s case, its own expand/collapse header. Both become plain content components;
the popover now provides the container. `SessionConfigPanel` also drops its hand-rolled input and
button class strings in favour of the `Input` and `Button` components.

## Verification

No automated test suite covers this page today, so verification is manual and must be performed in
the browser at each of these points:

1. Grid renders correctly at 1920px, 1280px, 768px, and 390px widths.
2. Below `md`, the time column stays pinned while the day columns scroll horizontally.
3. The sticky day-header row slides under the app header, not over it.
4. The dock never occludes the Ca 4 row at any viewport size, including with iOS safe areas.
5. Both light and dark themes: all eight course colours are legible, and no hardcoded colour
   remains.
6. A schedule with zero courses shows a clickable grid with visible `+` affordances.
7. A bad schedule ID shows the `<Empty>` state with working Thử lại and Về trang chủ actions.
8. Keyboard-only: tab into the grid, navigate all 24 cells with arrows, open the sheet with Enter.
9. Two courses in one slot produce a conflict ring and count badge.
10. Read-only mode: the dock shows Chia sẻ and Đăng nhập, and no editing affordance is reachable.
11. Drag-and-drop still moves courses between cells.

## Risks

- **Stacking contexts.** The z-index table above is designed to make the outcome deterministic, but
  `CourseCard`'s `will-change-transform` plus GSAP transforms and two new sticky layers still
  warrant browser verification rather than reasoning alone.
- **Fixed dock on mobile browsers.** iOS Safari's dynamic toolbar affects `position: fixed` elements.
  Bottom padding plus `env(safe-area-inset-bottom)` should cover it, but needs a real-device check.
- **Colour count.** Eight hues means a student with more than eight distinct subjects will see a
  collision. This is an accepted trade-off: eight distinguishable low-chroma hues is already at the
  limit of what stays legible in both themes, and the room and course-code text disambiguate.
