"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DepthDataPoint {
  tradeType: string;
  priceLevel: string;
  totalQuantity: string;
  adCount: number;
}

interface DepthChartProps {
  data: DepthDataPoint[];
}

export function DepthChart({ data }: DepthChartProps) {
  const buyData = data
    .filter((d) => d.tradeType === "BUY")
    .map((d) => ({
      price: Number(d.priceLevel),
      volume: Number(d.totalQuantity),
      ads: d.adCount,
    }))
    .sort((a, b) => a.price - b.price);

  const sellData = data
    .filter((d) => d.tradeType === "SELL")
    .map((d) => ({
      price: Number(d.priceLevel),
      volume: -Number(d.totalQuantity), // negative for visual separation
      ads: d.adCount,
    }))
    .sort((a, b) => a.price - b.price);

  const chartData = [...buyData, ...sellData]
    .sort((a, b) => a.price - b.price)
    .map((d) => ({
      price: d.price.toFixed(2),
      buyVolume: d.volume > 0 ? d.volume : undefined,
      sellVolume: d.volume < 0 ? Math.abs(d.volume) : undefined,
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="price" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="buyVolume" name="BUY (USDT)" fill="#22c55e" stackId="a" />
        <Bar dataKey="sellVolume" name="SELL (USDT)" fill="#ef4444" stackId="b" />
      </BarChart>
    </ResponsiveContainer>
  );
}
