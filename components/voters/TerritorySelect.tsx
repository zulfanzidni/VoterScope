"use client";

/**
 * VoterScope Demo — TerritorySelect Component
 *
 * Dynamic cascading dropdown for Provinsi -> Kabupaten/Kota -> Kecamatan -> Kelurahan/Desa
 * integrated with official Kode Wilayah Indonesia (38 Provinsi Kemendagri).
 *
 * Automatically respects user scope boundaries by locking higher levels the user cannot change.
 */

import { useState, useEffect } from "react";
import type { SessionUser } from "@/lib/types";

export type TerritoryValue = {
  provinceId: string;
  kabupatenId: string;
  kecamatanId: string;
  kelurahanId: string;
};

interface TerritoryItem {
  id: string;
  code: string;
  name: string;
}

export type TerritoryMaxLevel = "PROVINCE" | "KABUPATEN" | "KECAMATAN" | "KELURAHAN";

type Props = {
  user: SessionUser;
  value: TerritoryValue;
  onChange: (val: TerritoryValue) => void;
  errors?: Partial<Record<keyof TerritoryValue, string>>;
  disabled?: boolean;
  maxLevel?: TerritoryMaxLevel;
};

// Client-side session cache to make dropdown selection instant (0ms) across switches
const clientTerritoryCache = {
  provinces: [] as TerritoryItem[],
  kabupaten: new Map<string, TerritoryItem[]>(),
  kecamatan: new Map<string, TerritoryItem[]>(),
  kelurahan: new Map<string, TerritoryItem[]>(),
};

