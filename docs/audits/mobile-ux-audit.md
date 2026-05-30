# Mobile UX Scrolling Audit

**Date**: 2025-07-17  
**Status**: ✅ Completed  
**Affected Files**: 17 views, 4 dialog/drawer components

---

## Audit Scope

Evaluated all pages, dialogs, drawers, and modals for nested scrolling issues (two or more overlapping scroll containers on the same axis).

---

## Architecture Pattern

Content pages rendered inside `Layout.vue` use this pattern:

```
h-screen overflow-hidden  (page root — prevents body scroll)
  ├── flex-shrink-0       (header/toolbar — fixed)
  └── flex-grow overflow-y-auto  (single scrollable content area)
```

This is the **correct** pattern for SPA layouts — exactly one vertical scroll container per page. No refactoring needed.

---

## Pages Reviewed

### ✅ Correct (single scroll container)

| Page | Pattern | Notes |
|---|---|---|
| `Board.vue` | `h-screen overflow-hidden` → column `overflow-y-auto` | Horizontal snap scroll + per-column vertical scroll. Acceptable for Kanban. |
| `Backlog.vue` | `h-screen overflow-hidden` → `flex-grow overflow-y-auto` | Single scroll. Touch targets ≥36px from prior session. |
| `Roadmap.vue` | `h-screen overflow-hidden` → mobile `overflow-y-auto` / desktop `overflow-auto` | Mobile cards scroll; desktop timeline scrolls. Single container per viewport. Expansion fix applied (see `roadmap-layout-fix.md`). |
| `Releases.vue` | `h-screen overflow-hidden` → `overflow-y-auto` | Single scroll. |
| `Automation.vue` | `h-screen overflow-hidden` → no inner scroll | Modal overlays are separate stacking contexts. |
| `Templates.vue` | `h-screen overflow-hidden` → `overflow-y-auto` | Single scroll. |
| `TrashBin.vue` | `h-screen overflow-hidden` → `overflow-y-auto` | Single scroll. Responsive from prior session. |
| `Import.vue` | `h-screen overflow-hidden` → per-step content | Step 4 error log has `overflow-y-auto` inside `overflow-hidden` (acceptable — log viewer). |
| `ProjectSettings.vue` | `min-h-screen` → natural body scroll | Member list scrolls with page. |
| `WorkspaceSettings.vue` | `min-h-screen` → natural body scroll | No nested issues. |
| `UserSettings.vue` | `min-h-screen` → natural body scroll | No nested issues. |
| `Workspace.vue` | `min-h-screen` → sidebar `overflow-y-auto` + grid | Two side-by-side scroll areas. Acceptable — separate panels. |
| `Login.vue` | `min-h-screen` | Single natural scroll. |
| `Register.vue` | `min-h-screen` | Single natural scroll. |
| `NotificationInbox.vue` | `min-h-screen` → `overflow-y-auto` | Single scroll. |

### 🔧 Fixed

| Page | Issue | Fix |
|---|---|---|
| `Analytics.vue` | Burndown chart list had `max-h-48 overflow-y-auto` inside `flex-grow overflow-y-auto` | Removed `max-h-48 overflow-y-auto`. Chart rows now scroll naturally with page. |
| `Roadmap.vue` | Expansion left children clipped/overlapped (see `roadmap-layout-fix.md`) | Dynamic `rowHeight()` + transition animation. |

---

## Dialog / Drawer / Sheet Audit

| Component | Scroll Behavior | Status |
|---|---|---|
| `AppDialog.vue` | Dialog body has `overflow-y-auto`. Backdrop prevents body scroll. | ✅ Correct — single scroll in modal |
| `AppDrawer.vue` | Drawer content has `overflow-y-auto`. | ✅ Correct |
| `AppSheet.vue` | Sheet content has `overflow-y-auto`. | ✅ Correct |
| `IssueModal.vue` | Inner content divs have `overflow-y-auto`. Modal overlay prevents body scroll. | ✅ Correct — each div is a separate semantic zone (description editor, comments list, attachments). Side-by-side sections, not nested. |

---

## Exceptions (Acceptable Nested Scroll)

These cases have justified nested scrolling and were **not** changed:

1. **Kanban columns** (`Board.vue`) — Each column independently scrolls vertically. Horizontal snap-scroll for column navigation.
2. **Desktop timeline** (`Roadmap.vue`) — Horizontal scroll for date axis.
3. **Long data tables** — Tables with `min-w-[600px]` in `overflow-x-auto` wrappers (Import, Analytics workload table).
4. **Import error logs** (`Import.vue` step 4) — Log viewer with `overflow-y-auto` inside `overflow-hidden` parent.
5. **Select dropdowns** — `SelectDropdown.vue` options list with `overflow-y-auto max-h-48`.

---

## Summary

- **17 views** audited
- **2 fixes** applied (Analytics burndown list, Roadmap expansion)
- **4 dialog/drawer/sheet components** verified correct
- **0** layout-breaking nested scroll issues found
- **5** intentional exceptions documented

The `h-screen overflow-hidden` → single `flex-grow overflow-y-auto` pattern used across the app is the standard, correct approach for fixed-layout SPAs.
