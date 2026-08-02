import type { CreateOrderInput, OrderResponse } from "@/lib/orders";

export const TIME_SLOTS = [
  "07:00-09:00",
  "09:00-11:00",
  "13:00-15:00",
  "15:00-17:00",
] as const;

export type BookingFormValues = {
  contactName: string;
  contactPhone: string;
  scheduledDate: string;
  timeSlot: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note: string;
  subjectFullName: string;
  subjectDateOfBirth: string;
  subjectSex: "" | "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
  relationshipToContact: string;
};

export type BookingFormErrors = Partial<Record<keyof BookingFormValues, string>>;

export type CompletedOrder = Pick<
  OrderResponse,
  "orderCode" | "status" | "items" | "subtotal" | "collectionFee" | "totalAmount"
> & {
  scheduledDate: string;
  timeSlot: string;
};

export const EMPTY_BOOKING_FORM: BookingFormValues = {
  contactName: "",
  contactPhone: "",
  scheduledDate: "",
  timeSlot: "",
  province: "",
  district: "",
  ward: "",
  addressLine: "",
  note: "",
  subjectFullName: "",
  subjectDateOfBirth: "",
  subjectSex: "",
  relationshipToContact: "",
};

export function validateBookingForm(
  values: BookingFormValues,
  today = localDateInputValue(new Date()),
): BookingFormErrors {
  const errors: BookingFormErrors = {};
  if (!values.subjectFullName.trim()) errors.subjectFullName = "Vui lòng nhập họ và tên người được xét nghiệm.";
  else if (values.subjectFullName.trim().length > 100) errors.subjectFullName = "Họ và tên không được vượt quá 100 ký tự.";
  if (!values.subjectDateOfBirth) errors.subjectDateOfBirth = "Vui lòng nhập ngày sinh.";
  else if (values.subjectDateOfBirth > today) errors.subjectDateOfBirth = "Ngày sinh không được nằm trong tương lai.";
  else { const oldest = new Date(); oldest.setFullYear(oldest.getFullYear() - 130); if (values.subjectDateOfBirth < localDateInputValue(oldest)) errors.subjectDateOfBirth = "Ngày sinh chưa hợp lý."; }
  if (!values.subjectSex) errors.subjectSex = "Vui lòng chọn giới tính dùng cho xét nghiệm.";
  if (values.relationshipToContact.trim().length > 100) errors.relationshipToContact = "Mối quan hệ không được vượt quá 100 ký tự.";
  if (!values.contactName.trim()) errors.contactName = "Vui lòng nhập họ và tên.";
  else if (values.contactName.trim().length > 100)
    errors.contactName = "Họ và tên không được vượt quá 100 ký tự.";

  const phone = values.contactPhone.replace(/[ .-]/g, "");
  if (!phone) errors.contactPhone = "Vui lòng nhập số điện thoại.";
  else if (!/^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/.test(phone))
    errors.contactPhone = "Số điện thoại Việt Nam không hợp lệ.";

  if (!values.scheduledDate) errors.scheduledDate = "Vui lòng chọn ngày lấy mẫu.";
  else if (values.scheduledDate < today)
    errors.scheduledDate = "Ngày lấy mẫu không được nằm trong quá khứ.";

  if (!TIME_SLOTS.includes(values.timeSlot as (typeof TIME_SLOTS)[number]))
    errors.timeSlot = "Vui lòng chọn khung giờ lấy mẫu.";

  for (const field of ["province", "district", "ward", "addressLine"] as const) {
    if (!values[field].trim()) errors[field] = "Trường này là bắt buộc.";
  }
  if (values.addressLine.trim().length > 250)
    errors.addressLine = "Địa chỉ không được vượt quá 250 ký tự.";
  if (values.note.length > 500) errors.note = "Ghi chú không được vượt quá 500 ký tự.";
  return errors;
}

export function toCreateOrderInput(
  values: BookingFormValues,
  labTestIds: string[],
): CreateOrderInput {
  const startTime = values.timeSlot.slice(0, 5);
  return {
    labTestIds,
    contactName: values.contactName.trim(),
    contactPhone: values.contactPhone.replace(/[ .-]/g, ""),
    subject: { fullName: values.subjectFullName.trim(), dateOfBirth: values.subjectDateOfBirth, sex: values.subjectSex as Exclude<BookingFormValues["subjectSex"], "">, relationshipToContact: values.relationshipToContact.trim() || null },
    appointment: {
      scheduledDate: `${values.scheduledDate}T${startTime}:00+07:00`,
      timeSlot: values.timeSlot,
      province: values.province.trim(),
      district: values.district.trim(),
      ward: values.ward.trim(),
      addressLine: values.addressLine.trim(),
      note: values.note.trim() || null,
    },
  };
}

export function toCompletedOrder(order: OrderResponse): CompletedOrder {
  return {
    orderCode: order.orderCode,
    status: order.status,
    items: order.items,
    scheduledDate: order.appointment.scheduledDate,
    timeSlot: order.appointment.timeSlot,
    subtotal: order.subtotal,
    collectionFee: order.collectionFee,
    totalAmount: order.totalAmount,
  };
}

export function localDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
