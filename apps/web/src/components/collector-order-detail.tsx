/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collectSpecimens,
  CollectorPortalError,
  type CollectorOrderDetail,
  getCollectorOrder,
  markInTransit,
  reportFailure,
  startJourney,
} from "@/lib/collector-portal";
import { newOperationId } from "@/lib/specimens";

type Modal = "collection" | "failure" | null;
type ScanValue = { barcodeValue: string; collectedVolumeMl: string };

export function CollectorOrderDetailView({ orderCode }: { orderCode: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<CollectorOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [saving, setSaving] = useState(false);
  const [checks, setChecks] = useState([false, false, false]);
  const [scans, setScans] = useState<Record<string, ScanValue>>({});
  const [reason, setReason] = useState("PATIENT_UNAVAILABLE");
  const [note, setNote] = useState("");
  const submitting = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const scanInputs = useRef<Array<HTMLInputElement | null>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrder(await getCollectorOrder(orderCode));
      setError("");
    } catch (requestError) {
      if (requestError instanceof CollectorPortalError && (requestError.status === 401 || requestError.status === 403)) router.replace("/collector/login");
      else setError("Không thể tải nhiệm vụ.");
    } finally {
      setLoading(false);
    }
  }, [orderCode, router]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!modal) return;
    const root = dialog.current;
    const focusables = root?.querySelectorAll<HTMLElement>("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])");
    focusables?.[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setModal(null);
      if (event.key !== "Tab" || !focusables?.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [modal, saving]);

  async function run(action: () => Promise<CollectorOrderDetail>, clearScans = false) {
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      setOrder(await action());
      setModal(null);
      if (clearScans) setScans({});
    } catch (requestError) {
      if (requestError instanceof CollectorPortalError && requestError.status === 409) {
        setError(requestError.message);
        await load();
      } else setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function openCollection() {
    if (!order) return;
    setChecks([false, false, false]);
    setScans(Object.fromEntries(order.specimens.map((specimen) => [specimen.specimenCode, { barcodeValue: "", collectedVolumeMl: "" }])));
    setModal("collection");
  }

  if (loading && !order) return <p role="status">Đang tải nhiệm vụ…</p>;
  if (error && !order) return <p role="alert">{error}</p>;
  if (!order) return null;

  const activeSpecimens = order.specimens.filter((specimen) => specimen.status !== "CANCELLED");
  const planReady = activeSpecimens.length > 0 && activeSpecimens.every((specimen) => specimen.status !== "PLANNED");
  const cleanBarcodes = activeSpecimens.map((specimen) => scans[specimen.specimenCode]?.barcodeValue.trim() ?? "");
  const missingScan = cleanBarcodes.some((value) => !value);
  const duplicateScan = new Set(cleanBarcodes.filter(Boolean)).size !== cleanBarcodes.filter(Boolean).length;

  return <>
    <div className="flex flex-wrap justify-between gap-3">
      <div><h1 className="text-3xl font-bold">{order.orderCode}</h1><p>{order.statusLabel} · phiên bản {order.version}</p></div>
      <div className="flex flex-wrap gap-2">
        {order.status === "COLLECTOR_ASSIGNED" && <>
          <button onClick={() => void run(() => startJourney(order.orderCode, order.version, newOperationId()))} disabled={saving || !planReady} className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50">Bắt đầu di chuyển</button>
          <button onClick={() => setModal("failure")} className="rounded border px-4 py-2">Không thể thực hiện</button>
        </>}
        {order.status === "COLLECTOR_ON_THE_WAY" && <>
          <button onClick={openCollection} disabled={!planReady} className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50">Quét và ghi nhận lấy mẫu</button>
          <button onClick={() => setModal("failure")} className="rounded border px-4 py-2">Không thể thực hiện</button>
        </>}
        {order.status === "COLLECTED" && <button onClick={() => void run(() => markInTransit(order.orderCode, order.version, newOperationId()))} disabled={saving} className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-50">Chuyển mẫu đi</button>}
      </div>
    </div>
    {!planReady && ["COLLECTOR_ASSIGNED", "COLLECTOR_ON_THE_WAY"].includes(order.status) && <p className="mt-4 rounded bg-amber-100 p-3 font-semibold text-amber-900">Bệnh phẩm hoặc nhãn chưa được chuẩn bị đầy đủ. Vui lòng liên hệ Admin/Lab.</p>}
    {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3">{error}</p>}
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <Section title="Lịch hẹn"><p>{new Date(order.appointment.scheduledDate).toLocaleString("vi-VN")} · {order.appointment.timeSlot}</p></Section>
      <Section title="Người liên hệ"><p>{order.contact.name}</p><a href={`tel:${order.contact.phone}`}>{order.contact.phone}</a></Section>
      <Section title="Người được xét nghiệm">{order.subject ? <><p>{order.subject.fullName}</p><p>Ngày sinh: {order.subject.dateOfBirth}</p><p>Giới tính xét nghiệm: {order.subject.sex}</p></> : <p className="text-red-700">Thiếu thông tin người xét nghiệm</p>}</Section>
      <Section title="Địa chỉ lấy mẫu"><p>{order.appointment.addressLine}, {order.appointment.ward}, {order.appointment.district}, {order.appointment.province}</p>{order.appointment.note && <p>Ghi chú: {order.appointment.note}</p>}</Section>
      <Section title="Bệnh phẩm">
        {order.specimens.length === 0 ? <p>Chưa có kế hoạch bệnh phẩm.</p> : <ul className="space-y-3">{order.specimens.map((specimen) => <li key={specimen.specimenCode} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2"><strong>{specimen.specimenCode}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{specimen.status}</span></div><p>{specimen.specimenType} · {specimen.containerType}</p><p>Thể tích mục tiêu: {specimen.targetVolumeMl ? `${specimen.targetVolumeMl} ml` : "Chưa cấu hình"}</p>{specimen.requiresManualReview && <p className="mt-2 rounded bg-amber-100 p-2 text-sm font-semibold text-amber-900">Cần rà soát thủ công.</p>}<ul className="mt-2 list-inside list-disc text-sm">{specimen.linkedTests.map((test) => <li key={test.testCode}>{test.testName}</li>)}</ul></li>)}</ul>}
      </Section>
      <Section title="Xét nghiệm"><ul>{order.items.map((item) => <li key={item.testCode} className="border-b py-2"><strong>{item.testName}</strong><p>{item.specimenType}</p><p>{item.preparationInstruction ?? "Không có hướng dẫn chuẩn bị."}</p></li>)}</ul></Section>
      <Section title="Lần lấy mẫu hiện tại">{order.currentAttempt ? <p>Lần {order.currentAttempt.attemptNumber} · {order.currentAttempt.status}</p> : <p>Chưa bắt đầu.</p>}</Section>
      <Section title="Timeline"><ol>{order.timeline.map((item, index) => <li key={`${item.occurredAt}-${index}`} className="border-l pl-3"><strong>{item.title}</strong><p>{item.description}</p></li>)}</ol></Section>
    </div>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" role="presentation"><div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="collector-dialog-title" className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6">
      {modal === "collection" ? <>
        <h2 id="collector-dialog-title" className="text-xl font-bold">Quét barcode và xác minh lấy mẫu</h2>
        <p className="mt-2">Quét đủ từng nhãn. Barcode được che trên màn hình và không được lưu sau thao tác.</p>
        <div className="mt-4 max-h-[45vh] space-y-4 overflow-y-auto pr-1">
          {activeSpecimens.map((specimen, index) => {
            const value = scans[specimen.specimenCode] ?? { barcodeValue: "", collectedVolumeMl: "" };
            return <fieldset key={specimen.specimenCode} className="rounded-xl border p-4"><legend className="px-1 font-bold">{specimen.specimenCode}</legend><p className="text-sm">{specimen.specimenType} · {specimen.containerType}</p>
              <label className="mt-3 block font-medium" htmlFor={`barcode-${index}`}>Quét barcode</label>
              <input ref={(element) => { scanInputs.current[index] = element; }} id={`barcode-${index}`} type="password" autoComplete="off" spellCheck={false} value={value.barcodeValue} onChange={(event) => setScans((current) => ({ ...current, [specimen.specimenCode]: { ...value, barcodeValue: event.target.value } }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); scanInputs.current[index + 1]?.focus(); } }} aria-describedby={`barcode-state-${index}`} className="mt-1 min-h-11 w-full rounded border p-2 font-mono" />
              <p id={`barcode-state-${index}`} className="mt-1 text-sm text-slate-600">{value.barcodeValue ? `Đã quét ${maskBarcode(value.barcodeValue)}` : "Chưa quét"}</p>
              <label className="mt-3 block font-medium" htmlFor={`volume-${index}`}>Thể tích lấy được (ml, không bắt buộc)</label>
              <input id={`volume-${index}`} type="number" min="0.01" step="0.01" inputMode="decimal" value={value.collectedVolumeMl} onChange={(event) => setScans((current) => ({ ...current, [specimen.specimenCode]: { ...value, collectedVolumeMl: event.target.value } }))} className="mt-1 min-h-11 w-full rounded border p-2" />
            </fieldset>;
          })}
        </div>
        {missingScan && <p role="alert" className="mt-3 text-red-700">Cần quét đủ tất cả bệnh phẩm.</p>}
        {duplicateScan && <p role="alert" className="mt-3 text-red-700">Không được dùng cùng một barcode cho nhiều bệnh phẩm.</p>}
        {[
          "Đã xác nhận họ và tên.",
          "Đã xác nhận ngày sinh.",
          "Đã nhận được sự đồng ý lấy mẫu.",
        ].map((label, index) => <label key={label} className="mt-3 block"><input type="checkbox" checked={checks[index]} onChange={(event) => setChecks((current) => current.map((checked, itemIndex) => itemIndex === index ? event.target.checked : checked))} /> {label}</label>)}
        <Actions busy={saving} disabled={saving || missingScan || duplicateScan || checks.some((checked) => !checked)} close={() => setModal(null)} confirm={() => void run(() => collectSpecimens(order.orderCode, { expectedVersion: order.version, operationId: newOperationId(), identityConfirmation: { fullNameConfirmed: checks[0], dateOfBirthConfirmed: checks[1] }, consentConfirmed: checks[2], specimens: activeSpecimens.map((specimen) => { const value = scans[specimen.specimenCode] ?? { barcodeValue: "", collectedVolumeMl: "" }; return { barcodeValue: value.barcodeValue.trim(), ...(value.collectedVolumeMl ? { collectedVolumeMl: value.collectedVolumeMl } : {}) }; }) }), true)} />
      </> : <>
        <h2 id="collector-dialog-title" className="text-xl font-bold">Không thể thực hiện lấy mẫu</h2>
        <p className="mt-2">Đơn sẽ quay lại chờ điều phối. Không nhập thông tin bệnh lý không cần thiết.</p>
        <label className="mt-4 block">Lý do<select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded border p-2">{["PATIENT_UNAVAILABLE", "IDENTITY_MISMATCH", "PATIENT_DECLINED", "UNSAFE_ENVIRONMENT", "COLLECTION_NOT_POSSIBLE", "OTHER"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="mt-4 block">Ghi chú<textarea maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full rounded border p-2"/><small>{note.length}/500 ký tự</small></label>
        {reason === "OTHER" && note.trim().length < 3 && <p className="text-red-700">Lý do khác cần ghi chú.</p>}
        <Actions busy={saving} disabled={saving || (reason === "OTHER" && note.trim().length < 3)} close={() => setModal(null)} confirm={() => void run(() => reportFailure(order.orderCode, order.version, reason, note))} />
      </>}
    </div></div>}
  </>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl bg-white p-5"><h2 className="font-bold">{title}</h2><div className="mt-2">{children}</div></section>; }
function Actions({ busy, disabled, close, confirm }: { busy: boolean; disabled: boolean; close: () => void; confirm: () => void }) { return <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={close} disabled={busy} className="rounded border px-4 py-2 disabled:opacity-50">Đóng</button><button type="button" onClick={confirm} disabled={disabled} className="rounded bg-teal-800 px-4 py-2 text-white disabled:opacity-40">{busy ? "Đang xử lý…" : "Xác nhận"}</button></div>; }
function maskBarcode(value: string) { const clean = value.trim(); return clean.length <= 4 ? "••••" : `••••${clean.slice(-4)}`; }
