import { z } from "zod/v4";

const toNumber = z.string().transform((v) => Number(v));

export const TradeMethodSchema = z.object({
  payType: z.string().nullable(),
  tradeMethodName: z.string().nullable(),
  tradeMethodShortName: z.string().nullable(),
  identifier: z.string(),
});

export const AdvSchema = z.object({
  advNo: z.string(),
  tradeType: z.enum(["BUY", "SELL"]),
  asset: z.string(),
  fiatUnit: z.string(),
  price: toNumber,
  surplusAmount: toNumber,
  maxSingleTransAmount: toNumber,
  minSingleTransAmount: toNumber,
  tradableQuantity: toNumber,
  payTimeLimit: z.number(),
  tradeMethods: z.array(TradeMethodSchema),
});

export const AdvertiserSchema = z.object({
  userNo: z.string(),
  nickName: z.string(),
  monthOrderCount: z.number(),
  monthFinishRate: z.number(),
  positiveRate: z.number(),
  userType: z.string().nullable(),
  isOnline: z.boolean().optional(),
});

export const AdItemSchema = z.object({
  adv: AdvSchema,
  advertiser: AdvertiserSchema,
});

export const BinanceP2PResponseSchema = z.object({
  code: z.string(),
  data: z.array(AdItemSchema),
  total: z.number(),
});

export type BinanceP2PResponse = z.infer<typeof BinanceP2PResponseSchema>;
export type AdItem = z.infer<typeof AdItemSchema>;
export type Adv = z.infer<typeof AdvSchema>;
export type Advertiser = z.infer<typeof AdvertiserSchema>;
