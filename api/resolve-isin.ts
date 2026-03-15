/**
 * Vercel Edge Function — ISIN resolution
 *
 * GET /api/resolve-isin?isin=IE00B5BMR087
 *
 * 1. Searches Yahoo Finance for the ISIN to get name + ticker symbol.
 * 2. Fetches the current unit price via the chart endpoint.
 *
 * Returns:
 *   { name, symbol, unitPrice, currency, assetType }
 *
 * Errors (JSON { error: string }):
 *   400 — invalid ISIN format
 *   404 — no result found for this ISIN
 *   502 — upstream service unavailable
 */
export const config = { runtime: 'edge' };

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300', // cache price for 5 min at the edge
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: HEADERS });
}

const YF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
  Accept: 'application/json',
};

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const isin = searchParams.get('isin')?.trim().toUpperCase() ?? '';

  // Loose ISIN format check: 2 country letters + 10 alphanumeric
  if (!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) {
    return json({ error: 'Format ISIN invalide (ex: IE00B5BMR087)' }, 400);
  }

  try {
    // ── Step 1: search by ISIN ──────────────────────────────────────────────
    const searchRes = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=5&newsCount=0&enableFuzzyQuery=false`,
      { headers: YF_HEADERS },
    );

    if (!searchRes.ok) {
      return json({ error: 'Service de données indisponible' }, 502);
    }

    const searchData = (await searchRes.json()) as {
      quotes?: { symbol: string; longname?: string; shortname?: string; quoteType?: string }[];
    };

    const quote = searchData.quotes?.[0];
    if (!quote) {
      return json({ error: `Aucun actif trouvé pour l'ISIN ${isin}` }, 404);
    }

    // ── Step 2: fetch current price ─────────────────────────────────────────
    const priceRes = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(quote.symbol)}?interval=1d&range=1d`,
      { headers: YF_HEADERS },
    );

    let unitPrice = 0;
    let currency = 'EUR';

    if (priceRes.ok) {
      const priceData = (await priceRes.json()) as {
        chart?: { result?: { meta?: { regularMarketPrice?: number; currency?: string } }[] };
      };
      const meta = priceData.chart?.result?.[0]?.meta ?? {};
      unitPrice = meta.regularMarketPrice ?? 0;
      currency = meta.currency ?? 'EUR';
    }

    return json({
      name: quote.longname || quote.shortname || quote.symbol,
      symbol: quote.symbol,
      unitPrice,
      currency,
      assetType: quote.quoteType ?? null,
    });
  } catch {
    return json({ error: 'Erreur lors de la résolution de l\'ISIN' }, 502);
  }
}
