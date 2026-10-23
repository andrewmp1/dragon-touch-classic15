// Server-rendered agenda for the Classic15 Pro stock browser (Android 4.4 / Chromium 30).
// The stylesheet stays on properties that browser implements: no flex, grid, variables, clamp, or gap.

export const agendaCss = `
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; background: #14110e; color: #f3ecdf; }
  body {
    font-family: sans-serif;
    padding: 22px 32px 16px;
    overflow: hidden;
    -webkit-text-size-adjust: 100%;
  }
  .top { display: table; width: 100%; border-bottom: 1px solid #3a322a; padding-bottom: 14px; }
  .top-date, .top-clock { display: table-cell; vertical-align: bottom; }
  .top-clock { text-align: right; }
  .kicker {
    font-size: 20px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #a89880;
  }
  .date { font-size: 58px; line-height: 1; font-weight: bold; margin-top: 4px; }
  .clock { font-size: 52px; line-height: 1; font-weight: bold; color: #e8a04a; }
  .board { display: table; width: 100%; margin-top: 16px; }
  .col { display: table-cell; vertical-align: top; }
  .col-today { width: 58%; padding-right: 22px; }
  .col-next { width: 42%; border-left: 1px solid #3a322a; padding-left: 22px; }
  .col-label {
    font-size: 18px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #e8a04a;
    margin-bottom: 8px;
  }
  .event { display: table; width: 100%; border-top: 1px solid #3a322a; }
  .event-time, .event-body { display: table-cell; vertical-align: top; }
  .event-time {
    width: 148px;
    padding: 12px 12px 12px 0;
    font-size: 24px;
    line-height: 1.2;
    font-weight: bold;
    color: #e8a04a;
  }
  .event-now .event-time { background: #e8a04a; color: #1a120c; padding-left: 8px; }
  .event-body { padding: 10px 0 12px; }
  .event-title { font-size: 30px; line-height: 1.15; font-weight: bold; word-wrap: break-word; }
  .event-meta { font-size: 18px; line-height: 1.3; color: #a89880; margin-top: 3px; word-wrap: break-word; }
  .allday .event-time {
    font-size: 16px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #f0d7b0;
  }
  .quiet { font-size: 26px; line-height: 1.35; color: #a89880; padding: 16px 0; }
  .day-block { margin-bottom: 12px; }
  .day-name { font-size: 20px; font-weight: bold; color: #f3ecdf; padding: 8px 0 2px; }
  .next-event { display: table; width: 100%; }
  .next-time, .next-body { display: table-cell; vertical-align: top; }
  .next-time { width: 108px; padding: 3px 8px 3px 0; font-size: 18px; font-weight: bold; color: #e8a04a; }
  .next-body { padding: 3px 0; font-size: 20px; line-height: 1.25; word-wrap: break-word; }
  .more { font-size: 16px; color: #a89880; padding: 2px 0 4px; }
  .foot { margin-top: 14px; font-size: 16px; color: #a89880; }
  .warn { color: #e8a04a; }
  .setup { max-width: 920px; padding-top: 28px; }
  .setup h1 { font-size: 48px; line-height: 1.05; font-weight: bold; margin: 0 0 16px; }
  .setup p { font-size: 26px; line-height: 1.35; margin: 0 0 14px; }
  .setup code { font-size: 22px; color: #f0d7b0; }
  .views { font-size: 19px; margin-top: 10px; }
  .views a { color: #a89880; text-decoration: none; margin-right: 18px; }
  .views .on { color: #e8a04a; font-weight: bold; }
  .wide { display: table; width: 100%; margin-top: 16px; }
  .wide-label {
    font-size: 18px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #e8a04a;
    margin-bottom: 8px;
  }
  .week, .month { width: 100%; table-layout: fixed; border-collapse: collapse; }
  .week td, .month td {
    vertical-align: top;
    border: 1px solid #3a322a;
    padding: 8px 8px 10px;
    height: 176px;
  }
  .cell-day {
    font-size: 18px;
    font-weight: bold;
    color: #f3ecdf;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
    white-space: nowrap;
  }
  .wevent { margin-top: 6px; font-size: 15px; line-height: 1.25; word-wrap: break-word; }
  .wtime { font-weight: bold; color: #e8a04a; }
  .woff .cell-day { color: #6a5f51; }
  .woff .wevent { color: #9a8d7a; }
  .month td { height: 96px; }
  .month .cell-day { font-size: 16px; margin-bottom: 2px; }
  .month .wevent { font-size: 13px; margin-top: 2px; white-space: nowrap; overflow: hidden; }
  .mevent-more { font-size: 12px; color: #a89880; }
  .cell-now .cell-day { color: #e8a04a; }
  .day-caption { font-size: 16px; color: #a89880; margin-top: 4px; }
`;

