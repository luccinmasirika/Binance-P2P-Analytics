import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ──────────────────────────────────────────────
// countries
// ──────────────────────────────────────────────
export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  fiat: text("fiat").notNull().unique(), // RWF, KES, UGX, etc.
  name: text("name").notNull(), // Rwanda, Kenya, Uganda, etc.
  currencySymbol: text("currency_symbol").notNull().default(""), // Fr, KSh, USh
  payTypes: text("pay_types").array(), // Binance API payType codes for this country
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ──────────────────────────────────────────────
// scrape_sessions
// ──────────────────────────────────────────────
export const scrapeSessions = pgTable("scrape_sessions", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  totalAds: integer("total_ads").default(0),
  status: text("status").notNull().default("running"), // running | completed | failed
});

export const scrapeSessionsRelations = relations(scrapeSessions, ({ many }) => ({
  ads: many(ads),
  marketDepthSnapshots: many(marketDepthSnapshots),
}));

// ──────────────────────────────────────────────
// advertisers
// ──────────────────────────────────────────────
export const advertisers = pgTable("advertisers", {
  id: serial("id").primaryKey(),
  userNo: text("user_no").notNull().unique(),
  nickname: text("nickname").notNull(),
  monthlyOrderCount: integer("monthly_order_count"),
  monthlyFinishRate: numeric("monthly_finish_rate"),
  positiveRate: numeric("positive_rate"),
  userType: text("user_type"), // user | merchant
  firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const advertisersRelations = relations(advertisers, ({ many }) => ({
  ads: many(ads),
  snapshots: many(advertiserSnapshots),
}));

// ──────────────────────────────────────────────
// advertiser_snapshots (per-session metric history)
// ──────────────────────────────────────────────
export const advertiserSnapshots = pgTable(
  "advertiser_snapshots",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => scrapeSessions.id),
    advertiserId: integer("advertiser_id")
      .notNull()
      .references(() => advertisers.id),
    monthOrderCount: integer("month_order_count"),
    monthFinishRate: numeric("month_finish_rate"),
    positiveRate: numeric("positive_rate"),
    isOnline: boolean("is_online"),
    scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
  },
  (t) => ({
    advertiserScrapedIdx: index(
      "advertiser_snapshots_advertiser_scraped_idx"
    ).on(t.advertiserId, t.scrapedAt),
    sessionIdx: index("advertiser_snapshots_session_idx").on(t.sessionId),
  })
);

export const advertiserSnapshotsRelations = relations(
  advertiserSnapshots,
  ({ one }) => ({
    advertiser: one(advertisers, {
      fields: [advertiserSnapshots.advertiserId],
      references: [advertisers.id],
    }),
    session: one(scrapeSessions, {
      fields: [advertiserSnapshots.sessionId],
      references: [scrapeSessions.id],
    }),
  })
);

// ──────────────────────────────────────────────
// ads (snapshot model)
// ──────────────────────────────────────────────
export const ads = pgTable(
  "ads",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => scrapeSessions.id),
    advNo: text("adv_no").notNull(),
    fiat: text("fiat").notNull().default("RWF"),
    tradeType: text("trade_type").notNull(), // BUY | SELL
    asset: text("asset").notNull().default("USDT"),
    price: numeric("price").notNull(),
    surplusAmount: numeric("surplus_amount"),
    minAmount: numeric("min_amount"),
    maxAmount: numeric("max_amount"),
    tradableQuantity: numeric("tradable_quantity"),
    payTimeLimit: integer("pay_time_limit"),
    advertiserId: integer("advertiser_id")
      .notNull()
      .references(() => advertisers.id),
    scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
  },
  (t) => ({
    advNoScrapedIdx: index("ads_adv_no_scraped_at_idx").on(
      t.advNo,
      t.scrapedAt
    ),
    advertiserScrapedIdx: index("ads_advertiser_scraped_at_idx").on(
      t.advertiserId,
      t.scrapedAt
    ),
  })
);

export const adsRelations = relations(ads, ({ one, many }) => ({
  session: one(scrapeSessions, {
    fields: [ads.sessionId],
    references: [scrapeSessions.id],
  }),
  advertiser: one(advertisers, {
    fields: [ads.advertiserId],
    references: [advertisers.id],
  }),
  paymentMethods: many(adPaymentMethods),
}));

// ──────────────────────────────────────────────
// ad_payment_methods
// ──────────────────────────────────────────────
export const adPaymentMethods = pgTable("ad_payment_methods", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id")
    .notNull()
    .references(() => ads.id),
  payType: text("pay_type").notNull(),
  payMethodName: text("pay_method_name"),
});

export const adPaymentMethodsRelations = relations(adPaymentMethods, ({ one }) => ({
  ad: one(ads, {
    fields: [adPaymentMethods.adId],
    references: [ads.id],
  }),
}));

// ──────────────────────────────────────────────
// forex_rates
// ──────────────────────────────────────────────
export const forexRates = pgTable("forex_rates", {
  id: serial("id").primaryKey(),
  base: text("base").notNull().default("USD"),
  target: text("target").notNull().default("RWF"),
  rate: numeric("rate").notNull(),
  source: text("source").notNull().default("frankfurter"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
});

// ──────────────────────────────────────────────
// market_depth_snapshots
// ──────────────────────────────────────────────
export const marketDepthSnapshots = pgTable("market_depth_snapshots", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => scrapeSessions.id),
  fiat: text("fiat").notNull().default("RWF"),
  tradeType: text("trade_type").notNull(), // BUY | SELL
  priceLevel: numeric("price_level").notNull(),
  totalQuantity: numeric("total_quantity").notNull(),
  adCount: integer("ad_count").notNull(),
  payType: text("pay_type"), // null = all
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
});

export const marketDepthSnapshotsRelations = relations(marketDepthSnapshots, ({ one }) => ({
  session: one(scrapeSessions, {
    fields: [marketDepthSnapshots.sessionId],
    references: [scrapeSessions.id],
  }),
}));

// ──────────────────────────────────────────────
// alert_configs
// ──────────────────────────────────────────────
export const alertConfigs = pgTable("alert_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  telegramChatId: text("telegram_chat_id").notNull(),
  conditionType: text("condition_type").notNull(), // spread_above | price_below | price_above
  threshold: numeric("threshold").notNull(),
  fiat: text("fiat").notNull().default("RWF"),
  asset: text("asset").notNull().default("USDT"),
  payTypes: text("pay_types").array(),
  isActive: boolean("is_active").notNull().default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(30),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
