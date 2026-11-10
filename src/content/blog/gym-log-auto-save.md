---
title: 'Gym log, part 2: I made my spreadsheet save itself'
description: 'The save button worked. I kept forgetting to press it. A nightly trigger that compares the sheet to the last log entry fixed it, without logging phantom sessions.'
pubDate: '2026-11-07'
---

This is part 2. [Part 1](/blog/gym-log-save-button/) built a checkbox in a Google Sheet that appends a dated copy of my workout to a Log tab. If you have not built that yet, start there, because this post replaces its script.

The first build worked exactly as designed, and it still failed, because it needed me to remember something at 9:40am on my way out of the gym.

## The problem

The checkbox is one tap. The trouble is when the tap has to happen: last set finished, bag on my shoulder, thinking about getting to work. I would notice two days later that the session was never logged, and by then I could not remember whether I had done 100 or 105 on the squat.

A build that depends on the user doing one small thing at the worst possible moment is not finished. It just moved the work.

## What I used

Nothing new. The same Google Sheet, the same Apps Script project, plus one time-driven trigger. No app, no API key, still free.

## The options I considered

| Option | Effort | Why |
| --- | --- | --- |
| A reminder at 10am | 5 min | Still depends on me. Moves the forgetting, does not remove it |
| Auto-save on a nightly trigger | 15 min | No phone setup, nothing to remember. Misses sessions where nothing changed |
| Leave-the-gym location trigger | An hour+ | Truly hands-free, but needs the script deployed as a web app with a URL I have to keep private, and location triggers are fussy |

I took the middle one. The location version is the better story and the worse first move — I would have been debugging geofences before knowing whether the simple thing already solved it.

## How it works

The obvious design is a dirty flag: `onEdit` marks "the sheet was touched today," and the nightly trigger saves if the flag is set.

I did not do that, and the reason is the interesting part. The flag depends on `onEdit` firing when I edit from my phone at the gym. I believe it does, but I have not confirmed it on my own device, and if it does not, auto-save silently never runs — which is the exact bug I am trying to fix, now hidden behind a trigger I would assume was working.

So the trigger does not ask whether anything was edited. It asks whether the sheet currently differs from the last block in the Log tab:

- Read the exercise rows as they stand now
- Read the most recent dated block out of Log
- Compare them as strings
- Different, or Log is empty, save a new dated block. Identical, do nothing

No flag, no state, nothing to get out of sync. It also means a rest day costs nothing: the sheet has not changed, so the trigger looks and leaves.

Two bits of plumbing came along with it. Saving now deletes any existing rows for today's date before writing, so a manual tick followed by a nightly run leaves one block instead of two — this was the duplicate-date bug I left open in part 1. And `installAutoSave()` creates the trigger from code rather than clicking through the UI, so the setup is reproducible.

## Copy it

Replace your whole `Code.gs` with this, then run `installAutoSave` once from the dropdown and approve the permission prompt. It is broader than last time because creating triggers needs it.

