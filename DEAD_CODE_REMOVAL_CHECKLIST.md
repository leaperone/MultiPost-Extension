# Dead Code Removal Checklist - MultiPost Codebase

## Priority 1: Remove Immediately (HIGH CONFIDENCE, HIGH IMPACT)

### 1.1 Unused NPM Dependencies (14 packages)
Remove these from `package.json` and run `pnpm install`:

```bash
pnpm remove \
  html2canvas \
  react-office-viewer \
  react-rewards \
  react-countdown \
  react-grid-layout \
  react-masonry-component2 \
  react-h5-audio-player \
  blive-message-listener \
  oh-my-live2d \
  query-string \
  aieditor \
  @tsparticles/plugin-absorbers \
  mini-svg-data-uri \
  pure-rand
```

**Impact**: Reduces bundle size by ~2-5MB and cleans up dependency tree
**Risk Level**: MINIMAL (zero imports found)
**Estimated Time**: 5 minutes

---

### 1.2 Unused Loading Animation Components (41 of 42)
**Location**: `/root/multipost/components/LoadingAnimate/`
**Keep**: `SafariCompass.tsx` only
**Delete**: All other 41 components

**Files to Delete**:
- /root/multipost/components/LoadingAnimate/Astronaut.tsx
- /root/multipost/components/LoadingAnimate/BlackMan.tsx
- /root/multipost/components/LoadingAnimate/CoffeeMachine.tsx
- /root/multipost/components/LoadingAnimate/ColorDotFloating.tsx
- /root/multipost/components/LoadingAnimate/Cube.tsx
- /root/multipost/components/LoadingAnimate/DVD.tsx
- /root/multipost/components/LoadingAnimate/DayAndNight.tsx
- /root/multipost/components/LoadingAnimate/Dice.tsx
- /root/multipost/components/LoadingAnimate/Dinosaur.tsx
- /root/multipost/components/LoadingAnimate/DollarCoin.tsx
- /root/multipost/components/LoadingAnimate/DollarCoinSpin.tsx
- /root/multipost/components/LoadingAnimate/Drink.tsx
- /root/multipost/components/LoadingAnimate/HandOnDesk.tsx
- /root/multipost/components/LoadingAnimate/Heart.tsx
- /root/multipost/components/LoadingAnimate/Hourglass.tsx
- /root/multipost/components/LoadingAnimate/HousePainter.tsx
- /root/multipost/components/LoadingAnimate/Jupiter.tsx
- /root/multipost/components/LoadingAnimate/MacbookAir.tsx
- /root/multipost/components/LoadingAnimate/MagicArray.tsx
- /root/multipost/components/LoadingAnimate/MailSending.tsx
- /root/multipost/components/LoadingAnimate/Mario.tsx
- /root/multipost/components/LoadingAnimate/Minecraft.tsx
- /root/multipost/components/LoadingAnimate/OrbitSystem.tsx
- /root/multipost/components/LoadingAnimate/Pan.tsx
- /root/multipost/components/LoadingAnimate/Pencil.tsx
- /root/multipost/components/LoadingAnimate/Pendulum.tsx
- /root/multipost/components/LoadingAnimate/Planet.tsx
- /root/multipost/components/LoadingAnimate/PolarBear.tsx
- /root/multipost/components/LoadingAnimate/Pornhub.tsx
- /root/multipost/components/LoadingAnimate/RainCloud.tsx
- /root/multipost/components/LoadingAnimate/RocketLiftOff.tsx
- /root/multipost/components/LoadingAnimate/RotateButton.tsx
- /root/multipost/components/LoadingAnimate/Server.tsx
- /root/multipost/components/LoadingAnimate/SettingBtn.tsx
- /root/multipost/components/LoadingAnimate/SpiderMan.tsx
- /root/multipost/components/LoadingAnimate/Sun.tsx
- /root/multipost/components/LoadingAnimate/SunCloudy.tsx
- /root/multipost/components/LoadingAnimate/SunSpin.tsx
- /root/multipost/components/LoadingAnimate/TrafficLight.tsx
- /root/multipost/components/LoadingAnimate/Truck.tsx
- /root/multipost/components/LoadingAnimate/Typewriter.tsx
- /root/multipost/components/LoadingAnimate/Valorant.tsx
- /root/multipost/components/LoadingAnimate/WhiteWave.tsx
- /root/multipost/components/LoadingAnimate/laundryMachine.tsx

