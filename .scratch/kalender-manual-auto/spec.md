# Kalender manual dengan Auto Run dari frontend

> Arsip proyek. Target, contoh dan hasil pemeriksaan di bawah mengikuti tahap pekerjaan saat dicatat. Untuk aturan kampanye yang berjalan sekarang, lihat [PRD](../../PRD.md).

Status: ready-for-agent

## Problem Statement

Pemain membutuhkan kendali untuk melanjutkan hari secara manual atau meminta frontend menjalankan kalender otomatis, termasuk pada prototipe 20 hari agar desain UI siap sebelum kampanye 50 hari. Engine harus selalu menunggu input: waktu nyata tidak boleh mengubah state permainan sendiri. Event, battle, laporan, dan reward wajib tidak terlewati oleh Auto. Pemula yang memakai Auto tanpa belanja harus tetap melihat bahwa aksi ekonomi hari itu masih tersedia.

## Solution

Sediakan Manual dan Auto di frontend. Manual menunggu klik Lanjut hari. Auto, setelah pemain menyalakan atau menekan Lanjutkan auto, memicu aksi Lanjut hari setiap lima detik melalui jalur yang sama dengan klik manual. Engine tetap reaktif: tanpa timer, tanpa mode auto, tanpa loop mandiri.

Auto dijeda saat event, battle, laporan, reward, akhir permainan, atau tab tersembunyi. Resume hanya eksplisit. Default Manual; load/refresh tidak menyalakan timer. Implementasi Fase A memakai kampanye 20 hari yang sudah ada; ruleset 50 hari belakangan memakai UI Auto yang sama tanpa redesign.

## User Stories

1. As a player, I want a new game to start in Manual, so that days do not advance before I am ready.
2. As a player, I want Lanjut hari to advance exactly one valid day, so that I control the calendar.
3. As a player, I want to enable Auto Run on the 20-day prototype, so that frontend design can ship without waiting for the 50-day ruleset.
4. As a player, I want Auto to call the same advance-day action as the manual button, so that rules stay consistent.
5. As a player, I want a five-second gap between automatic advances, so that I have time to spend gold.
6. As a player, I want upgrades and repairs to stay manual under Auto, so that Auto never spends for me.
7. As a player, I want to be allowed to skip spending a day, so that I can save gold.
8. As a player, I want a clear indicator when Auto is running and my daily economic action is still available, so that I do not lose the action by accident.
9. As a player, I want a visible countdown while Auto is running, so that I know when the next day will advance.
10. As a player, I want Auto to pause when an event starts, so that required choices are not skipped.
11. As a player, I want Auto to stay paused while event narrative loads or falls back, so that the day does not advance before the event is ready.
12. As a player, I want to choose event options myself, so that decisions remain mine.
13. As a player, I want Auto to stay paused after an event resolves, so that I can still shop that same day.
14. As a player, I want a Lanjutkan auto control, so that I consciously resume the calendar.
15. As a player, I want Auto to pause on battle-ready days, so that I start battles myself.
16. As a player, I want battle reports and rewards to stay manual, so that I can review outcomes.
17. As a player, I want Auto mode to remain selected while paused with a visible reason, so that I understand why time stopped.
18. As a player, I want switching to Manual to cancel pending ticks immediately, so that no surprise advance follows.
19. As a player, I want activating or resuming Auto to start a full five-second interval, so that advances are never instant.
20. As a player, I want a hidden tab to pause Auto, so that I do not lose action opportunities off-screen.
21. As a player, I want returning to the tab not to catch up missed days, so that progress stays understandable.
22. As a player, I want refresh or load to leave Auto not running, so that play does not continue without my readiness.
23. As a player, I want a new game not to inherit queued ticks from a previous run, so that runs do not mix.
24. As a frontend developer, I want the engine to change only through explicit actions, so that timing control can evolve without domain rule changes.
25. As a backend developer, I want day advancement only via player/FE actions, so that the server never schedules calendar ticks.
26. As a tester, I want injectable simulated time on the Auto controller, so that Auto behavior is deterministic in unit tests.
27. As a product owner, I want the same Auto UI to work later on a 50-day ruleset, so that we do not redesign toggles for production length.

