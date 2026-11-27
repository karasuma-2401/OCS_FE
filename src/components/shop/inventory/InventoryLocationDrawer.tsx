import { useMemo, useState, type FormEvent } from "react";
import { MapPin, MapPinOff, Plus, Search, Warehouse, X } from "lucide-react";
import { inventoryApi, type InventoryLocation } from "@/api/inventory";
import { Button, Input, Modal } from "@/components/shared";
import {
  inventoryErrorText,
  UNASSIGNED_LOCATION_VALUE,
} from "./inventoryHelpers";

interface InventoryLocationDrawerProps {
  open: boolean;
  locations: InventoryLocation[];
  unassignedCount: number;
  selectedLocationId: string;
  canManageLocations: boolean;
  onClose: () => void;
  onSelectLocation: (locationId: string) => void;
  onLocationCreated: (location: InventoryLocation) => void;
}

export function InventoryLocationDrawer({
  open,
  locations,
  unassignedCount,
  selectedLocationId,
  canManageLocations,
  onClose,
  onSelectLocation,
  onLocationCreated,
}: InventoryLocationDrawerProps) {
  const [filter, setFilter] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredLocations = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase("vi-VN");
    if (!q) return locations;
    return locations.filter(
      (loc) =>
        loc.code.toLocaleLowerCase("vi-VN").includes(q) ||
        loc.name.toLocaleLowerCase("vi-VN").includes(q),
    );
  }, [locations, filter]);

  const totalOnShelves = useMemo(
    () => locations.reduce((sum, loc) => sum + (loc.productCount ?? 0), 0),
    [locations],
  );

  function resetAndClose() {
    setError("");
    setShowCreateForm(false);
    setCode("");
    setName("");
    onClose();
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (saving || !code.trim() || !name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await inventoryApi.createLocation(
        code.trim(),
        name.trim(),
      );
      setCode("");
      setName("");
      setShowCreateForm(false);
      onLocationCreated(created);
    } catch (err) {
      setError(inventoryErrorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Sơ đồ kệ & Vị trí kho"
      description={`${locations.length} vị trí đang hoạt động · ${totalOnShelves.toLocaleString("vi-VN")} món đang lưu trên kệ`}
      error={error}
      disabled={saving}
      className="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {canManageLocations ? (
            <Button
              variant={showCreateForm ? "ghost" : "primary"}
              size="sm"
              onClick={() => {
                setShowCreateForm((prev) => !prev);
                setError("");
              }}
              startIcon={
                showCreateForm ? (
                  <X size={15} aria-hidden="true" />
                ) : (
                  <Plus size={15} aria-hidden="true" />
                )
              }
            >
              {showCreateForm ? "Đóng form thêm vị trí" : "Thêm vị trí mới"}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={resetAndClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {showCreateForm && canManageLocations && (
          <form
            onSubmit={(event) => void handleCreate(event)}
            className="animate-inv-fade-in space-y-3 rounded-xl border border-brand-lavender/60 bg-brand-pink-surface/60 p-4"
          >
            <h3 className="text-sm font-bold text-brand-ink">
              Tạo vị trí / kệ kho mới
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Mã vị trí"
                name="drawerLocationCode"
                value={code}
                maxLength={50}
                required
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ví dụ: A-01"
              />
              <Input
                label="Tên vị trí"
                name="drawerLocationName"
                value={name}
                maxLength={200}
                required
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Kệ áo sơ mi tầng 1"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                loading={saving}
                disabled={!code.trim() || !name.trim()}
              >
                Lưu vị trí
              </Button>
            </div>
          </form>
        )}

        <Input
          aria-label="Tìm mã hoặc tên vị trí kho"
          placeholder="Tìm theo mã kệ hoặc tên vị trí…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          startAdornment={<Search size={16} aria-hidden="true" />}
        />

        <div className="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={selectedLocationId === UNASSIGNED_LOCATION_VALUE}
            onClick={() => {
              onSelectLocation(UNASSIGNED_LOCATION_VALUE);
              resetAndClose();
            }}
            className={`group flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-highlight motion-reduce:transition-none ${
              selectedLocationId === UNASSIGNED_LOCATION_VALUE
                ? "border-brand-highlight bg-brand-pink-surface"
                : "border-brand-lavender bg-white hover:border-brand-highlight hover:bg-surface-active"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-state-warning-muted text-state-warning-strong">
                <MapPinOff size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-brand-ink">Chưa xếp vị trí</p>
                <p className="mt-0.5 text-[13px] leading-5 text-text-secondary">
                  Bấm để lọc các món cần xếp kệ
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-state-warning-muted px-2.5 py-1 text-sm font-semibold tabular-nums text-state-warning-strong">
              {unassignedCount.toLocaleString("vi-VN")} món
            </span>
          </button>

          {filteredLocations.map((loc) => {
            const active = selectedLocationId === loc.id;
            const count = loc.productCount ?? 0;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => {
                  onSelectLocation(loc.id);
                  resetAndClose();
                }}
                className={`group flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand-highlight motion-reduce:transition-none ${
                  active
                    ? "border-brand-highlight/60 bg-brand-pink-surface shadow-xs"
                    : "border-border bg-white hover:border-brand-lavender hover:bg-surface-active hover:shadow-xs"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-pink-light text-brand-highlight transition-transform duration-150 group-hover:scale-105 motion-reduce:transition-none">
                    <MapPin size={17} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-brand-ink">
                      {loc.code}
                    </p>
                    <p className="truncate text-xs text-text-secondary">
                      {loc.name}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                    count > 0
                      ? "bg-brand-pink-surface text-brand-highlight"
                      : "bg-surface-dashboard text-muted"
                  }`}
                >
                  {count.toLocaleString("vi-VN")} món
                </span>
              </button>
            );
          })}
        </div>

        {filteredLocations.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
            <Warehouse size={24} className="mx-auto mb-2 text-muted" aria-hidden="true" />
            Không tìm thấy vị trí kho phù hợp.
          </div>
        )}
      </div>
    </Modal>
  );
}
