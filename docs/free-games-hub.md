# Free games hub — local implementation

## Agreed experience

- Homepage keeps the Classendo demo beside Play Free Games, with minimal copy.
- Existing games artwork/grid remains. All ten implemented games are available.
- Guests use topics. Signed-in teachers can toggle Topics / My Lesson Tray.
- Topics mode asks teachers to pick a game first. Tray mode opens the game directly.
- The topic picker includes all 24 sets (242 cards), category filters, and eight sets per page: four columns on desktop, three pages unfiltered. Smaller screens use fewer columns.
- Each topic card has one image, Preview, and a larger Start Game button. Preview shows all cards without changing the tray.
- Starting a public topic writes its complete set to a signed-in teacher's real lesson tray, confirming before replacing different cards. Gameplay does not consume that tray. Guests never read or write the account tray.
- Public sets are unlimited for everyone. Unchanged public cards in the tray remain free. Custom vocabulary uses the existing weekly-game / Premium access rules.
- Yes/No and Choose Your Side retain teacher sentence setup; public-topic drafts survive a refresh in the same tab. Saving preparation requires Premium.
- Completion offers Play Again, Change Topic, Change Game, and Use Your Own Vocabulary. Replay resets progress/scores and preserves game settings and teacher sentences. Change Game offers the same topic or another topic.
- Unconfirmed users keep free access. Email confirmation uses the existing two-week Premium trial. Expired trials return to the free rules unless the teacher upgrades.
- Signup and new verification emails carry a validated game/topic return destination. No accounts or subscriptions were created for testing.

## Local verification

- `node --import tsx --test lib/games/session.test.ts`
- `node tests/free-games-browser.mjs` (local server; account states and writes mocked)
- `node tests/free-games-completion.mjs` (local server; real game interactions, accelerated timers, tracking writes mocked)
- `npx tsc --noEmit`
- `npm run build -- --webpack`

The topic images refer to existing public Classendo assets. All 235 distinct image URLs passed read-only availability checks.

## Before deployment

Apply `supabase/sql/free-game-prompt-access.sql` with the release to enforce Premium saving of game preparation in the database. It composes with the existing ownership and email-verification policies and requires the existing Premium/trial function. This migration has NOT been applied to the live database.

This work is local only. Live signup, confirmation-email delivery, and checkout were not exercised; browser account tests simulate unconfirmed free, active trial, expired trial, and paid Premium states.
