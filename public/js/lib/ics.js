// iCalendar (.ics) export so planned activities become reminders in any calendar app — no server needed.

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line) => { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); };
/** 'YYYY-MM-DDTHH:MM' (local) → floating local time 'YYYYMMDDTHHMM00' */
export function floating(local) {
  const d = new Date(local);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}
export function utcStamp(d = new Date()) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
/**
 * events: [{ title, start: 'YYYY-MM-DDTHH:MM', minutes, description, rrule?: 'FREQ=WEEKLY;BYDAY=MO,WE', alarm?: minutes }]
 */
export function buildICS(events, { calName = 'CBT Toolkit' } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CBT Toolkit//Practice Planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(calName)}`];
  events.forEach((ev, i) => {
    const start = new Date(ev.start);
    const end = new Date(start.getTime() + (ev.minutes || 30) * 60000);
    const endLocal = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    lines.push('BEGIN:VEVENT', `UID:${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 8)}@cbt-toolkit`, `DTSTAMP:${utcStamp()}`,
      `DTSTART:${floating(ev.start)}`, `DTEND:${floating(endLocal)}`, fold(`SUMMARY:${esc(ev.title)}`));
    if (ev.description) lines.push(fold(`DESCRIPTION:${esc(ev.description)}`));
    if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', fold(`DESCRIPTION:${esc(ev.title)}`), `TRIGGER:-PT${ev.alarm ?? 10}M`, 'END:VALARM', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
