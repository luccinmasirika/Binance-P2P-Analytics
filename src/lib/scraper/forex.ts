export interface ForexRate {
  base: string;
  target: string;
  rate: number;
  source: string;
}

export async function fetchForexRate(fiat: string = "RWF"): Promise<ForexRate> {
  const response = await fetch(
    `https://open.er-api.com/v6/latest/USD`,
    { signal: AbortSignal.timeout(10_000) }
  );

  if (!response.ok) {
    throw new Error(`ExchangeRate API error: ${response.status}`);
  }

  const json = await response.json();
  const rate = json.rates?.[fiat];

  if (typeof rate !== "number") {
    throw new Error(`Invalid forex rate response: ${fiat} rate not found`);
  }

  return {
    base: "USD",
    target: fiat,
    rate,
    source: "exchangerate-api",
  };
}
