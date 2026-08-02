"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LabSpecimenOverview } from "@/components/lab-specimen-overview";
import {
  acceptLabSpecimen,
  getLabSpecimen,
  LabPortalError,
  type LabSpecimenDetail,
  receiveLabSpecimen,
  rejectLabSpecimen,
  rejectionReasons,
  scanLabSpecimen,
  type SpecimenRejectionReason,
} from "@/lib/lab-portal";
import { newOperationId } from "@/lib/specimens";

export function LabIntake() {
  const router = useRouter();
  const scanInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [barcode, setBarcode] = useState("");
  const [specimen, setSpecimen] = useState<LabSpecimenDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [assessment, setAssessment] = useState({ labelLegible: false, containerIntact: false, transportConditionAcceptable: false });
  const [temperature, setTemperature] = useState("");
  useEffect(() => { scanInput.current?.focus(); }, []);

  async function scan(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const value = barcode.trim();
    if (!value) { setError("Vui lòng quét hoặc nhập barcode."); scanInput.current?.focus(); return; }
    submitting.current = true;
    setLoading(true);
    setError("");
    setNotice("");
    setBarcode("");
    try {
      setSpecimen(await scanLabSpecimen(value));
      setAssessment({ labelLegible: false, containerIntact: false, transportConditionAcceptable: false });
      setTemperature("");
    } catch (reason) {
      handleAuth(reason);
      setError(reason instanceof Error ? reason.message : "Không thể tìm bệnh phẩm.");
    } finally {
      submitting.current = false;
      setLoading(false);
      scanInput.current?.focus();
    }
  }

  async function mutate(action: () => Promise<LabSpecimenDetail>, successMessage: string) {
    if (!specimen || submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      setSpecimen(await action());
      setNotice(successMessage);
      setRejectOpen(false);
    } catch (reason) {
      handleAuth(reason);
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật bệnh phẩm.");
      if (reason instanceof LabPortalError && reason.status === 409) {
        try { setSpecimen(await getLabSpecimen(specimen.specimenCode)); } catch { /* Keep the last safe view and require a manual action. */ }
      }
    } finally {
      submitting.current = false;
      setLoading(false);
      scanInput.current?.focus();
    }
  }

  function handleAuth(reason: unknown) {
    if (reason instanceof LabPortalError && (reason.status === 401 || reason.status === 403)) router.replace("/lab/login");
  }

  function receive() {
    if (!specimen) return;
    if (!assessment.labelLegible || !assessment.containerIntact || !assessment.transportConditionAcceptable) {
      setError("Nếu nhãn, ống chứa hoặc điều kiện vận chuyển không đạt, hãy dùng luồng Từ chối.");
      return;
    }
    const measuredTemperatureC = temperature.trim() ? Number(temperature) : null;
    if (measuredTemperatureC !== null && !Number.isFinite(measuredTemperatureC)) { setError("Nhiệt độ đo được không hợp lệ."); return; }
    void mutate(() => receiveLabSpecimen(specimen.specimenCode, { expectedVersion: specimen.version, operationId: newOperationId(), assessment: { ...assessment, measuredTemperatureC } }), "Đã ghi nhận tiếp nhận bệnh phẩm.");
  }

  return <>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">Tiếp nhận bệnh phẩm</h1><p className="mt-1 text-slate-600">Barcode chỉ được gửi trong nội dung request và không được lưu trên thiết bị.</p></div></div>
    <form onSubmit={scan} className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><label htmlFor="lab-barcode" className="block font-bold">Quét barcode</label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input ref={scanInput} id="lab-barcode" autoFocus autoComplete="off" spellCheck={false} value={barcode} onChange={(event) => setBarcode(event.target.value)} className="min-h-12 flex-1 rounded-xl border px-4 font-mono focus:outline-none focus:ring-2 focus:ring-teal-700" aria-describedby="barcode-help" /><button disabled={loading} className="min-h-12 rounded-xl bg-teal-800 px-6 font-bold text-white disabled:opacity-50">{loading ? "Đang xử lý…" : "Tìm bệnh phẩm"}</button></div><p id="barcode-help" className="mt-2 text-sm text-slate-600">Máy quét có thể hoạt động như bàn phím và gửi bằng phím Enter.</p></form>
    <div aria-live="polite">{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{notice && <p className="mt-4 rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}</div>
    {!loading && !specimen && !error && <section className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-600"><h2 className="font-bold">Chưa quét bệnh phẩm</h2><p className="mt-1">Quét nhãn để xem thông tin đối chiếu và thao tác tiếp nhận.</p></section>}
    {specimen && <div className="mt-6"><LabSpecimenOverview specimen={specimen} />
      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="lab-action-title"><h2 id="lab-action-title" className="text-xl font-bold">Thao tác</h2>
        {specimen.status === "IN_TRANSIT" && <div className="mt-4"><p className="font-semibold">Đánh giá khi tiếp nhận</p><div className="mt-2 grid gap-3 md:grid-cols-3">{[
          ["labelLegible", "Nhãn đọc được"], ["containerIntact", "Ống chứa nguyên vẹn"], ["transportConditionAcceptable", "Điều kiện vận chuyển phù hợp"],
        ].map(([key, label]) => <label key={key} className="rounded-lg border p-3"><input type="checkbox" checked={assessment[key as keyof typeof assessment]} onChange={(event) => setAssessment((current) => ({ ...current, [key]: event.target.checked }))} /> {label}</label>)}</div><label htmlFor="measured-temperature" className="mt-4 block font-medium">Nhiệt độ đo được (°C, không bắt buộc)</label><input id="measured-temperature" type="number" step="0.1" inputMode="decimal" value={temperature} onChange={(event) => setTemperature(event.target.value)} className="mt-1 min-h-11 w-full max-w-xs rounded border p-2" /><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={loading} onClick={receive} className="rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white disabled:opacity-50">Tiếp nhận</button><button type="button" disabled={loading} onClick={() => setRejectOpen(true)} className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Từ chối</button></div></div>}
        {specimen.status === "RECEIVED" && <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={loading} onClick={() => void mutate(() => acceptLabSpecimen(specimen.specimenCode, specimen.version, newOperationId()), "Đã chấp nhận bệnh phẩm.")} className="rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white disabled:opacity-50">Chấp nhận</button><button type="button" disabled={loading} onClick={() => setRejectOpen(true)} className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Từ chối</button></div>}
        {["ACCEPTED", "REJECTED"].includes(specimen.status) && <p className="mt-3 rounded bg-slate-50 p-3">Bệnh phẩm ở trạng thái chỉ đọc, không còn thao tác tiếp nhận.</p>}
        {!['IN_TRANSIT','RECEIVED','ACCEPTED','REJECTED'].includes(specimen.status) && <p className="mt-3 rounded bg-amber-50 p-3 text-amber-900">Trạng thái hiện tại chưa cho phép tiếp nhận tại Lab.</p>}
      </section>
    </div>}
    {rejectOpen && specimen && <RejectDialog loading={loading} onClose={() => setRejectOpen(false)} onConfirm={(input) => void mutate(() => rejectLabSpecimen(specimen.specimenCode, { expectedVersion: specimen.version, operationId: newOperationId(), ...input }), "Đã từ chối bệnh phẩm và ghi nhận chuỗi bàn giao.")} />}
  </>;
}

function RejectDialog({ loading, onClose, onConfirm }: { loading: boolean; onClose: () => void; onConfirm: (input: { reason: SpecimenRejectionReason; note?: string; recollectionRequired: boolean }) => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState<SpecimenRejectionReason>("HEMOLYZED");
  const [note, setNote] = useState("");
  const [recollectionRequired, setRecollectionRequired] = useState(false);
  const invalid = reason === "OTHER" && note.trim().length < 3;
  useEffect(() => {
    first.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
      if (event.key !== "Tab") return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]),select:not([disabled]),textarea:not([disabled]),input:not([disabled])");
      if (!focusable?.length) return;
      const firstItem = focusable[0], lastItem = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [loading, onClose]);
  return <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="reject-title" className="w-full max-w-lg rounded-2xl bg-white p-6"><h2 id="reject-title" className="text-xl font-bold">Từ chối bệnh phẩm</h2><p className="mt-2 text-sm text-slate-600">Không nhập thông tin người xét nghiệm hoặc thông tin bệnh lý không cần thiết vào ghi chú.</p><label htmlFor="reject-reason" className="mt-4 block font-medium">Lý do</label><select id="reject-reason" value={reason} onChange={(event) => setReason(event.target.value as SpecimenRejectionReason)} className="mt-1 min-h-11 w-full rounded border p-2">{rejectionReasons.map((item) => <option key={item}>{item}</option>)}</select><label htmlFor="reject-note" className="mt-4 block font-medium">Ghi chú</label><textarea id="reject-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} aria-describedby="reject-note-help" className="mt-1 min-h-24 w-full rounded border p-2"/><p id="reject-note-help" className="text-sm text-slate-600">{note.length}/500 ký tự. Bắt buộc khi chọn OTHER.</p>{invalid && <p role="alert" className="mt-2 text-red-700">Lý do OTHER cần ghi chú ít nhất 3 ký tự.</p>}<label className="mt-4 block"><input type="checkbox" checked={recollectionRequired} onChange={(event) => setRecollectionRequired(event.target.checked)} /> Cần lấy lại bệnh phẩm</label><div className="mt-5 flex justify-end gap-2"><button ref={first} type="button" disabled={loading} onClick={onClose} className="rounded border px-4 py-2">Đóng</button><button type="button" disabled={loading || invalid} onClick={() => onConfirm({ reason, ...(note.trim() ? { note: note.trim() } : {}), recollectionRequired })} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">{loading ? "Đang xử lý…" : "Xác nhận từ chối"}</button></div></div></div>;
}