const TODAY_CAP = 6;
const NEXT_PER_DAY = 2;

export function renderAgenda(opts) {
  const now = opts.now;
  const tz = opts.tz;
  const view = opts.view || 'agenda';
  const body = opts.configError
    ? setupBlock('The agenda settings need a fix', escapeHtml(opts.configError))
    : !opts.configured
      ? setupBlock(
          'Add the private calendar link',
          'On the computer running this page, copy <code>agenda/calendars.env.example</code> to <code>agenda/calendars.env</code> and paste the secret iCal address. The next refresh reads that file.',
        )
      : viewBody(view, opts);

  const warning = opts.warning
    ? '<div class="foot warn">' + escapeHtml(opts.warning) + '</div>'
    : '';
  const checked = opts.fetchedAt
    ? '<div class="foot">Feed checked ' + escapeHtml(formatTime(opts.fetchedAt, tz)) + '. This page refreshes every minute.</div>'
    : '<div class="foot">This page refreshes every minute.</div>';

  return '<!DOCTYPE html>\n<html>\n<head>\n'
    + '<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<meta http-equiv="refresh" content="60'
    + (view && view !== 'agenda' ? ';url=/?view=' + view : '')
    + '">\n'
    + '<title>Agenda</title>\n<style>' + agendaCss + '</style>\n</head>\n<body>\n'
    + header(now, tz, view)
    + body
    + warning
    + checked
    + '\n</body>\n</html>\n';
}

const VIEWS = ['agenda', 'day', 'week', 'month'];
const VIEW_LABELS = { agenda: 'Agenda', day: 'Day', week: 'Week', month: 'Month' };

function viewNav(view) {
  let html = '<div class="views">';
  for (const name of VIEWS) {
    const cls = name === view ? ' class="on"' : '';
    html += '<a' + cls + ' href="?view=' + name + '">' + VIEW_LABELS[name] + '</a>';
  }
  return html + '</div>';
}

function header(now, tz, view) {
  return '<div class="top"><div class="top-date">'
    + '<div class="kicker">' + escapeHtml(formatWeekday(now, tz)) + '</div>'
    + '<div class="date">' + escapeHtml(formatDate(now, tz)) + '</div>'
    + '</div><div class="top-clock"><div class="clock">' + escapeHtml(formatTime(now, tz)) + '</div></div></div>'
    + viewNav(view || 'agenda');
}

function viewBody(view, opts) {
  if (view === 'day') return dayView(opts);
  if (view === 'week') return weekView(opts);
  if (view === 'month') return monthView(opts);
  return board(opts);
}

function setupBlock(title, html) {
  return '<div class="setup"><h1>' + escapeHtml(title) + '</h1><p>' + html + '</p></div>';
}

