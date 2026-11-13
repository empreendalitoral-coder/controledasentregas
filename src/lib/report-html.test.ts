import { describe, expect, it } from "vitest";
import { escapeReportText } from "./report-html";

describe("untrusted report data", () => {
  it("escapes executable imported names", () => {
    expect(escapeReportText('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(escapeReportText("João & 'Maria'")).toBe("João &amp; &#39;Maria&#39;");
  });
});