## Implementation Decisions

- Testing seam (approved via plan): one public frontend `AutoRunController` surface — start, pause, resume, cancel, and tick — that invokes the same advance-day handler as the manual Lanjut hari control. Do not add Auto fields or timers to game domain state. Do not test private timer handles.
- Engine stays input-driven only. No wall-clock scheduling inside the rules engine. Errors such as event-required or invalid-phase must stop Auto in the frontend and show the reason.
- Auto is frontend-only. Interval is five full seconds from activate/resume and between successful ticks. Only one active schedule per UI context.
- Default mode for new games is Manual. Enabling Auto is an explicit player action. Load, refresh, and new game never restore a running timer; optional saved mode preference must not auto-start ticks.
- Auto may only dispatch advance-day while phase is preparation, the day is a preparation day, and no unresolved required event blocks advance. It never upgrades, repairs, chooses events/rewards, starts battle, or continues reports.
- Entering event, battleReady, battleReport, reward, gameOver, or victory pauses Auto immediately. After those resolve, Auto stays paused until Lanjutkan auto.
- Hidden document/tab pauses Auto; return requires explicit resume; no multi-day catch-up.
- Cancel pending work on Manual switch, pause, unload, new game, and run/context change. Verify run identity before applying a tick result.
- If advance-day is rejected, stop Auto, keep game state unchanged aside from the failed attempt’s lack of mutation, and surface the error code/message.
- When Auto is running and the daily economic action is still unused, the UI must show that the action remains available (alongside countdown).
- Phase A delivery target is the existing 20-day campaign. Phase B (50-day ruleset) reuses this UI without redesign; longer calendars are out of this feature’s engine work except smoke later.
- Initial integration may use the try/play UI or product frontend; do not put the scheduler in the engine package. Do not replace teammates’ final product UI wholesale—add the Auto controls where the calendar already lives.
- Balancing unchanged: city upgrade raises attack and defense; no recruitment; upgrade discounts only.

## Testing Decisions

- Good tests assert observable controller/UI state and resulting game day/phase/gold via the shared advance-day path—not private timer implementation details.
- Primary seam: AutoRunController with injected clock. Prefer Vitest. Engine behavior continues to be covered by existing public engine tests; Auto tests should not re-implement calendar rules.
- Prove: no day change without input; under Auto, no advance before five seconds; exactly one advance at the boundary when still valid.
- Prove: skip shopping remains allowed; action-available indicator conditions are covered when `actionUsedToday` is false under Auto.
- Prove: pause on event (including pending narrative/fallback), battleReady, report, reward, and end phases; resolve does not auto-resume.
- Prove: Manual cancel, double-activate, stale tick after run change, hidden tab, no catch-up, load/refresh not running.
- Prove: rejected advance stops Auto and leaves domain state consistent.
- Browser/manual checks for toggle, countdown, paused reason, Lanjutkan auto, and indicator complement unit tests.
- Phase A acceptance is 20-day campaign. Phase B smoke on 50-day ruleset is a later checklist, not a blocker for this spec’s FE delivery.

## Out of Scope

- Timers or Auto loops inside the game engine.
- Auto upgrade, repair, event choice, reward choice, battle start, or report continue.
- Offline progress, catch-up, player-configurable interval, battle animation systems.
- Implementing the 50-day ruleset itself (separate feature after playtest).
- Day-picker free length, build-time construction delays, recruitment.
- Spec-writing does not equal implementation; code lands via tickets.

## Further Notes

- Source plan: Auto Run 20-then-50 (frontend first on prototype length). Product docs: PRD §12 for later 50-day campaign; feature freeze still blocks unrelated speculative mechanics.
- Domain terms: run, phase, preparation, event, battleReady, battleReport, reward, revision, endPreparationDay.
- Issue tracker is local Markdown under this feature directory. Status `ready-for-agent` means ready to implement, not that Auto code has shipped.
