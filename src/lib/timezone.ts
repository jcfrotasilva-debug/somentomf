// Helpers para manipulação de data/hora com timezone do Brasil (America/Sao_Paulo)

export const BRAZIL_TZ = 'America/Sao_Paulo';

/**
 * Retorna a data atual (YYYY-MM-DD) no fuso horário do Brasil.
 * Usa Intl.DateTimeFormat que é a forma mais confiável de lidar com timezones.
 */
export function getCurrentBrazilDate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // YYYY-MM-DD
}

/**
 * Retorna a data de ontem no fuso horário do Brasil (YYYY-MM-DD).
 * Calcula de forma robusta: pega a data atual no Brasil e subtrai 1 dia.
 */
export function getYesterdayBrazilDate(): string {
  // Pega a data de hoje no Brasil e subtrai 1 dia de forma segura
  const today = getCurrentBrazilDate();
  const [y, m, d] = today.split('-').map(Number);
  // Usa meio-dia UTC para evitar problemas de horário de verão
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Retorna a hora atual no Brasil formatada (HH:mm:ss)
 */
export function getCurrentBrazilTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Formata timestamp ISO para hora no Brasil (HH:mm)
 */
export function formatTimeInBrazil(isoString: string | null | undefined): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Formata data YYYY-MM-DD para dd/mm/aaaa
 */
export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '--/--/----';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Retorna o timestamp Date (UTC) de uma data+hora no Brasil
 */
export function brazilDateTimeToUTC(dateStr: string, timeStr: string): Date {
  // dateStr = YYYY-MM-DD, timeStr = HH:mm:ss
  // Constrói um ISO com offset do Brasil (-03:00)
  const iso = `${dateStr}T${timeStr}-03:00`;
  return new Date(iso);
}

/**
 * Calcula horas trabalhadas no dia
 */
export function calculateWorkedHours(entry: {
  checkIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  checkOut: string | null;
}): string {
  if (!entry.checkIn || !entry.checkOut) return '0h00';

  const toMinutes = (iso: string) => {
    const d = new Date(iso);
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: BRAZIL_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const h = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
    const m = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
    return h * 60 + m;
  };

  const ci = toMinutes(entry.checkIn);
  const co = toMinutes(entry.checkOut);
  let total = co - ci;

  if (entry.lunchOut && entry.lunchIn) {
    const lo = toMinutes(entry.lunchOut);
    const li = toMinutes(entry.lunchIn);
    total -= (li - lo);
  }

  if (total < 0) total = 0;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}h${String(mins).padStart(2, '0')}`;
}

/**
 * Formata uma data completa legível no Brasil
 */
export function formatBrazilDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('pt-BR', {
    timeZone: BRAZIL_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Formata apenas a data no Brasil (dd/mm/aaaa) - aceita ISO
 */
export function formatBrazilDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR', {
    timeZone: BRAZIL_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata apenas a hora no Brasil (HH:mm) - aceita ISO
 */
export function formatBrazilTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
