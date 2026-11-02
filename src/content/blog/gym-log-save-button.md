---
title: 'I built a save button for my gym spreadsheet with Apps Script'
description: 'One checkbox appends a dated copy of my workout sheet to a Log tab, so my spreadsheet stops forgetting. Free, no API key.'
pubDate: '2026-11-02'
---

I have tracked my lifts in the same spreadsheet for months, and I like it for a boring reason: nothing to open, nothing to tap through, no features I did not ask for. I type a number in a cell and I am done.

The problem is that typing in a cell destroys what was there. Every time I add five pounds to a squat, the old number is gone. After two months of training I had a perfectly current sheet and no history at all.

This is the fix: one checkbox that appends a dated copy of the whole sheet to a Log tab. Ten minutes, no API key, free.

## Why I built it instead of buying an app

I tried the obvious options first. Every gym app wants me to rebuild my program inside it, and my program already exists as a sheet I trust.

| Option | Cost | Why I passed |
| --- | --- | --- |
| Gym tracker apps (Strong, Hevy) | $5–10/month | Re-enter my whole program, learn their model of a workout |
| Apple Fitness | Free | Tracks sessions, not the weight on the bar |
| A web app I build myself | Free | I actually built one first. It worked and I still did not use it, because it was not my spreadsheet |
| Sheets + Apps Script | Free | Keeps the sheet exactly as it is, adds the one thing it was missing |

That third row is the honest part. I had a working page with a real Save button before I wrote a line of Apps Script, and I abandoned it. The sheet wins because it is already where I look.

## What you need

- A Google account
- A workout sheet with one exercise per row
- Ten minutes

No API key, no paid tier, no add-on. Apps Script is built into Google Sheets and the whole thing runs inside your own spreadsheet.

## The build: 4 steps

**1. Make sure it is a real Google Sheet.** My file was an `.xlsx` living in Drive. Opened that way, Sheets runs it in Office compatibility mode, which supports no Apps Script, no macros and no add-ons. File → Save as Google Sheets. This is step zero and it is the one that blocks everybody.

**2. Add a tab called `Log`.** The plus button at the bottom left, then rename it. The script writes here and never touches your main tab.

**3. Paste the script.** Extensions → Apps Script, delete the stub function, paste this:

```javascript
const SHEET_NAME = 'Iron Ledger';   // tab with your exercises
const LOG_NAME   = 'Log';           // tab the history goes to
const CHECKBOX   = 'A1';            // cell you tick to save

function logSession() {
  const ss  = SpreadsheetApp.getActive();
  const src = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  const log = ss.getSheetByName(LOG_NAME) || ss.insertSheet(LOG_NAME);

  if (log.getLastRow() === 0) {
    log.appendRow(['Date', 'Exercise', 'Weight', 'Reps', 'Weight 2', 'Reps 2', 'Note']);
    log.setFrozenRows(1);
  }

  const data = src.getDataRange().getValues();
  const today = new Date();
  const rows = [];
  let started = false;

  data.forEach(r => {
    const name = String(r[1]).trim();   // column B
    const type = String(r[2]).trim();   // column C
    if (/^Day\s*\d/i.test(name)) { started = true; return; }
    if (!started || !name) return;
    if (type !== 'Compound' && type !== 'Accessory') return;
    rows.push([today, name, r[4], r[5], r[6], r[7], r[8]]);
  });

  if (!rows.length) throw new Error('No exercise rows found — check SHEET_NAME and column C.');

  const start = log.getLastRow() + 1;
  log.getRange(start, 1, rows.length, 7).setValues(rows);
  log.getRange(start, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
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

Change the three constants at the top to match your tabs and column letters. Save, then pick `logSession` from the dropdown and hit Run once. Google asks for permission; approve it. That first run also writes a snapshot, so you can check the Log tab looks right.

**4. Add the checkbox.** Back in the sheet, click cell A1 on your exercise tab, then Insert → Checkbox. Tick it. The rows appear in Log and the box clears itself.

## The gotchas I hit (so you don't)

| What happened | Why | Fix |
| --- | --- | --- |
| No Apps Script in the Extensions menu | The file was `.xlsx` in Drive, running in Office compatibility mode | File → Save as Google Sheets first |
| A VBA macro disappeared | Drive strips VBA from `.xlsm` on the way in | Do not start in desktop Excel if the file lives in Drive |
| The button did nothing on my phone | Drawings with an assigned script do not fire in the Sheets mobile app | Use a checkbox and `onEdit`, which does |
| One exercise logged twice | A leftover example row above Day 1 looked like a real exercise | The `started` flag: skip everything until the first row matching `Day 1` |
| One exercise never logged | That row had `3x25` sitting in the Type column instead of `Accessory` | Fix the cell, or loosen the type check |

The mobile one cost me the most. Every tutorial shows the drawing-plus-assign-script approach, and it works fine on a laptop, which is not where I am standing when I finish a set.

## Why a checkbox and not a button

A checkbox is a cell value, so editing it fires `onEdit`, and `onEdit` runs everywhere Sheets runs, phone included. A drawing with an assigned script is a desktop-only object. That single constraint picked the design.

The nice side effect is that the script unticks the box for you, on the last line of `onEdit`. You never clear it yourself. If the box stays ticked, the script did not run, which turns the control into its own error light.

## Cost, and what's next

Free. No API, no model call, no subscription. Apps Script's quotas are far above one tick a day.

One design decision worth stealing: the Log tab stores one row per exercise per session, not one wide row per session. Wide looks tidier when you first see it, and then it breaks the moment you add an exercise, because every past row is now a column short. Long format never breaks, and a pivot table over it gives you any trend you want later.

Two things I left undone on purpose. Ticking twice in one day appends the same date twice, which a pivot shrugs off but still bothers me; a few lines to delete an existing block for that date would fix it. And there is no trend view yet — I wanted the saving to be real before I built anything to look at. That is part 2.

The whole thing is about fifty lines and it does one job: stop my spreadsheet from forgetting.
