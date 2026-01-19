import { beforeEach, vi } from "vitest";

import { mockLogger } from "./mocks";

vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn(),
    fail: vi.fn(),
  })),
}));

beforeEach(() => {
  mockLogger.info.mockClear();
  mockLogger.warn.mockClear();
  mockLogger.error.mockClear();
  mockLogger.debug.mockClear();
  mockLogger.log.mockClear();
  mockLogger.success.mockClear();
});
