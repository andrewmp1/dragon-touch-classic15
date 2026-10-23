import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendaCss, renderAgenda } from '../render.js';

const now = Date.parse('2026-10-22T18:00:00Z'); // 1:00 PM CDT
const events = [
  { uid: '1', cal: 0, allDay: true, title: 'Grandma <visiting>', start: '2026-10-22', end: '2026-10-24' },
  { uid: '2', cal: 0, allDay: false, title: 'Vitamins', start: '2026-10-22T12:00:00.000Z', end: '2026-10-22T12:15:00.000Z' },
  { uid: '3', cal: 0, allDay: false, title: 'Soccer', start: '2026-10-22T22:00:00.000Z', end: '2026-10-22T23:30:00.000Z', location: 'Park' },
  { uid: '4', cal: 1, allDay: false, title: 'Dentist', start: '2026-10-23T15:00:00.000Z', end: '2026-10-23T16:00:00.000Z' },
];

function page(extra = {}) {
  return renderAgenda({
    now,
    tz: 'America/Chicago',
    days: 7,
    events,
    calendars: [{ name: 'Family' }, { name: 'Home' }],
    warning: '',
    fetchedAt: now,
    configured: true,
    configError: '',
    ...extra,
  });
}

test('the page is server-rendered HTML the stock browser can style', () => {
  assert.doesNotMatch(agendaCss, /display\s*:\s*flex/);
  assert.doesNotMatch(agendaCss, /display\s*:\s*grid/);
  assert.doesNotMatch(agendaCss, /var\s*\(/);
  assert.doesNotMatch(agendaCss, /clamp\s*\(/);
  assert.doesNotMatch(agendaCss, /(?:^|[^a-z-])gap\s*:/);
  assert.doesNotMatch(agendaCss, /position\s*:\s*sticky/);
  const html = page();
  assert.match(html, /<meta http-equiv="refresh" content="60">/);
  assert.doesNotMatch(html, /<script/i);
});

test('today keeps what is left and escapes titles', () => {
  const html = page();
  assert.match(html, /Thursday/);
  assert.match(html, /October 22/);
  assert.match(html, /1:00 PM/);
  assert.match(html, /Grandma &lt;visiting&gt;/);
  assert.match(html, /Soccer/);
  assert.match(html, /Park/);
  assert.doesNotMatch(html, /Vitamins/);
  assert.match(html, /Friday, Oct 23/);
  assert.match(html, /Dentist/);
  assert.match(html, /Home/);
  assert.match(html, /through Friday, Oct 23/);
});

test('a single calendar omits its name', () => {
  const html = page({
    events: events.filter((ev) => ev.cal === 0),
    calendars: [{ name: 'Family' }],
  });
  assert.doesNotMatch(html, /Family/);
});

test('missing settings explain where the link goes and do not invent a feed', () => {
  const html = page({ configured: false, events: [], calendars: [] });
  assert.match(html, /calendars\.env/);
  assert.doesNotMatch(html, /Soccer|Dentist|https?:\/\//);
});

test('the header offers all four views with the active one marked', () => {
  const defaultHtml = page();
  assert.match(defaultHtml, /href="\?view=agenda" class="on"|class="on" href="\?view=agenda"/);
  assert.match(defaultHtml, /href="\?view=day"/);
  assert.match(defaultHtml, /href="\?view=week"/);
  assert.match(defaultHtml, /href="\?view=month"/);
  const dayHtml = page({ view: 'day' });
  assert.match(dayHtml, /href="\?view=day" class="on"|class="on" href="\?view=day"/);
});

test('day view shows the whole day without the day cap', () => {
  const html = page({ view: 'day' });
  assert.match(html, /Soccer/);
  assert.match(html, /Park/);
  assert.match(html, /Grandma &lt;visiting&gt;/);
  assert.doesNotMatch(html, /Dentist/); // tomorrow stays out
});

test('week view lays out seven day columns', () => {
  const html = page({ view: 'week' });
  assert.match(html, /<table class="week">/);
  assert.match(html, /Today/);
  assert.match(html, /Soccer/);
  assert.match(html, /Dentist/); // Friday column
});

test('month view keeps today going and daylight flows', () => {
  const html = page({ view: 'month' });
  assert.match(html, /<table class="month">/);
  assert.match(html, /October 2026/);
  assert.match(html, /cell-now/m);
  assert.match(html, /Soccer/);
  assert.match(html, /Dentist/); // Oct 23 has a column in the grid
});
