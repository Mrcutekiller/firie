import { useState } from "react";
import GarmentImage from "./GarmentImage";
import { Button } from "./ui";
import { getPlace, PLACES, VERIFICATION_LABELS, type MenuItem } from "../lib/places";
import { useApp } from "../lib/store";
import type { DatePlan, DatePlanOrderLine } from "../lib/types";

/**
 * Bottom sheet to create or edit a date plan (§3.8).
 *
 * Everything here is honest by construction:
 *  - outfits are picked from the user's own closet (Firie never suggests items they don't own),
 *  - menu order lines keep the venue's verification state (verified / estimate / unavailable),
 *  - the plan limit is enforced in the store; this sheet only surfaces the message.
 */

interface Props {
  /** Place preselected when opened from a place page. */
  placeId: string;
  /** When present the sheet edits this plan instead of creating one. */
  plan?: DatePlan | null;
  onClose: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DatePlanSheet({ placeId, plan, onClose }: Props) {
  const { closet, saveDatePlan, updateDatePlan } = useApp();

  const [selectedPlaceId, setSelectedPlaceId] = useState(plan?.placeId ?? placeId);
  const [name, setName] = useState(plan?.name ?? "");
  const [date, setDate] = useState(plan?.date ?? todayISO());
  const [time, setTime] = useState(plan?.time ?? "19:00");
  const [people, setPeople] = useState(plan?.people ?? 2);
  const [budget, setBudget] = useState(String(plan?.budget ?? 2000));
  const [itemIds, setItemIds] = useState<string[]>(plan?.itemIds ?? []);
  const [order, setOrder] = useState<DatePlanOrderLine[]>(plan?.order ?? []);
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [error, setError] = useState("");

  const place = getPlace(selectedPlaceId);

  const budgetNum = Math.max(0, Number(budget.replace(/[^\d.]/g, "")) || 0);
  const pricedTotal = order.reduce((sum, l) => sum + (l.unitPrice ?? 0) * l.qty, 0);
  const anyPriced = order.some((l) => l.unitPrice !== null);
  const unpricedCount = order.length - order.filter((l) => l.unitPrice !== null).length;
  const estimatedTotal = anyPriced ? pricedTotal : null;
  const overBudget = budgetNum > 0 && estimatedTotal !== null && estimatedTotal > budgetNum;

  const toggleItem = (id: string) => {
    setItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addLine = (item: MenuItem) => {
    setOrder((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) => (l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          qty: 1,
          unitPrice: item.price,
          currency: item.currency,
          verification: item.verification,
        },
      ];
    });
  };