function board(opts) {
  const today = dayKey(opts.now, opts.tz);
  const names = showNames(opts.calendars, opts.events);
  const todayEvents = eventsOn(opts.events, today, opts.tz).filter((ev) => stillGoing(ev, opts.now));
  const todayHtml = eventList(todayEvents, opts, names);
  let nextHtml = '';
  for (let i = 1; i < opts.days; i++) {
    const key = addDays(today, i);
    const rows = eventsOn(opts.events, key, opts.tz);
    if (rows.length === 0) continue;
    nextHtml += dayBlock(key, rows, opts, names);
  }
  if (!nextHtml) nextHtml = '<div class="quiet">Nothing scheduled after today.</div>';
  return '<div class="board"><div class="col col-today"><div class="col-label">Today</div>'
    + (todayHtml || '<div class="quiet">Nothing else today.</div>')
    + '</div><div class="col col-next"><div class="col-label">Next</div>'
    + nextHtml
    + '</div></div>';
}

function eventList(events, opts, names) {
  const shown = events.slice(0, TODAY_CAP);
  let html = '';
  for (const ev of shown) html += todayRow(ev, opts, names);
  if (events.length > shown.length) {
    html += '<div class="more">and ' + (events.length - shown.length) + ' more today</div>';
  }
  return html;
}

function todayRow(ev, opts, names) {
  const now = opts.now;
  const happening = !ev.allDay && Date.parse(ev.start) <= now && Date.parse(ev.end) > now;
  const cls = 'event' + (ev.allDay ? ' allday' : '') + (happening ? ' event-now' : '');
  const when = ev.allDay ? 'All day' : (happening ? 'Now' : formatTime(Date.parse(ev.start), opts.tz));
  return '<div class="' + cls + '"><div class="event-time">' + escapeHtml(when) + '</div>'
    + '<div class="event-body"><div class="event-title">' + escapeHtml(ev.title) + '</div>'
    + metaLine(ev, dayKey(now, opts.tz), opts.tz, names)
    + '</div></div>';
}

function dayBlock(key, events, opts, names) {
  const shown = events.slice(0, NEXT_PER_DAY);
  let rows = '';
  for (const ev of shown) {
    const when = ev.allDay ? 'All day' : formatTime(Date.parse(ev.start), opts.tz);
    rows += '<div class="next-event"><div class="next-time">' + escapeHtml(when) + '</div>'
      + '<div class="next-body">' + escapeHtml(ev.title) + metaLine(ev, key, opts.tz, names) + '</div></div>';
  }
  if (events.length > shown.length) {
    rows += '<div class="more">+' + (events.length - shown.length) + ' more</div>';
  }
  return '<div class="day-block"><div class="day-name">' + escapeHtml(formatDayKey(key)) + '</div>' + rows + '</div>';
}

// Full list for today, no cap: the day view.
function dayView(opts) {
  const today = dayKey(opts.now, opts.tz);
  const names = showNames(opts.calendars, opts.events);
  const rows = eventsOn(opts.events, today, opts.tz);
  const html = rows.map((ev) => todayRow(ev, opts, names)).join('');
  return '<div class="wide"><div class="wide-label">Today</div>'
    + (html || '<div class="quiet">Nothing scheduled today.</div>')
    + '</div>';
}

// Today and the next 6 days, one column per day.
function weekView(opts) {
  const today = dayKey(opts.now, opts.tz);
  const names = showNames(opts.calendars, opts.events);
  let cols = '';
  for (let i = 0; i < 7; i++) {
    const key = addDays(today, i);
    const rows = eventsOn(opts.events, key, opts.tz);
    const mark = i === 0 ? '<div class="cell-day">Today</div>' : '<div class="cell-day">' + escapeHtml(screenDayLabel(key)) + '</div>';
    let list = '';
    for (const ev of rows) {
      const when = ev.allDay ? 'All day' : formatTime(Date.parse(ev.start), opts.tz);
      list += '<div class="wevent"><span class="wtime">' + escapeHtml(when) + '</span> '
        + escapeHtml(ev.title) + '</div>';
    }
    cols += '<td class="weekday' + (i === 0 ? ' cell-now' : '') + '">' + mark + list + '</td>';
  }
  return '<table class="week"><tr>' + cols + '</tr></table>';
}

