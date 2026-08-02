import { afterEach, describe, expect, it, vi } from "vitest";
import { acceptLabSpecimen, LabPortalError, receiveLabSpecimen, scanLabSpecimen } from "@/lib/lab-portal";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("lab specimen API client", () => {
  it("sends barcode only in the scan request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ specimenCode: "SPC-SYNTH" }));
    vi.stubGlobal("fetch", fetchMock);
    await scanLabSpecimen(" opaque-scan-value ");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:3001/lab/specimens/scan");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ barcodeValue: "opaque-scan-value" });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST", credentials: "include", cache: "no-store" });
  });

  it("sends receive assessment and no subject identifiers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ specimenCode: "SPC-SYNTH" }));
    vi.stubGlobal("fetch", fetchMock);
    await receiveLabSpecimen("SPC-SYNTH", { expectedVersion: 3, operationId: "00000000-0000-4000-8000-000000000003", assessment: { labelLegible: true, containerIntact: true, transportConditionAcceptable: true, measuredTemperatureC: null } });
    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(body).not.toMatch(/displayName|dateOfBirth|phone|address/);
    expect(JSON.parse(body)).toMatchObject({ expectedVersion: 3, assessment: { labelLegible: true } });
  });

  it("does not retry a stale mutation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ message: "stale" }, 409));
    vi.stubGlobal("fetch", fetchMock);
    await expect(acceptLabSpecimen("SPC-SYNTH", 4, "00000000-0000-4000-8000-000000000004")).rejects.toBeInstanceOf(LabPortalError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