  const setQty = (itemId: string, delta: number) => {
    setOrder((prev) =>
      prev
        .map((l) => (l.itemId === itemId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  };

  const save = () => {
    setError("");
    const draft = {
      name: name.trim() || `${place?.name ?? "Date"} date`,
      placeId: selectedPlaceId,
      date,
      time,
      people: Math.min(20, Math.max(1, Math.round(people) || 1)),
      budget: budgetNum,
      itemIds,
      order,
      estimatedTotal,
      notes: notes.trim(),
      status: "upcoming" as const,
    };

    if (plan) {
      updateDatePlan(plan.id, draft);
      onClose();
      return;
    }
    const saved = saveDatePlan(draft);
    if (!saved) {
      setError("Free Firie keeps 3 date plans. Pro keeps unlimited plans with full editing.");
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-navy-950/50 backdrop-blur-sm animate-fade"
      onClick={onClose}
    >
      <div
        className="bottom-sheet max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white p-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={plan ? "Edit date plan" : "Plan a date"}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-navy-200" />

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy-900">{plan ? "Edit date plan" : "Plan a date"}</h3>
          <button onClick={onClose} aria-label="Close" className="text-lg text-navy-400">
            ×
          </button>
        </div>

        {/* Place */}
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8392a7]">
          Place
          <select
            value={selectedPlaceId}
            onChange={(e) => {
              setSelectedPlaceId(e.target.value);
              setOrder([]); // order lines belong to the previous venue's menu
            }}
            className="mt-1 w-full rounded-xl border border-[#e2e8ef] bg-white px-3 py-2.5 text-xs font-semibold text-[#112844] outline-none focus:border-[#7892b4]"
          >
            {PLACES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.neighborhood}
              </option>
            ))}
          </select>
        </label>

        {/* Name / date / time */}
        <div className="mt-3 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Plan name (e.g. Anniversary dinner)"
            aria-label="Plan name"
            className="w-full rounded-xl border border-[#e2e8ef] px-3 py-2.5 text-xs outline-none focus:border-[#7892b4]"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-semibold text-[#7186a0]">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e2e8ef] px-2.5 py-2 text-xs text-[#112844] outline-none focus:border-[#7892b4]"
              />
            </label>
            <label className="text-[10px] font-semibold text-[#7186a0]">
              Time
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e2e8ef] px-2.5 py-2 text-xs text-[#112844] outline-none focus:border-[#7892b4]"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-semibold text-[#7186a0]">
              People
              <input
                type="number"
                min={1}
                max={20}
                value={people}
                onChange={(e) => setPeople(Number(e.target.value) || 1)}
                className="mt-1 w-full rounded-xl border border-[#e2e8ef] px-2.5 py-2 text-xs text-[#112844] outline-none focus:border-[#7892b4]"
              />
            </label>
            <label className="text-[10px] font-semibold text-[#7186a0]">
              Budget (ETB)
              <input
                inputMode="numeric"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e2e8ef] px-2.5 py-2 text-xs text-[#112844] outline-none focus:border-[#7892b4]"
              />
            </label>
          </div>
        </div>

        {/* Outfit — closet only */}
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8392a7]">
            Outfit from your closet
          </p>
          {closet.length === 0 ? (
            <p className="mt-1.5 rounded-xl bg-[#f4f6f8] px-3 py-2 text-[10.5px] leading-relaxed text-[#596575]">
              Your closet is empty — add a few pieces first. Firie only styles clothes you own.
            </p>
          ) : (
            <>
              <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
                {closet.map((item) => {
                  const active = itemIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      aria-pressed={active}
                      className={`w-[74px] shrink-0 rounded-xl border p-1.5 text-left ${
                        active ? "border-[#102f53] bg-[#eef3fa]" : "border-[#e7ebf0] bg-white"
                      }`}
                    >
                      <GarmentImage
                        src={item.imageUrl}
                        alt={item.name}
                        slot={item.slot}
                        colorHex={item.colorHex}
                        className="h-14 w-full object-contain"
                      />
                      <span className="mt-1 block truncate text-[9px] font-semibold text-[#526b89]">
                        {item.name}
                      </span>
                      {active && <span className="block text-[9px] font-bold text-[#102f53]">✓ worn</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[9.5px] text-[#98a4b4]">
                {itemIds.length} piece{itemIds.length === 1 ? "" : "s"} selected
              </p>
            </>
          )}
        </div>

        {/* Menu order */}
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8392a7]">Plan what to order</p>
          {!place?.menu || place.menu.items.length === 0 ? (
            <p className="mt-1.5 rounded-xl bg-[#f4f6f8] px-3 py-2 text-[10.5px] leading-relaxed text-[#596575]">
              No published menu for this venue — prices are “contact restaurant”, never guessed.
            </p>
          ) : (
            <>
              <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {place.menu.items.map((item) => {
                  const line = order.find((l) => l.itemId === item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-xl border border-[#edf0f4] px-2.5 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold text-[#30435c]">
                          {item.name}
                        </span>
                        <span className="block text-[9.5px] text-[#8a98a9]">
                          {item.price !== null
                            ? `${item.price.toLocaleString()} ${item.currency}`
                            : "Price unavailable — contact restaurant"}
                          {" · "}
                          {VERIFICATION_LABELS[item.verification]}
                        </span>
                      </span>
                      {line ? (
                        <span className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => setQty(item.id, -1)}
                            aria-label={`Remove one ${item.name}`}
                            className="h-6 w-6 rounded-full border border-[#d8dfe8] text-xs font-bold text-[#526b89]"
                          >
                            −
                          </button>
                          <span className="w-4 text-center text-[11px] font-bold text-[#112844]">
                            {line.qty}
                          </span>
                          <button
                            onClick={() => setQty(item.id, 1)}
                            aria-label={`Add one ${item.name}`}
                            className="h-6 w-6 rounded-full border border-[#d8dfe8] text-xs font-bold text-[#526b89]"
                          >
                            +
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => addLine(item)}
                          className="shrink-0 rounded-full bg-[#eef3fa] px-2.5 py-1.5 text-[10px] font-bold text-[#17375d]"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {order.length > 0 && (
                <div className="mt-2 rounded-xl bg-[#f4f6f8] px-3 py-2.5 text-[10.5px] text-[#596575]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Planned total</span>
                    <span className="font-bold text-[#112844]">
                      {estimatedTotal !== null ? `${estimatedTotal.toLocaleString()} ETB` : "—"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-semibold">Budget</span>
                    <span className={overBudget ? "font-bold text-[#b45252]" : "font-bold text-[#112844]"}>
                      {budgetNum.toLocaleString()} ETB {overBudget ? "· over budget" : ""}
                    </span>
                  </div>
                  {unpricedCount > 0 && (
                    <p className="mt-1.5 text-[9.5px] italic text-[#8a9099]">
                      {unpricedCount} item{unpricedCount === 1 ? "" : "s"} without a listed price — contact the
                      restaurant before you go.
                    </p>
                  )}
                  {anyPriced && order.some((l) => l.verification === "estimated") && (
                    <p className="mt-1 text-[9.5px] italic text-[#8a9099]">
                      Some totals are estimates, not confirmed menu prices.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Notes */}
        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-[#8392a7]">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Reservation, seating preference, reminder…"
            className="mt-1 w-full resize-none rounded-xl border border-[#e2e8ef] px-3 py-2 text-xs outline-none focus:border-[#7892b4]"
          />
        </label>

        {error && (
          <p className="mt-3 rounded-xl border border-[#f0d7d7] bg-[#fdf3f3] px-3 py-2 text-[10.5px] font-semibold text-[#b45252]">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={save} className="flex-1">
            {plan ? "Save changes" : "Save plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
