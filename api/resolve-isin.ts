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

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const FMP_V3 = 'https://financialmodelingprep.com/api/v3';

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
    // Try stable/search-isin first; fallback to v3/search if empty or error.
    let symbol = '';
    let name = '';

    const stableUrl = `${FMP_STABLE}/search-isin?isin=${encodeURIComponent(isin)}&apikey=${apiKey}`;
    const stableRes = await fetch(stableUrl);
    const stableRaw = await stableRes.text();

    // DEBUG: log FMP response (remove after fixing)
    // eslint-disable-next-line no-console
    console.log('[resolve-isin] search-isin', {
      url: stableUrl.replace(apiKey, '***'),
      status: stableRes.status,
      raw: stableRaw.slice(0, 800),
    });

    const extractMatch = (parsed: unknown): { symbol: string; name: string } | null => {
      const rawList = Array.isArray(parsed)
        ? parsed
        : (parsed as Record<string, unknown>)?.data ?? (parsed as Record<string, unknown>)?.results ?? [];
      if (!Array.isArray(rawList) || rawList.length === 0) return null;
      const first = rawList[0] as Record<string, unknown>;
      const s =
        (first.symbol as string) ?? (first.ticker as string) ?? (first.stockSymbol as string) ?? '';
      const n =
        (first.name as string) ??
        (first.companyName as string) ??
        (first.shortName as string) ??
        s;
      return s ? { symbol: s, name: n } : null;
    };

    if (stableRes.ok) {
      try {
        const parsed = JSON.parse(stableRaw) as unknown;
        const match = extractMatch(parsed);
        if (match) {
          symbol = match.symbol;
          name = match.name;
        }
      } catch {
        // ignore parse error
      }
    }

    // Fallback: v3 search by query (ISIN as search term)
    if (!symbol) {
      const v3Url = `${FMP_V3}/search?query=${encodeURIComponent(isin)}&limit=5&apikey=${apiKey}`;
      const v3Res = await fetch(v3Url);
      const v3Raw = await v3Res.text();

      // eslint-disable-next-line no-console
      console.log('[resolve-isin] v3/search fallback', {
        url: v3Url.replace(apiKey, '***'),
        status: v3Res.status,
        raw: v3Raw.slice(0, 800),
      });

      if (v3Res.ok) {
        try {
          const parsed = JSON.parse(v3Raw) as unknown;
          const match = extractMatch(parsed);
          if (match) {
            symbol = match.symbol;
            name = match.name;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!symbol) {
      return json({ success: false, error: "Aucun actif trouvé pour cet ISIN" }, 404);
    }

    // ── Step 2: fetch current unit price ────────────────────────────────────
    const quoteUrl = `${FMP_STABLE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const quoteRes = await fetch(quoteUrl);
    const quoteRaw = await quoteRes.text();

    // DEBUG: log quote response (remove after fixing)
    // eslint-disable-next-line no-console
    console.log('[resolve-isin] quote', {
      url: quoteUrl.replace(apiKey, '***'),
      status: quoteRes.status,
      raw: quoteRaw.slice(0, 500),
    });

    let unitPrice = 0;
    if (quoteRes.ok) {
      try {
        const quoteParsed = JSON.parse(quoteRaw) as unknown;
        const quoteList = Array.isArray(quoteParsed)
          ? quoteParsed
          : (quoteParsed as Record<string, unknown>)?.data ?? (quoteParsed as Record<string, unknown>)?.results ?? [];
        const quoteFirst = Array.isArray(quoteList) ? (quoteList[0] as Record<string, unknown>) : null;
        unitPrice =
          (quoteFirst?.price as number) ??
          (quoteFirst?.regularMarketPrice as number) ??
          (quoteFirst?.last as number) ??
          (quoteFirst?.close as number) ??
          0;
      } catch {
        // ignore parse error; unitPrice stays 0
      }
    }

    // Fallback: v3 quote if stable returned no price
    if (unitPrice === 0) {
      const v3QuoteUrl = `${FMP_V3}/quote/${encodeURIComponent(symbol)}?apikey=${apiKey}`;
      const v3QuoteRes = await fetch(v3QuoteUrl);
      if (v3QuoteRes.ok) {
        try {
          const v3QuoteData = (await v3QuoteRes.json()) as Record<string, unknown>[];
          const v3First = v3QuoteData?.[0];
          if (v3First) {
            unitPrice =
              (v3First.price as number) ??
              (v3First.regularMarketPrice as number) ??
              (v3First.close as number) ??
              0;
          }
        } catch {
          // ignore
        }
      }
    }

    return json({
      success: true,
      asset: {
        isin,
        name: name || symbol,
        symbol,
        unitPrice,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[resolve-isin] error', err);
    return json({ success: false, error: "Erreur lors de la résolution de l'ISIN" }, 502);
  }
}
