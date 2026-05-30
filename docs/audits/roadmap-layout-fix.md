# Roadmap Expansion Layout Fix

**Date**: 2025-07-17  
**Status**: ✅ Fixed  
**Affected File**: `frontend/src/views/Roadmap.vue`

---

## Root Cause Analysis

The desktop timeline in Roadmap.vue rendered each sprint/release item as a flex row with `items-stretch`, causing the left (sticky labels) and right (timeline bars) panels to share the same height. The right panel had a fixed `min-h-[52px]`. Child issue bars used **absolute positioning** computed by `childBarStyle()`:

```js
const childBarStyle = (item, idx) => ({
  left: ..., width: ...,
  top: (42 + idx * 20) + 'px'  // ⚠️ absolute children spill below row
});
```

When a sprint was expanded, its child bars rendered but **overflowed below** the fixed-height row into the adjacent row, where they were visually occluded/clipped by the next row's background and border. The today indicator line (`top-0 bottom-0`, absolute relative to right panel) also contributed to visual clipping.

### Chain of Failure

1. Parent flex row uses `items-stretch` → both panels forced to same height
2. Right panel has `min-h-[52px]` — fixed, doesn't grow with children
3. Child bars use `absolute` positioning with increasing `top` values (42, 62, 82...)
4. Children render outside the row bounds → visually hidden under next row

---

## Solution

### 1. Dynamic Row Height (`rowHeight()`)

Replaced static `min-h-[52px]` with a computed function that grows when children are visible:

```js
const rowHeight = (item) => {
  const baseHeight = 52;
  if (!expandedItems.value.has(item.id) || !item.issues?.length) return baseHeight;
  const visibleCount = Math.min(item.issues.length, 10);
  return baseHeight + visibleCount * 20 + 4; // +4px bottom padding
};
```

**Template change**:
```html
<!-- Before -->
<div class="flex-grow relative min-h-[52px]">

<!-- After -->
<div class="flex-grow relative transition-all duration-200 ease-in-out"
  :style="{ minHeight: rowHeight(item) + 'px' }">
```

### 2. Transition Wrapper

Wrapped child issue bars in `<Transition name="child-bars">` for fade-in animation:

```css
.child-bars-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.child-bars-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.child-bars-enter-from  { opacity: 0; transform: translateY(-4px); }
.child-bars-leave-to    { opacity: 0; transform: translateY(-2px); }
```

---

## Synchronization

The sticky left panel and right timeline panel remain synchronized because both are children of the same flex row. The `items-stretch` property ensures the left panel matches the right panel's computed height. The `+4px` bottom padding prevents the last child bar from touching the row border.

---

## Test Scenarios

| Scenario | Expected Behavior |
|---|---|
| Collapse all | All rows at 52px height, no child bars visible |
| Expand single sprint (3 issues) | Row grows to 52 + 3×20 + 4 = 116px, 3 child bars visible |
| Expand sprint with 15 issues | Row caps at 52 + 10×20 + 4 = 256px, shows 10 bars + "...5 more" |
| Today line | Spans the full dynamic height (aligns with `top-0 bottom-0` relative to right panel) |
| Multiple expanded rows | Each row independently sized, no overlap |

---

## Before / After

**Before**: Children rendered outside row bounds → overlapped by next row → visually invisible  
**After**: Row height dynamically grows → children visible within row bounds → smooth transition animation