// The calendar month that contains today, Sunday start.
function monthView(opts) {
  const today = dayKey(opts.now, opts.tz);
  const [ty, tm, td] = today.split('-').map(Number);
  const first = new Date(Date.UTC(ty, tm - 1, 1));
  const lead = first.getUTCDay(); // 0 = Sunday
  const startKey = addDays(today.slice(0, 8) + '01', -lead);
  const dow = new Intl.DateTimeFormat('en-US', { weekday: 'narrow', timeZone: 'UTC' });
  let heads = '';
  for (let d = 0; d < 7; d++) heads += '<td class="weekday">' + escapeHtml(
    dow.format(new Date(Date.UTC(2021, 0, 3 + d))) // 2021-01-03 was a Sunday
  ) + '</td>';
  const monthPrefix = today.slice(0, 8);
  let body = '';
  let key = startKey;
  for (let r = 0; r < 6; r++) {
    let row = '';
    for (let c = 0; c < 7; c++) {
      const dayNum = Number(key.slice(8));
      const off = key < monthPrefix + '01' || Number(key.slice(5, 7)) !== tm;
      const isToday = key === today;
      const rows = eventsOn(opts.events, key, opts.tz);
      let list = '';
      for (let i = 0; i < Math.min(rows.length, 4); i++) {
        const ev = rows[i];
        const when = ev.allDay ? '' : '<span class="wtime">' + escapeHtml(formatTime(Date.parse(ev.start), opts.tz)) + '</span> ';
        list += '<div class="wevent">' + when + escapeHtml(ev.title) + '</div>';
      }
      if (rows.length > 4) {
        list += '<div class="mevent-more">+' + (rows.length - 4) + ' more</div>';
      }
      row += '<td class="' + (off ? 'woff ' : '') + (isToday ? 'cell-now ' : '') + 'mday">'
        + '<div class="cell-day">' + dayNum + '</div>' + list + '</td>';
      key = addDays(key, 1);
    }
    body += '<tr>' + row + '</tr>';
    if (Number(key.slice(5, 7)) !== tm && Number(key.slice(8)) > 7) break;
  }
  return '<table class="month"><tr class="mhead">' + heads + '</tr>' + body + '</table>'
    + '<div class="day-caption">' + escapeHtml(
      new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(ty, tm - 1, 1)))
    ) + '</div>';
}

function screenDayLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function metaLine(ev, key, tz, names) {
  const bits = [];
  if (ev.allDay) {
    const last = addDays(ev.end, -1);
    if (key < last) bits.push('through ' + formatDayKey(last));
  }
  if (ev.location) bits.push(ev.location);
  if (names && names[ev.cal]) bits.push(names[ev.cal]);
  if (bits.length === 0) return '';
  return '<div class="event-meta">' + escapeHtml(bits.join(' · ')) + '</div>';
}

function showNames(calendars, events) {
  if (!calendars || calendars.length < 2) return null;
  const used = new Set(events.map((ev) => ev.cal));
  if (used.size < 2) return null;
  return calendars.map((cal, i) => cal.name || ('Calendar ' + (i + 1)));
}

function eventsOn(events, key, tz) {
  return events.filter((ev) => covers(ev, key, tz)).sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return String(a.start).localeCompare(String(b.start)) || a.title.localeCompare(b.title);
  });
}

function covers(ev, key, tz) {
  if (ev.allDay) return ev.start <= key && key < ev.end;
  const startKey = dayKey(Date.parse(ev.start), tz);
  const endKey = dayKey(Date.parse(ev.end) - 1, tz);
  return key >= startKey && key <= endKey;
}

function stillGoing(ev, now) {
  if (ev.allDay) return true;
  return Date.parse(ev.end) > now;
}

function dayKey(ms, tz) {
  const parts = {};
  for (const { type, value } of new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(ms))) {
    if (type !== 'literal') parts[type] = value;
  }
  return parts.year + '-' + parts.month + '-' + parts.day;
}

function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function formatWeekday(ms, tz) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(new Date(ms));
}
function formatDate(ms, tz) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'long', day: 'numeric' }).format(new Date(ms));
}
function formatTime(ms, tz) {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
}
function formatDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}
