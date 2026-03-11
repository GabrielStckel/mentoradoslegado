// Feriados nacionais brasileiros
// Feriados fixos + móveis (Páscoa-dependentes) calculados dinamicamente

function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export interface Holiday {
  date: Date;
  name: string;
}

export function getHolidaysForYear(year: number): Holiday[] {
  const easter = getEasterDate(year);
  const addDaysToDate = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  return [
    { date: new Date(year, 0, 1), name: 'Ano Novo' },
    { date: addDaysToDate(easter, -47), name: 'Carnaval' },
    { date: addDaysToDate(easter, -46), name: 'Carnaval' },
    { date: addDaysToDate(easter, -2), name: 'Sexta-feira Santa' },
    { date: easter, name: 'Páscoa' },
    { date: new Date(year, 3, 21), name: 'Tiradentes' },
    { date: new Date(year, 4, 1), name: 'Dia do Trabalho' },
    { date: addDaysToDate(easter, 60), name: 'Corpus Christi' },
    { date: new Date(year, 8, 7), name: 'Independência' },
    { date: new Date(year, 9, 12), name: 'N. Sra. Aparecida' },
    { date: new Date(year, 10, 2), name: 'Finados' },
    { date: new Date(year, 10, 15), name: 'Proclamação da República' },
    { date: new Date(year, 10, 20), name: 'Consciência Negra' },
    { date: new Date(year, 11, 25), name: 'Natal' },
  ];
}

export function isHoliday(date: Date): Holiday | undefined {
  const holidays = getHolidaysForYear(date.getFullYear());
  return holidays.find(h =>
    h.date.getFullYear() === date.getFullYear() &&
    h.date.getMonth() === date.getMonth() &&
    h.date.getDate() === date.getDate()
  );
}