```javascript
const SHEET_NAME = 'Workout';   // your exercise tab, named exactly as in part 1
const LOG_NAME   = 'Log';
const CHECKBOX   = 'A1';

function tz_()        { return SpreadsheetApp.getActive().getSpreadsheetTimeZone(); }
function dateKey_(d)  { return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd'); }
function keyOf_(v)    { return (v instanceof Date) ? dateKey_(v) : String(v).trim(); }

function readSheet_() {
  const ss  = SpreadsheetApp.getActive();
  const src = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const rows = [];
  let started = false;
  src.getDataRange().getValues().forEach(r => {
    const name = String(r[1]).trim();   // column B
    const type = String(r[2]).trim();   // column C
    if (/^Day\s*\d/i.test(name)) { started = true; return; }
    if (!started || !name) return;
    if (type !== 'Compound' && type !== 'Accessory') return;
    rows.push([name, r[4], r[5], r[6], r[7], r[8]]);
  });
  return rows;
}

function fingerprint_(rows) {
  return rows.map(r => r.join('\u0001')).join('\u0002');
}

function lastLogged_(log) {
  const last = log.getLastRow();
  if (last < 2) return null;
  const vals = log.getRange(2, 1, last - 1, 7).getValues();
  const key  = keyOf_(vals[vals.length - 1][0]);
  return { key: key, rows: vals.filter(v => keyOf_(v[0]) === key).map(v => v.slice(1)) };
}

function removeRowsFor_(log, key) {
  const last = log.getLastRow();
  if (last < 2) return;
  const vals = log.getRange(2, 1, last - 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (vals[i][0] && keyOf_(vals[i][0]) === key) log.deleteRow(i + 2);
  }
}

function logSession() {
  const ss  = SpreadsheetApp.getActive();
  const log = ss.getSheetByName(LOG_NAME) || ss.insertSheet(LOG_NAME);

  if (log.getLastRow() === 0) {
    log.appendRow(['Date', 'Exercise', 'Weight', 'Reps', 'Weight 2', 'Reps 2', 'Note']);
    log.setFrozenRows(1);
  }

  const rows = readSheet_();
  if (!rows.length) throw new Error('No exercise rows found — check SHEET_NAME and column C.');

  const today = new Date();
  removeRowsFor_(log, dateKey_(today));           // one block per date

  const start = log.getLastRow() + 1;
  log.getRange(start, 1, rows.length, 7).setValues(rows.map(r => [today].concat(r)));
  log.getRange(start, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
}

function autoSave() {
  const ss  = SpreadsheetApp.getActive();
  const log = ss.getSheetByName(LOG_NAME);
  const current = readSheet_();
  if (!current.length) return;

  const prev = log ? lastLogged_(log) : null;
  if (prev && fingerprint_(prev.rows) === fingerprint_(current)) return;  // nothing changed

  logSession();
}

function installAutoSave() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'autoSave') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('autoSave').timeBased().atHour(21).everyDays(1).create();
}

function onEdit(e) {
  if (!e || !e.range) return;
  if (e.range.getSheet().getName() !== SHEET_NAME) return;
  if (e.range.getA1Notation() !== CHECKBOX) return;
  if (e.value !== 'TRUE') return;
  logSession();
  e.range.setValue(false);
}
```

If your exercise tab is not called `Workout`, change `SHEET_NAME` to match. The checkbox ignores edits on any other tab, and it fails silently.

Check the clock icon in the left sidebar afterwards — one daily `autoSave` trigger should be listed.

To test it without waiting for the evening: change one weight, run `autoSave` from the dropdown, and watch a dated block appear in Log. Run it again straight away. Nothing should happen, which proves the no-op path and the dedupe at the same time.

## What broke

Honest status: I installed this today, so it has not yet fired on its own schedule. Everything below is from building and testing it by hand, not from a month of use. I will update this post once it has run unattended for a couple of weeks.

**9pm is not 9pm.** `atHour(21)` means the trigger runs somewhere between 9pm and 10pm in the script's timezone — Google's own docs describe `atHour` that way, and `nearMinute()` is documented as plus or minus 15 minutes. If you want something to happen at a precise time, time-driven triggers are the wrong tool.

**The comparison is string equality, so formatting counts.** A weight stored as text in one row and as a number in another can read as a change when nothing changed. Mine are consistent, so this has not bitten me, but it is the fragile part of the design.

**The real gap: identical sessions.** If I train and change nothing — same weights, same reps as last time — the fingerprint matches and nothing is logged. The day disappears. The checkbox is still there for that case, so I have not removed the thing I forget, only narrowed it to the days where there was nothing to record anyway.

I went back and forth on that one. The alternative is logging every single day whether I trained or not, which fills the Log with rest days and makes "did I actually go" unanswerable. I would rather miss a flat session than invent fifty.

## Next

A trend view, finally. Now that saving happens without me, there is something worth looking at — a pivot over the Log tab, or a small chart per exercise.

After that, the location trigger. If "identical session" turns out to be common, leaving the gym is the only signal that actually means "I trained," and it is worth the web app deployment to get it.

Sources: [ClockTriggerBuilder](https://developers.google.com/apps-script/reference/script/clock-trigger-builder)
