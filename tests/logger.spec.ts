import { describe, expect, it, vi } from "vitest";

vi.unmock("../src/logger");

import { getLogLevel } from "../src/logger";

describe("logger", () => {
  describe("getLogLevel", () => {
    it("should return default level when no level is provided", () => {
      expect(getLogLevel(undefined)).toBe("warning");
    });

    it("should return custom default level when provided", () => {
      expect(getLogLevel(undefined, "info")).toBe("info");
    });

    it("should return valid log level when provided", () => {
      expect(getLogLevel("debug")).toBe("debug");
      expect(getLogLevel("info")).toBe("info");
      expect(getLogLevel("warning")).toBe("warning");
      expect(getLogLevel("error")).toBe("error");
      expect(getLogLevel("fatal")).toBe("fatal");
      expect(getLogLevel("trace")).toBe("trace");
    });

    it("should handle uppercase log levels", () => {
      expect(getLogLevel("DEBUG")).toBe("debug");
      expect(getLogLevel("INFO")).toBe("info");
      expect(getLogLevel("WARNING")).toBe("warning");
      expect(getLogLevel("ERROR")).toBe("error");
    });

    it("should handle mixed case log levels", () => {
      expect(getLogLevel("DeBuG")).toBe("debug");
      expect(getLogLevel("WaRnInG")).toBe("warning");
    });

    it("should return default level for invalid log levels", () => {
      expect(getLogLevel("invalid")).toBe("warning");
      expect(getLogLevel("")).toBe("warning");
      expect(getLogLevel("verbose")).toBe("warning");
      expect(getLogLevel("critical")).toBe("warning");
    });

    it("should return custom default level for invalid log levels", () => {
      expect(getLogLevel("invalid", "error")).toBe("error");
      expect(getLogLevel("", "debug")).toBe("debug");
    });
  });
});
