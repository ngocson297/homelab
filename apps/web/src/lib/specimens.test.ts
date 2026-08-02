import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpecimenLabels, prepareSpecimens, recordLabelsPrinted } from "@/lib/specimens";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("admin specimen API client", () => {
  it("prepares with optimistic version and idempotency operation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ orderCode: "HL-SYNTH", version: 3, specimens: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await prepareSpecimens("HL-SYNTH", 2, "00000000-0000-4000-8000-000000000001");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:3001/admin/orders/HL-SYNTH/specimens/prepare");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", credentials: "include", cache: "no-store" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ expectedVersion: 2, operationId: "00000000-0000-4000-8000-000000000001" });
  });

  it("loads protected labels without placing barcode data in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ orderCode: "HL-SYNTH", labels: [{ specimenCode: "SPC-SYNTH", barcodeValue: "opaque-value" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getSpecimenLabels("HL-SYNTH");
    expect(result.labels[0]?.barcodeValue).toBe("opaque-value");
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("opaque-value");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include", cache: "no-store" });
  });

  it("records print history without changing or resending barcode values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ orderCode: "HL-SYNTH", recorded: 1, idempotent: false }));
    vi.stubGlobal("fetch", fetchMock);
    await recordLabelsPrinted("HL-SYNTH", "00000000-0000-4000-8000-000000000002", ["SPC-SYNTH"], 1);
    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(JSON.parse(body)).toEqual({ operationId: "00000000-0000-4000-8000-000000000002", specimenCodes: ["SPC-SYNTH"], printCount: 1 });
    expect(body).not.toContain("barcodeValue");
  });
});