export function TerritorySelect({
  user,
  value,
  onChange,
  errors,
  disabled = false,
  maxLevel = "KELURAHAN",
}: Props) {
  const [provinces, setProvinces] = useState<TerritoryItem[]>(clientTerritoryCache.provinces);
  const [kabupatenList, setKabupatenList] = useState<TerritoryItem[]>([]);
  const [kecamatanList, setKecamatanList] = useState<TerritoryItem[]>([]);
  const [kelurahanList, setKelurahanList] = useState<TerritoryItem[]>([]);

  const [loadingProvinces, setLoadingProvinces] = useState(clientTerritoryCache.provinces.length === 0);
  const [loadingKabupaten, setLoadingKabupaten] = useState(false);
  const [loadingKecamatan, setLoadingKecamatan] = useState(false);
  const [loadingKelurahan, setLoadingKelurahan] = useState(false);

  // User-restricted levels
  const isProvinceLocked = !!user.provinceId;
  const isKabupatenLocked = !!user.kabupatenId;
  const isKecamatanLocked = !!user.kecamatanId;
  const isKelurahanLocked = !!user.kelurahanId;

  // Scope visibility levels based on maxLevel
  const showKabupaten = maxLevel !== "PROVINCE";
  const showKecamatan = maxLevel === "KECAMATAN" || maxLevel === "KELURAHAN";
  const showKelurahan = maxLevel === "KELURAHAN";

  // 1. Initial load of provinces
  useEffect(() => {
    let isMounted = true;

    async function loadProvinces() {
      await Promise.resolve();
      if (!isMounted) return;

      if (clientTerritoryCache.provinces.length > 0) {
        setProvinces(clientTerritoryCache.provinces);
        setLoadingProvinces(false);
        return;
      }

      try {
        const res = await fetch("/api/territories?type=provinces");
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            const list = json.provinces ?? [];
            clientTerritoryCache.provinces = list;
            setProvinces(list);
          }
        }
      } catch (err) {
        console.error("Failed to load provinces:", err);
      } finally {
        if (isMounted) setLoadingProvinces(false);
      }
    }

    loadProvinces();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Kabupaten when Province changes
  useEffect(() => {
    if (!showKabupaten) return;
    const provId = value.provinceId || user.provinceId || "32";
    let isMounted = true;

    async function loadKabupaten() {
      await Promise.resolve();
      if (!isMounted) return;

      if (clientTerritoryCache.kabupaten.has(provId)) {
        setKabupatenList(clientTerritoryCache.kabupaten.get(provId)!);
        return;
      }

      setLoadingKabupaten(true);
      try {
        const res = await fetch(`/api/territories?type=kabupaten&parentId=${provId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            const list = json.kabupaten ?? [];
            clientTerritoryCache.kabupaten.set(provId, list);
            setKabupatenList(list);
          }
        }
      } catch (err) {
        console.error("Failed to load kabupaten:", err);
      } finally {
        if (isMounted) setLoadingKabupaten(false);
      }
    }

    if (provId) {
      loadKabupaten();
    }
    return () => {
      isMounted = false;
    };
  }, [value.provinceId, user.provinceId, showKabupaten]);

  // 3. Load Kecamatan when Kabupaten changes
  useEffect(() => {
    if (!showKecamatan) return;
    const kabId = value.kabupatenId || user.kabupatenId;
    let isMounted = true;

    async function loadKecamatan() {
      await Promise.resolve();
      if (!isMounted) return;

      if (!kabId) {
        setKecamatanList([]);
        return;
      }

      if (clientTerritoryCache.kecamatan.has(kabId)) {
        setKecamatanList(clientTerritoryCache.kecamatan.get(kabId)!);
        return;
      }

      setLoadingKecamatan(true);
      try {
        const res = await fetch(`/api/territories?type=kecamatan&parentId=${kabId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            const list = json.kecamatan ?? [];
            clientTerritoryCache.kecamatan.set(kabId, list);
            setKecamatanList(list);
          }
        }
      } catch (err) {
        console.error("Failed to load kecamatan:", err);
      } finally {
        if (isMounted) setLoadingKecamatan(false);
      }
    }

    loadKecamatan();
    return () => {
      isMounted = false;
    };
  }, [value.kabupatenId, user.kabupatenId, showKecamatan]);

  // 4. Load Kelurahan when Kecamatan changes
  useEffect(() => {
    if (!showKelurahan) return;
    const kecId = value.kecamatanId || user.kecamatanId;
    let isMounted = true;

    async function loadKelurahan() {
      await Promise.resolve();
      if (!isMounted) return;

      if (!kecId) {
        setKelurahanList([]);
        return;
      }

      if (clientTerritoryCache.kelurahan.has(kecId)) {
        setKelurahanList(clientTerritoryCache.kelurahan.get(kecId)!);
        return;
      }

      setLoadingKelurahan(true);
      try {
        const res = await fetch(`/api/territories?type=kelurahan&parentId=${kecId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            const list = json.kelurahan ?? [];
            clientTerritoryCache.kelurahan.set(kecId, list);
            setKelurahanList(list);
          }
        }
      } catch (err) {
        console.error("Failed to load kelurahan:", err);
      } finally {
        if (isMounted) setLoadingKelurahan(false);
      }
    }

    loadKelurahan();
    return () => {
      isMounted = false;
    };
  }, [value.kecamatanId, user.kecamatanId, showKelurahan]);

  // Set default initial selection if empty
  useEffect(() => {
    if (!value.provinceId) {
      const pId = user.provinceId ?? "32";
      const kbId = showKabupaten ? (user.kabupatenId ?? (kabupatenList[0]?.id || "3201")) : "";
      const kcId = showKecamatan ? (user.kecamatanId ?? (kecamatanList[0]?.id || "3201210")) : "";
      const klId = showKelurahan ? (user.kelurahanId ?? (kelurahanList[0]?.id || "3201210005")) : "";
      onChange({
        provinceId: pId,
        kabupatenId: kbId,
        kecamatanId: kcId,
        kelurahanId: klId,
      });
    }
  }, [value.provinceId, user, kabupatenList, kecamatanList, kelurahanList, showKabupaten, showKecamatan, showKelurahan, onChange]);

  const handleProvinceChange = (newProvinceId: string) => {
    onChange({
      provinceId: newProvinceId,
      kabupatenId: "",
      kecamatanId: "",
      kelurahanId: "",
    });
  };

  const handleKabupatenChange = (newKabupatenId: string) => {
    onChange({
      ...value,
      kabupatenId: newKabupatenId,
      kecamatanId: "",
      kelurahanId: "",
    });
  };

  const handleKecamatanChange = (newKecamatanId: string) => {
    onChange({
      ...value,
      kecamatanId: newKecamatanId,
      kelurahanId: "",
    });
  };

  const handleKelurahanChange = (newKelurahanId: string) => {
    onChange({
      ...value,
      kelurahanId: newKelurahanId,
    });
  };

  if (loadingProvinces) {
    return (
      <div className="p-4 rounded-lg bg-surface border border-subtle animate-pulse text-xs text-secondary">
        Memuat data wilayah administratif Indonesia...
      </div>
    );
  }

  const gridColsClass =
    maxLevel === "PROVINCE"
      ? "grid-cols-1"
      : maxLevel === "KABUPATEN"
      ? "grid-cols-1 sm:grid-cols-2"
      : maxLevel === "KECAMATAN"
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid ${gridColsClass} gap-3`}>
      {/* 1. Provinsi */}
      <div>
        <label className="input-label">
          Provinsi {isProvinceLocked && <span className="text-muted text-[10px]">(Terkunci)</span>}
        </label>
        <select
          id="select-province"
          value={value.provinceId}
          disabled={disabled || isProvinceLocked}
          onChange={(e) => handleProvinceChange(e.target.value)}
          className={`input-field ${errors?.provinceId ? "error" : ""}`}
        >
          <option value="">-- Pilih Provinsi (38 Provinsi) --</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name}
            </option>
          ))}
        </select>
        {errors?.provinceId && <p className="input-error-msg">{errors.provinceId}</p>}
      </div>

      {/* 2. Kabupaten / Kota */}
      {showKabupaten && (
        <div>
          <label className="input-label">
            Kabupaten / Kota{" "}
            {isKabupatenLocked && <span className="text-muted text-[10px]">(Terkunci)</span>}
            {loadingKabupaten && <span className="text-[10px] text-brand-blue ml-1">...</span>}
          </label>
          <select
            id="select-kabupaten"
            value={value.kabupatenId}
            disabled={disabled || isKabupatenLocked || !value.provinceId || loadingKabupaten}
            onChange={(e) => handleKabupatenChange(e.target.value)}
            className={`input-field ${errors?.kabupatenId ? "error" : ""}`}
          >
            <option value="">
              {loadingKabupaten ? "Memuat Kabupaten..." : "-- Pilih Kabupaten/Kota --"}
            </option>
            {kabupatenList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.code} - {k.name}
              </option>
            ))}
          </select>
          {errors?.kabupatenId && <p className="input-error-msg">{errors.kabupatenId}</p>}
        </div>
      )}

      {/* 3. Kecamatan */}
      {showKecamatan && (
        <div>
          <label className="input-label">
            Kecamatan {isKecamatanLocked && <span className="text-muted text-[10px]">(Terkunci)</span>}
            {loadingKecamatan && <span className="text-[10px] text-brand-blue ml-1">...</span>}
          </label>
          <select
            id="select-kecamatan"
            value={value.kecamatanId}
            disabled={disabled || isKecamatanLocked || !value.kabupatenId || loadingKecamatan}
            onChange={(e) => handleKecamatanChange(e.target.value)}
            className={`input-field ${errors?.kecamatanId ? "error" : ""}`}
          >
            <option value="">
              {loadingKecamatan ? "Memuat Kecamatan..." : "-- Pilih Kecamatan --"}
            </option>
            {kecamatanList.map((kc) => (
              <option key={kc.id} value={kc.id}>
                {kc.code} - {kc.name}
              </option>
            ))}
          </select>
          {errors?.kecamatanId && <p className="input-error-msg">{errors.kecamatanId}</p>}
        </div>
      )}

      {/* 4. Kelurahan / Desa */}
      {showKelurahan && (
        <div>
          <label className="input-label">
            Kelurahan / Desa{" "}
            {isKelurahanLocked && <span className="text-muted text-[10px]">(Terkunci)</span>}
            {loadingKelurahan && <span className="text-[10px] text-brand-blue ml-1">...</span>}
          </label>
          <select
            id="select-kelurahan"
            value={value.kelurahanId}
            disabled={disabled || isKelurahanLocked || !value.kecamatanId || loadingKelurahan}
            onChange={(e) => handleKelurahanChange(e.target.value)}
            className={`input-field ${errors?.kelurahanId ? "error" : ""}`}
          >
            <option value="">
              {loadingKelurahan ? "Memuat Kelurahan..." : "-- Pilih Kelurahan/Desa --"}
            </option>
            {kelurahanList.map((kl) => (
              <option key={kl.id} value={kl.id}>
                {kl.code} - {kl.name}
              </option>
            ))}
          </select>
          {errors?.kelurahanId && <p className="input-error-msg">{errors.kelurahanId}</p>}
        </div>
      )}
    </div>
  );
}