**Bash command to delete**:
```bash
cd /root/multipost/components/LoadingAnimate
rm Astronaut.tsx BlackMan.tsx CoffeeMachine.tsx ColorDotFloating.tsx Cube.tsx DVD.tsx \
   DayAndNight.tsx Dice.tsx Dinosaur.tsx DollarCoin.tsx DollarCoinSpin.tsx Drink.tsx \
   HandOnDesk.tsx Heart.tsx Hourglass.tsx HousePainter.tsx Jupiter.tsx MacbookAir.tsx \
   MagicArray.tsx MailSending.tsx Mario.tsx Minecraft.tsx OrbitSystem.tsx Pan.tsx \
   Pencil.tsx Pendulum.tsx Planet.tsx PolarBear.tsx Pornhub.tsx RainCloud.tsx \
   RocketLiftOff.tsx RotateButton.tsx Server.tsx SettingBtn.tsx SpiderMan.tsx Sun.tsx \
   SunCloudy.tsx SunSpin.tsx TrafficLight.tsx Truck.tsx Typewriter.tsx Valorant.tsx \
   WhiteWave.tsx laundryMachine.tsx
```

**Impact**: Removes ~1,500 lines of unused component code
**Risk Level**: MINIMAL (no imports found)
**Estimated Time**: 2 minutes

---

## Priority 2: Review and Remove (MEDIUM CONFIDENCE)

### 2.1 Unused UI Components (31 of 63 components)
**Location**: `/root/multipost/components/ui/`
**Action**: REVIEW each before removing

**Components to Review**:
- /root/multipost/components/ui/3d-card.tsx
- /root/multipost/components/ui/alert.tsx
- /root/multipost/components/ui/aurora-background.tsx
- /root/multipost/components/ui/background-beams-with-collision.tsx
- /root/multipost/components/ui/background-boxes.tsx
- /root/multipost/components/ui/background-gradient-animation.tsx
- /root/multipost/components/ui/badge.tsx
- /root/multipost/components/ui/blur-in.tsx
- /root/multipost/components/ui/box-reveal.tsx
- /root/multipost/components/ui/card-hover-effect.tsx
- /root/multipost/components/ui/carousel.tsx
- /root/multipost/components/ui/checkbox.tsx
- /root/multipost/components/ui/collapsible.tsx
- /root/multipost/components/ui/confetti.tsx
- /root/multipost/components/ui/context-menu.tsx
- /root/multipost/components/ui/dialog.tsx
- /root/multipost/components/ui/drawer.tsx
- /root/multipost/components/ui/dropdown-menu.tsx
- /root/multipost/components/ui/flip-words.tsx
- /root/multipost/components/ui/form.tsx
- /root/multipost/components/ui/grid-pattern.tsx
- /root/multipost/components/ui/hero-parallax.tsx
- /root/multipost/components/ui/hover-border-gradient.tsx
- /root/multipost/components/ui/hover-card.tsx
- /root/multipost/components/ui/infinite-moving-cards.tsx
- /root/multipost/components/ui/input-otp.tsx
- /root/multipost/components/ui/lamp.tsx
- /root/multipost/components/ui/marquee.tsx
- /root/multipost/components/ui/motion.tsx
- /root/multipost/components/ui/neon-gradient-card.tsx
- /root/multipost/components/ui/pagination.tsx
- /root/multipost/components/ui/popover.tsx
- /root/multipost/components/ui/safari.tsx
- /root/multipost/components/ui/select.tsx
- /root/multipost/components/ui/shooting-stars.tsx
- /root/multipost/components/ui/sparkles-text.tsx
- /root/multipost/components/ui/sparkles.tsx
- /root/multipost/components/ui/stars-background.tsx
- /root/multipost/components/ui/sticky-scroll-reveal.tsx
- /root/multipost/components/ui/switch.tsx
- /root/multipost/components/ui/table.tsx
- /root/multipost/components/ui/tabs.tsx
- /root/multipost/components/ui/text-generate-effect.tsx
- /root/multipost/components/ui/text-hover-effect.tsx
- /root/multipost/components/ui/textarea.tsx
- /root/multipost/components/ui/toggle.tsx
- /root/multipost/components/ui/typewriter-effect.tsx
- /root/multipost/components/ui/wavy-background.tsx

**Used Components** (keep these):
- /root/multipost/components/ui/accordion.tsx
- /root/multipost/components/ui/animated-list.tsx
- /root/multipost/components/ui/button.tsx
- /root/multipost/components/ui/card.tsx
- /root/multipost/components/ui/glowing-effect.tsx
- /root/multipost/components/ui/input.tsx
- /root/multipost/components/ui/label.tsx
- /root/multipost/components/ui/navigation-menu.tsx
- /root/multipost/components/ui/resizable.tsx
- /root/multipost/components/ui/scroll-area.tsx
- /root/multipost/components/ui/separator.tsx
- /root/multipost/components/ui/sheet.tsx
- /root/multipost/components/ui/sidebar.tsx
- /root/multipost/components/ui/skeleton.tsx
- /root/multipost/components/ui/sonner.tsx
- /root/multipost/components/ui/tag-input.tsx
- /root/multipost/components/ui/toast.tsx
- /root/multipost/components/ui/toaster.tsx
- /root/multipost/components/ui/tooltip.tsx
- /root/multipost/components/ui/use-infinite-scroll.tsx
- /root/multipost/components/ui/use-toast.ts

