import { describe, expect, it } from "vitest";
import {
  EMPTY_BOOKING_FORM,
  TIME_SLOTS,
  localDateInputValue,
  toCreateOrderInput,
  validateBookingForm,
  type BookingFormValues,
} from "@/lib/booking";
import { formatPrice } from "@/lib/lab-tests";

const valid: BookingFormValues = {
  contactName: "  Synthetic Customer  ",
  contactPhone: "0900 000 000",
  scheduledDate: "2026-08-05",
  timeSlot: TIME_SLOTS[0],
  province: " Da Nang ",
  district: " Hai Chau ",
  ward: " Hoa Cuong ",
  addressLine: " Synthetic test address ",
  note: " Test note ",
  subjectFullName: " Synthetic Subject ",
  subjectDateOfBirth: "1990-01-20",
  subjectSex: "UNKNOWN",
  relationshipToContact: " Self ",
};

describe("booking validation", () => {
  it("requires every mandatory field", () => {
    const errors = validateBookingForm(EMPTY_BOOKING_FORM, "2026-08-02");
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining([
        "contactName",
        "contactPhone",
        "scheduledDate",
        "timeSlot",
        "province",
        "district",
        "ward",
        "addressLine",
        "subjectFullName",
        "subjectDateOfBirth",
        "subjectSex",
      ]),
    );
  });

  it("rejects invalid phones, past dates, invalid slots, and long notes", () => {
    const errors = validateBookingForm(
      {
        ...valid,
        contactPhone: "123",
        scheduledDate: "2026-08-01",
        timeSlot: "08:00-10:00",
        note: "x".repeat(501),
      },
      "2026-08-02",
    );
    expect(errors.contactPhone).toBeDefined();
    expect(errors.scheduledDate).toBeDefined();
    expect(errors.timeSlot).toBeDefined();
    expect(errors.note).toBeDefined();
  });

  it("trims values and sends only IDs plus booking information", () => {
    expect(validateBookingForm(valid, "2026-08-02")).toEqual({});
    expect(toCreateOrderInput(valid, ["lab-id"])).toEqual({
      labTestIds: ["lab-id"],
      contactName: "Synthetic Customer",
      contactPhone: "0900000000",
      subject: { fullName: "Synthetic Subject", dateOfBirth: "1990-01-20", sex: "UNKNOWN", relationshipToContact: "Self" },
      appointment: {
        scheduledDate: "2026-08-05T07:00:00+07:00",
        timeSlot: "07:00-09:00",
        province: "Da Nang",
        district: "Hai Chau",
        ward: "Hoa Cuong",
        addressLine: "Synthetic test address",
        note: "Test note",
      },
    });
  });

  it("formats backend Decimal strings as Vietnamese currency", () => {
    expect(formatPrice("180000.00")).toMatch(/180[.\s]000/);
    expect(formatPrice("180000.00")).toContain("₫");
  });

  it("creates local date input values without UTC date drift", () => {
    expect(localDateInputValue(new Date(2026, 7, 2, 23, 30))).toBe("2026-08-02");
  });
});
