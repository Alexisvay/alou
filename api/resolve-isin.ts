/**
 * Vercel Edge Function — ISIN resolution via EODHD
 *
 * GET /api/resolve-isin?isin=US0378331005
 *
 * 1. Tries EODHD Search API (ISIN as query).
 * 2. Fallback: EODHD ID Mapping API (filter by ISIN).
 *
 * Success: { success: true, asset: { isin, name, symbol, exchange, unitPrice } }
 * Error:   { success: false, error: "Aucun actif trouvé pour cet ISIN" }
 */
export const config = { runtime: 'edge' };

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

const EODHD_BASE = 'https://eodhd.com/api';

export default async function handler(request: Request): Promise<Response> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    return json({ success: false, error: 'Clé API EODHD manquante' }, 400);
  }

  const { searchParams } = new URL(request.url);
  const isin = searchParams.get('isin')?.trim().toUpperCase() ?? '';

  if (!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) {
    return json({ success: false, error: 'Format ISIN invalide (ex: IE00B5BMR087)' }, 400);
  }

  try {
    // ── Step 1: EODHD Search API (ISIN as query) ─────────────────────────────
    const searchUrl = `${EODHD_BASE}/search/${encodeURIComponent(isin)}?api_token=${apiKey}&fmt=json&limit=10`;
    const searchRes = await fetch(searchUrl);

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as unknown;
      const list = Array.isArray(searchData) ? searchData : [];

      // Find first result matching the ISIN (exact or first if no ISIN in response)
      const match = list.find(
        (item: Record<string, unknown>) =>
          (item.ISIN as string) === isin || (item.isin as string) === isin,
      ) as Record<string, unknown> | undefined;
      const first = (match ?? list[0]) as Record<string, unknown> | undefined;

      if (first) {
        const code = (first.Code as string) ?? (first.code as string) ?? '';
        const name = (first.Name as string) ?? (first.name as string) ?? code;
        const exchange = (first.Exchange as string) ?? (first.exchange as string) ?? '';
        const unitPrice =
          (first.previousClose as number) ?? (first.previous_close as number) ?? 0;

        if (code) {
          return json({
            success: true,
            asset: {
              isin,
              name: name || code,
              symbol: code,
              exchange: exchange || undefined,
              unitPrice,
            },
          });
        }
      }
    }

    // ── Step 2: Fallback — EODHD ID Mapping API ─────────────────────────────
    const mappingUrl = `${EODHD_BASE}/id-mapping?filter[isin]=${encodeURIComponent(isin)}&api_token=${apiKey}&fmt=json`;
    const mappingRes = await fetch(mappingUrl);

    if (mappingRes.ok) {
      const mappingData = (await mappingRes.json()) as {
        data?: { symbol?: string; isin?: string }[];
      };
      const dataList = mappingData?.data ?? [];
      const first = dataList[0] as Record<string, unknown> | undefined;

      if (first?.symbol) {
        const fullSymbol = first.symbol as string;
        // EODHD returns "AAPL.US" — use as symbol, extract exchange
        const dotIdx = fullSymbol.indexOf('.');
        const symbol = dotIdx > 0 ? fullSymbol.slice(0, dotIdx) : fullSymbol;
        const exchange = dotIdx > 0 ? fullSymbol.slice(dotIdx + 1) : '';

        return json({
          success: true,
          asset: {
            isin,
            name: symbol,
            symbol,
            exchange: exchange || undefined,
            unitPrice: 0,
          },
        });
      }
    }

    return json({ success: false, error: 'Aucun actif trouvé pour cet ISIN' }, 404);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[resolve-isin] error', err);
    return json({ success: false, error: "Erreur lors de la résolution de l'ISIN" }, 502);
  }
}