**Risk Level**: MEDIUM (might be planned for future use)
**Estimated Time**: 30 minutes (review each)
**Note**: Search for any internal references before deleting

---

## Priority 3: Code Review Required

### 3.1 Commented Code Blocks

#### File: `/root/multipost/actions/draw/image/index.ts`
**Lines**: 6-7, 37-42
**Issue**: Credit checking is commented out
**Status**: NEEDS INVESTIGATION
**Impact**: Potential billing/credit system issue

```typescript
// LINES 6-7 - Uncomment for production
// import { preCheckCredit } from '@/actions/credit';
// import { PRICING } from '@/actions/credit/types';

// LINES 37-42 - Uncomment for production
// 检查积分是否足够
// if (!(await preCheckCredit(session.user.id, PRICING.IMAGE_GENERATION.mul(validatedTask.number).toNumber()))) {
//   return {
//     success: false,
//     error: '积分不足',
//   };
// }
```

**Action**: 
- Either uncomment these lines OR
- Add a comment explaining why this is disabled (e.g., "Disabled for development - enable in production")

**Risk Level**: HIGH (affects functionality)
**Estimated Time**: 15 minutes (verify with product team)

---

#### File: `/root/multipost/app/dashboard/layout.tsx`
**Lines**: 8
**Status**: INTENTIONAL (not needed in dashboard)
**Action**: NONE - keep commented

```typescript
// import { ThemeSwitcher } from '@/components/ThemeSwitcher';
```

---

#### File: `/root/multipost/app/dashboard/drafts/components/DraftEditor.tsx`
**Lines**: 17
**Status**: INTENTIONAL (under development)
**Action**: VERIFY with team before uncommenting

```typescript
// import { ImageGenerationModal } from '@/app/dashboard/publish/dynamic/components/ImageGenerationModal';
```

---

### 3.2 Package Review

#### Package: `tiny-bilibili-ws` v1.0.1
**Status**: No imports found in codebase
**Related**: `blive-message-listener` (also unused)
**Action**: CLARIFY with team - is this for future Bilibili integration?

If unused: `pnpm remove tiny-bilibili-ws`

---

## Verification Checklist

After making changes, run:

```bash
# 1. Install and verify no errors
pnpm install

# 2. Check for any broken imports
pnpm lint

# 3. Full build test
pnpm build

# 4. Optional: Check for unused CSS
pnpm eslint --rule 'tailwindcss/classnames-order: warn'
```

---

## Summary of Changes

| Category | Count | Lines | Effort | Risk |
|----------|-------|-------|--------|------|
| Remove unused packages | 14 | 0 | 5 min | MINIMAL |
| Remove unused components | 41 | 1,500 | 2 min | MINIMAL |
| Review UI components | 31 | 5,000+ | 30 min | MEDIUM |
| Code review/uncomment | 3 | 20 | 15 min | HIGH |
| **TOTAL** | **89** | **6,500+** | **52 min** | - |

---

## Implementation Steps

1. **Step 1**: Back up codebase
   ```bash
   git checkout -b cleanup/remove-unused-code
   ```

2. **Step 2**: Remove unused packages (5 min)
   ```bash
   pnpm remove html2canvas react-office-viewer react-rewards react-countdown \
     react-grid-layout react-masonry-component2 react-h5-audio-player \
     blive-message-listener oh-my-live2d query-string aieditor \
     @tsparticles/plugin-absorbers mini-svg-data-uri pure-rand
   ```

3. **Step 3**: Remove LoadingAnimate components (2 min)
   ```bash
   cd /root/multipost/components/LoadingAnimate && \
   rm Astronaut.tsx BlackMan.tsx ... [see command above]
   ```

4. **Step 4**: Review commented code (15 min)
   - Decide on credit checking in image generation
   - Verify no other critical code is commented

5. **Step 5**: Test
   ```bash
   pnpm install && pnpm lint && pnpm build
   ```

6. **Step 6**: Commit
   ```bash
   git add -A
   git commit -m "refactor: remove unused code and dependencies"
   git push origin cleanup/remove-unused-code
   ```

7. **Step 7**: Create PR for review before merging to main

