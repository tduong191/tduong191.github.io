const SHEET_NAME = 'Iron Ledger';   // your exercise tab
const LOG_NAME   = 'Log';           // where history goes
const CHECKBOX   = 'A1';            // tick to save now

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
    if (String(r[4]).trim() === '' && String(r[5]).trim() === '') return;   // nothing recorded yet
    rows.push([name, r[4], r[5]]);      // name, Weight, Reps
  });
  return rows;
}

function fingerprint_(rows) {
  return rows.map(r => r.join('\u0001')).join('\u0002');
}

function latestByExercise_(log, skipKey) {
  const map = {};
  const last = log.getLastRow();
  if (last < 2) return map;
  log.getRange(2, 1, last - 1, 4).getValues().forEach(v => {
    if (keyOf_(v[0]) === skipKey) return;
    map[String(v[1]).trim()] = v[2] + '|' + v[3];
  });
  return map;
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
    log.appendRow(['Date', 'Exercise', 'Weight', 'Reps']);
    log.setFrozenRows(1);
  }
  const today = new Date();
  const key   = dateKey_(today);
  const prev  = latestByExercise_(log, key);
  const rows  = readSheet_().filter(r => prev[r[0]] !== r[1] + '|' + r[2]);  // only what changed
  removeRowsFor_(log, key);                       // one block per date
  if (!rows.length) return;
  const start = log.getLastRow() + 1;
  log.getRange(start, 1, rows.length, 4).setValues(rows.map(r => [today].concat(r)));
  log.getRange(start, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
}

function autoSave() {
  const current = readSheet_();
  if (!current.length) return;
  if (PropertiesService.getScriptProperties().getProperty('base') === fingerprint_(current)) return;
  logSession();
}

function markBaseline() {   // run after editing the sheet without training
  PropertiesService.getScriptProperties().setProperty('base', fingerprint_(readSheet_()));
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
