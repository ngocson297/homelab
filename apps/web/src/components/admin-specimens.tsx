"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminOrderDetail } from "@/lib/admin-orders";
import { code128BSvgDataUrl } from "@/lib/code128";
import {
  getSpecimenLabels,
  newOperationId,
  prepareSpecimens,
  recordLabelsPrinted,
  SpecimenApiError,
  type SpecimenLabelsResponse,
} from "@/lib/specimens";

export function AdminSpecimenSection({
  order,
  onChanged,
}: {
  order: AdminOrderDetail;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [labels, setLabels] = useState<SpecimenLabelsResponse | null>(null);
  const canPrepare = order.status !== "PENDING_CONFIRMATION" && order.status !== "CANCELLED" && order.specimens.length === 0;

  async function prepare() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await prepareSpecimens(order.orderCode, order.version, newOperationId());
      await onChanged();
    } catch (reason) {
      setError(message(reason));
      if (reason instanceof SpecimenApiError && reason.status === 409) await onChanged();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function openLabels() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      setLabels(await getSpecimenLabels(order.orderCode));
    } catch (reason) {
      setError(message(reason));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm" aria-labelledby="specimen-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="specimen-heading" className="text-xl font-bold">Bệnh phẩm</h2>
          <p className="mt-1 text-sm text-slate-600">Quản lý kế hoạch, nhãn và chuỗi bàn giao của từng bệnh phẩm.</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {canPrepare && <button type="button" disabled={busy} onClick={() => void prepare()} className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Đang chuẩn bị…" : "Chuẩn bị bệnh phẩm"}</button>}
          {order.specimens.length > 0 && <button type="button" disabled={busy} onClick={() => void openLabels()} className="rounded-lg border border-teal-700 px-4 py-2 font-semibold text-teal-800 disabled:opacity-50">Xem và in nhãn</button>}
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
      {order.requiresRecollection && <p className="mt-4 rounded-lg bg-red-50 p-3 font-semibold text-red-800">Đơn có bệnh phẩm cần lấy lại. Vui lòng xử lý theo quy trình vận hành.</p>}
      {order.specimens.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-slate-600">Chưa có kế hoạch bệnh phẩm.</p>
      ) : (
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {order.specimens.map((specimen) => (
            <li key={specimen.specimenCode} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><strong>{specimen.specimenCode}</strong><StatusBadge status={specimen.status} /></div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-slate-600">Loại mẫu</dt><dd>{specimen.specimenType}</dd>
                <dt className="text-slate-600">Ống chứa</dt><dd>{specimen.containerType}</dd>
                <dt className="text-slate-600">Thể tích mục tiêu</dt><dd>{volume(specimen.targetVolumeMl)}</dd>
                <dt className="text-slate-600">Thể tích đã lấy</dt><dd>{volume(specimen.collectedVolumeMl)}</dd>
              </dl>
              {specimen.requiresManualReview && <p className="mt-3 rounded-lg bg-amber-100 p-2 text-sm font-semibold text-amber-900">Cần rà soát cấu hình lấy mẫu thủ công.</p>}
              {specimen.rejectionReason && <p className="mt-3 text-sm text-red-800">Lý do từ chối: {specimen.rejectionReason}</p>}
              <p className="mt-3 text-sm font-semibold">Xét nghiệm liên kết</p>
              <ul className="list-inside list-disc text-sm">{specimen.linkedTests.map((test) => <li key={test.testCode}>{test.testName} ({test.testCode})</li>)}</ul>
              {specimen.custodyTimeline && specimen.custodyTimeline.length > 0 && <details className="mt-4"><summary className="cursor-pointer font-semibold">Chuỗi bàn giao</summary><ol className="mt-2 space-y-2 border-l-2 border-teal-700 pl-4">{[...specimen.custodyTimeline].sort((a,b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt)).map((event, index) => <li key={`${event.occurredAt}-${event.eventType}-${index}`}><p className="font-medium">{event.title}</p><p className="text-xs text-slate-600">{event.actorType}{event.actorEmployeeCode ? ` · ${event.actorEmployeeCode}` : ""} · {formatDate(event.occurredAt)}</p></li>)}</ol></details>}
            </li>
          ))}
        </ul>
      )}
      {labels && <LabelPreview response={labels} onClose={() => setLabels(null)} />}
    </section>
  );
}

function LabelPreview({ response, onClose }: { response: SpecimenLabelsResponse; onClose: () => void }) {
  const [printing, setPrinting] = useState(false);
  const printingRef = useRef(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !printing) onClose();
      if (event.key !== "Tab") return;
      const focusable = dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose, printing]);

  async function print() {
    if (printingRef.current) return;
    printingRef.current = true;
    setPrinting(true);
    setError("");
    try {
      await recordLabelsPrinted(response.orderCode, newOperationId(), response.labels.map((label) => label.specimenCode), 1);
      window.print();
    } catch (reason) {
      setError(message(reason));
    } finally {
      printingRef.current = false;
      setPrinting(false);
    }
  }

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 print:static print:bg-white print:p-0" role="presentation">
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="label-preview-title" className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      <div className="no-print flex flex-wrap items-center justify-between gap-3"><div><h2 id="label-preview-title" className="text-2xl font-bold">Xem trước nhãn bệnh phẩm</h2><p className="text-sm text-slate-600">Nhãn chỉ chứa mã bệnh phẩm và barcode không chứa thông tin cá nhân.</p></div><div className="flex gap-2"><button ref={closeButton} type="button" disabled={printing} onClick={onClose} className="rounded-lg border px-4 py-2">Đóng</button><button type="button" disabled={printing || response.labels.length === 0} onClick={() => void print()} className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{printing ? "Đang ghi nhận…" : "In nhãn"}</button></div></div>
      {error && <p role="alert" className="no-print mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 print:mt-0 print:grid-cols-2">
        {response.labels.map((label) => <article key={label.specimenCode} className="specimen-label break-inside-avoid rounded border-2 border-black p-3 text-center">
          {/* A local data URL is used so barcode data never leaves the browser. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={code128BSvgDataUrl(label.barcodeValue)} alt={`Barcode của ${label.specimenCode}`} className="mx-auto h-16 max-w-full" />
          <p className="mt-1 font-mono text-lg font-bold tracking-wide">{label.specimenCode}</p>
          <p className="text-xs">{label.specimenType} · {label.containerType}{label.targetVolumeMl ? ` · ${label.targetVolumeMl} ml` : ""}</p>
        </article>)}
      </div>
    </div>
  </div>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold" aria-label={`Trạng thái ${status}`}>{status}</span>;
}
const volume = (value?: string | null) => value ? `${value} ml` : "Chưa cấu hình";
const formatDate = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const message = (reason: unknown) => reason instanceof Error ? reason.message : "Không thể xử lý bệnh phẩm.";
