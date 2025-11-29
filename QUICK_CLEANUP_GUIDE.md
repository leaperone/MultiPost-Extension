# Quick Cleanup Guide - MultiPost

## TL;DR - What to Remove Now

### Remove These NPM Packages (5 min)
```bash
pnpm remove html2canvas react-office-viewer react-rewards react-countdown \
  react-grid-layout react-masonry-component2 react-h5-audio-player \
  blive-message-listener oh-my-live2d query-string aieditor \
  @tsparticles/plugin-absorbers mini-svg-data-uri pure-rand
```

### Remove These 41 Components (2 min)
Delete all files in `/root/multipost/components/LoadingAnimate/` EXCEPT `SafariCompass.tsx`

List of files to delete:
```
Astronaut, BlackMan, CoffeeMachine, ColorDotFloating, Cube, DVD, DayAndNight, Dice, 
Dinosaur, DollarCoin, DollarCoinSpin, Drink, HandOnDesk, Heart, Hourglass, HousePainter, 
Jupiter, MacbookAir, MagicArray, MailSending, Mario, Minecraft, OrbitSystem, Pan, Pencil, 
Pendulum, Planet, PolarBear, Pornhub, RainCloud, RocketLiftOff, RotateButton, Server, 
SettingBtn, SpiderMan, Sun, SunCloudy, SunSpin, TrafficLight, Truck, Typewriter, 
Valorant, WhiteWave, laundryMachine
```

### Review These 3 Files (15 min)
1. `/root/multipost/actions/draw/image/index.ts` (Lines 6-7, 37-42) - Uncomment credit checks?
2. `/root/multipost/app/dashboard/drafts/components/DraftEditor.tsx` (Line 17) - Document intentional comment
3. Package `tiny-bilibili-ws` - Is it needed for future Bilibili support?

---

## Risk Levels

**MINIMAL RISK** (Safe to remove):
- 14 NPM packages - zero imports found
- 41 loading components - only SafariCompass imported

**MEDIUM RISK** (Review before removing):
- 31 UI components - might be for future features

**HIGH RISK** (Requires team discussion):
- Credit checking code - intentional for development?
- Bilibili packages - feature planned?

---

## Quick Stats

- Bundle size savings: 2-5MB
- Code reduction: 6,500+ lines
- Components to remove: 72
- Files to delete: 55+ (packages + components)
- Total effort: ~52 minutes
- Build time: ~5 minutes (verify changes)

---

## One-Command Quick Test

After making changes, run this to verify nothing broke:
```bash
pnpm install && pnpm lint && pnpm build
```

---

## Full Reports Available

For detailed analysis, see:
- `UNUSED_CODE_ANALYSIS.md` - Technical details & confidence levels
- `DEAD_CODE_REMOVAL_CHECKLIST.md` - Step-by-step instructions
- `CLEANUP_SUMMARY.md` - Overview & questions to answer

---

## Safety First

1. Create a branch: `git checkout -b cleanup/remove-unused-code`
2. Make Phase 1 changes (packages + loading components)
3. Test thoroughly: `pnpm build`
4. Create PR for review
5. Only after approval: Continue with Phase 2-3

---

## Questions Before Starting?

- Should credit checking be enabled?
- Are you planning Bilibili integration?
- Which UI components are future-proofing vs dead code?

Answer these first, then execute cleanup.
