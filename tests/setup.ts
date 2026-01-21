import { beforeEach, vi } from "vitest";

vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    fail: vi.fn(),
  })),
}));

export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
  success: vi.fn(),
};

vi.mock("../src/logger", () => ({
  logger: mockLogger,
}));

vi.mock("@logtape/logtape");
