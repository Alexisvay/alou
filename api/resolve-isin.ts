/**
 * Vercel Edge Function — ISIN resolution via Financial Modeling Prep
 *
 * GET /api/resolve-isin?isin=IE00B5BMR087
 *
 * 1. Calls FMP stable/search-isin to resolve the ISIN to a symbol + name.
 * 2. Calls FMP stable/quote to get the current unit price.
 *
 * Success: { success: true,  asset: { isin, name, symbol, unitPrice } }
 * Error:   { success: false, error: "..." }
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

const FMP_BASE = 'https://financialmodelingprep.com/stable';

export default async function handler(request: Request): Promise<Response> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return json({ success: false, error: 'Clé API FMP manquante' }, 400);
  }

  const { searchParams } = new URL(request.url);
  const isin = searchParams.get('isin')?.trim().toUpperCase() ?? '';

  if (!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) {
    return json({ success: false, error: 'Format ISIN invalide (ex: IE00B5BMR087)' }, 400);
  }

  try {
    // ── Step 1: resolve ISIN → symbol + name ────────────────────────────────
    const searchRes = await fetch(
      `${FMP_BASE}/search-isin?isin=${encodeURIComponent(isin)}&apikey=${apiKey}`,
    );

    if (!searchRes.ok) {
      return json({ success: false, error: 'Service FMP indisponible (search-isin)' }, 502);
    }

    const searchData = (await searchRes.json()) as {
      symbol?: string;
      name?: string;
      isin?: string;
    }[];

    const match = searchData?.[0];
    if (!match?.symbol) {
      return json({ success: false, error: `Aucun actif trouvé pour l'ISIN ${isin}` }, 404);
    }

    // ── Step 2: fetch current unit price ────────────────────────────────────
    const quoteRes = await fetch(
      `${FMP_BASE}/quote?symbol=${encodeURIComponent(match.symbol)}&apikey=${apiKey}`,
    );

    let unitPrice = 0;

    if (quoteRes.ok) {
      const quoteData = (await quoteRes.json()) as { price?: number }[];
      unitPrice = quoteData?.[0]?.price ?? 0;
    }

    return json({
      success: true,
      asset: {
        isin,
        name: match.name || match.symbol,
        symbol: match.symbol,
        unitPrice,
      },
    });
  } catch {
    return json({ success: false, error: "Erreur lors de la résolution de l'ISIN" }, 502);
  }
}
