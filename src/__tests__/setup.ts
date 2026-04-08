import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock DATABASE_URL for tests
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.TELEGRAM_BOT_TOKEN = "test-token";
