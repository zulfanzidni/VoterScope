"use client";

/**
 * VoterScope Demo — VoterForm Component
 *
 * Form for creating and editing synthetic voter records.
 * Includes synthetic dummy data generator for rapid demo evaluation.
 *
 * ALL IDENTIFIER VALUES ARE SYNTHETIC DEMO DATA.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TerritorySelect, type TerritoryValue } from "./TerritorySelect";
import {
  Gender,
  GENDER_LABELS,
  Religion,
  RELIGION_LABELS,
  MaritalStatus,
  MARITAL_STATUS_LABELS,
  VoterStatus,
  VOTER_STATUS_LABELS,
  type SessionUser,
} from "@/lib/types";

export type VoterFormData = {
  nik: string;
  fullName: string;
  placeOfBirth: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  religion: string;
  maritalStatus: string;
  occupation: string;
  citizenship: string;
  tps: string;
  status: string;
  provinceId: string;
  kabupatenId: string;
  kecamatanId: string;
  kelurahanId: string;
};

type Props = {
  user: SessionUser;
  initialData?: Partial<VoterFormData>;
  isEdit?: boolean;
  voterId?: string;
};

export function VoterForm({ user, initialData, isEdit = false, voterId }: Props) {
  const router = useRouter();

  const [formData, setFormData] = useState<VoterFormData>({
    nik: initialData?.nik ?? "",
    fullName: initialData?.fullName ?? "",
    placeOfBirth: initialData?.placeOfBirth ?? "",
    dateOfBirth: initialData?.dateOfBirth ?? "1995-05-15",
    gender: initialData?.gender ?? Gender.LAKI_LAKI,
    address: initialData?.address ?? "",
    religion: initialData?.religion ?? Religion.ISLAM,
    maritalStatus: initialData?.maritalStatus ?? MaritalStatus.BELUM_KAWIN,
    occupation: initialData?.occupation ?? "",
    citizenship: initialData?.citizenship ?? "WNI",
    tps: initialData?.tps ?? "001",
    status: initialData?.status ?? VoterStatus.ACTIVE,
    provinceId: initialData?.provinceId ?? user.provinceId ?? "",
    kabupatenId: initialData?.kabupatenId ?? user.kabupatenId ?? "",
    kecamatanId: initialData?.kecamatanId ?? user.kecamatanId ?? "",
    kelurahanId: initialData?.kelurahanId ?? user.kelurahanId ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleTerritoryChange = (territory: TerritoryValue) => {
    setFormData((prev) => ({
      ...prev,
      ...territory,
    }));
  };

  // Demo helper to populate random synthetic data
  const handleFillSyntheticData = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const randomYear = 1970 + Math.floor(Math.random() * 35);
    const randomMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
    const randomDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");

    const sampleNames = [
      "Ahmad Fauzi",
      "Siti Nurhaliza",
      "Budi Santoso",
      "Dewi Lestari",
      "Rizky Pratama",
      "Endang Rahayu",
      "Agus Setiawan",
      "Rina Kusuma",
    ];
    const samplePlaces = ["Jakarta", "Bandung", "Surabaya", "Semarang", "Yogyakarta", "Medan"];
    const sampleJobs = [
      "Karyawan Swasta",
      "Pegawai Negeri Sipil",
      "Wiraswasta",
      "Guru / Pendidik",
      "Tenaga Kesehatan",
      "Pelajar / Mahasiswa",
    ];

    const chosenName = sampleNames[Math.floor(Math.random() * sampleNames.length)]!;
    const chosenPlace = samplePlaces[Math.floor(Math.random() * samplePlaces.length)]!;
    const chosenJob = sampleJobs[Math.floor(Math.random() * sampleJobs.length)]!;

    const chosenGender = Math.random() > 0.5 ? Gender.LAKI_LAKI : Gender.PEREMPUAN;
    const dayNum = parseInt(randomDay, 10);
    const nikDay = chosenGender === Gender.PEREMPUAN ? String(dayNum + 40) : randomDay;
    const regionPrefix =
      formData.kecamatanId && formData.kecamatanId.length >= 6
        ? formData.kecamatanId.slice(0, 6)
        : formData.kabupatenId && formData.kabupatenId.length >= 4
        ? `${formData.kabupatenId}01`
        : "320121";

    setFormData((prev) => ({
      ...prev,
      nik: `${regionPrefix}${nikDay}${randomMonth}${String(randomYear).slice(2)}${randomSuffix}`,
      fullName: chosenName,
      placeOfBirth: chosenPlace,
      dateOfBirth: `${randomYear}-${randomMonth}-${randomDay}`,
      gender: chosenGender,
      address: `Jl. Melati Simpang Demo No. ${Math.floor(1 + Math.random() * 99)}, RT 02 / RW 05`,
      occupation: chosenJob,
      tps: String(Math.floor(1 + Math.random() * 15)).padStart(3, "0"),
    }));
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    // Client-side quick validations
    const newErrors: Record<string, string> = {};
    if (!isEdit && !/^[0-9]{16}$/.test(formData.nik)) {
      newErrors.nik = "NIK harus terdiri dari 16 digit angka (data sintetis)";
    }
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Nama lengkap wajib diisi";
    }
    if (!formData.placeOfBirth.trim()) {
      newErrors.placeOfBirth = "Tempat lahir wajib diisi";
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Tanggal lahir wajib diisi";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Alamat wajib diisi";
    }
    if (!formData.occupation.trim()) {
      newErrors.occupation = "Pekerjaan wajib diisi";
    }
    if (!formData.tps.trim()) {
      newErrors.tps = "Nomor TPS wajib diisi";
    }
    if (!formData.kelurahanId) {
      newErrors.kelurahanId = "Wilayah kelurahan wajib dipilih";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/voters/${voterId}` : "/api/voters";
      const method = isEdit ? "PATCH" : "POST";

      const payload = isEdit
        ? {
            fullName: formData.fullName,
            placeOfBirth: formData.placeOfBirth,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender,
            address: formData.address,
            religion: formData.religion,
            maritalStatus: formData.maritalStatus,
            occupation: formData.occupation,
            citizenship: formData.citizenship,
            tps: formData.tps,
            status: formData.status,
            provinceId: formData.provinceId,
            kabupatenId: formData.kabupatenId,
            kecamatanId: formData.kecamatanId,
            kelurahanId: formData.kelurahanId,
          }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.issues) {
          const fieldIssues: Record<string, string> = {};
          json.error.issues.forEach((issue: { path: (string | number)[]; message: string }) => {
            const field = issue.path[0];
            if (field) fieldIssues[String(field)] = issue.message;
          });
          setErrors(fieldIssues);
        }
        setServerError(json.error?.message ?? "Terjadi kesalahan saat menyimpan data.");
      } else {
        router.push("/dashboard/voters");
        router.refresh();
      }
    } catch (err) {
      console.error("Submit error:", err);
      setServerError("Terjadi gangguan jaringan atau server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="alert alert-error">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      {/* Synthetic Banner & Quick Fill */}
      <div className="p-4 rounded border border-border-subtle bg-surface/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-primary">Simulasi Data Sintetis Administrasi</h4>
            <p className="text-xs text-secondary mt-0.5">
              Identitas disimpan terenkripsi AES-256-GCM. Gunakan data sintetis untuk pengujian sistem.
            </p>
          </div>
        </div>

        {!isEdit && (
          <button
            id="btn-generate-synthetic"
            type="button"
            onClick={handleFillSyntheticData}
            className="btn btn-secondary btn-sm text-xs shrink-0 inline-flex items-center gap-1.5"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-blue-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Isi Contoh Data Sintetis
          </button>
        )}
      </div>

      {/* Bagian 1: Identitas Utama */}
      <div className="card p-4 sm:p-6 space-y-4">
        <h3 className="font-medium text-primary text-sm flex items-center gap-2 border-b border-border-subtle pb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Identitas Pemilih (Sintetis)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* NIK */}
          <div>
            <label className="input-label">
              Nomor Induk Kependudukan (NIK)
              {isEdit && <span className="text-muted lowercase"> (tidak dapat diubah)</span>}
            </label>
            <input
              id="voter-nik"
              type="text"
              maxLength={16}
              disabled={isEdit}
              placeholder="Contoh: 9901011505950001 (16 digit angka)"
              value={formData.nik}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nik: e.target.value.replace(/\D/g, "") }))
              }
              className={`input-field font-mono ${errors.nik ? "error" : ""}`}
            />
            {errors.nik && <p className="input-error-msg">{errors.nik}</p>}
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="input-label">Nama Lengkap</label>
            <input
              id="voter-name"
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={formData.fullName}
              onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
              className={`input-field ${errors.fullName ? "error" : ""}`}
            />
            {errors.fullName && <p className="input-error-msg">{errors.fullName}</p>}
          </div>

          {/* Tempat Lahir */}
          <div>
            <label className="input-label">Tempat Lahir</label>
            <input
              type="text"
              placeholder="Contoh: Jakarta"
              value={formData.placeOfBirth}
              onChange={(e) => setFormData((prev) => ({ ...prev, placeOfBirth: e.target.value }))}
              className={`input-field ${errors.placeOfBirth ? "error" : ""}`}
            />
            {errors.placeOfBirth && <p className="input-error-msg">{errors.placeOfBirth}</p>}
          </div>

          {/* Tanggal Lahir */}
          <div>
            <label className="input-label">Tanggal Lahir</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
              className={`input-field ${errors.dateOfBirth ? "error" : ""}`}
            />
            {errors.dateOfBirth && <p className="input-error-msg">{errors.dateOfBirth}</p>}
          </div>

          {/* Jenis Kelamin */}
          <div>
            <label className="input-label">Jenis Kelamin</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
              className="input-field"
            >
              <option value={Gender.LAKI_LAKI}>{GENDER_LABELS[Gender.LAKI_LAKI]}</option>
              <option value={Gender.PEREMPUAN}>{GENDER_LABELS[Gender.PEREMPUAN]}</option>
            </select>
          </div>

          {/* Agama */}
          <div>
            <label className="input-label">Agama</label>
            <select
              value={formData.religion}
              onChange={(e) => setFormData((prev) => ({ ...prev, religion: e.target.value }))}
              className="input-field"
            >
              {Object.values(Religion).map((rel) => (
                <option key={rel} value={rel}>
                  {RELIGION_LABELS[rel]}
                </option>
              ))}
            </select>
          </div>

          {/* Status Perkawinan */}
          <div>
            <label className="input-label">Status Perkawinan</label>
            <select
              value={formData.maritalStatus}
              onChange={(e) => setFormData((prev) => ({ ...prev, maritalStatus: e.target.value }))}
              className="input-field"
            >
              {Object.values(MaritalStatus).map((st) => (
                <option key={st} value={st}>
                  {MARITAL_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          {/* Pekerjaan */}
          <div>
            <label className="input-label">Pekerjaan</label>
            <input
              type="text"
              placeholder="Contoh: Karyawan Swasta"
              value={formData.occupation}
              onChange={(e) => setFormData((prev) => ({ ...prev, occupation: e.target.value }))}
              className={`input-field ${errors.occupation ? "error" : ""}`}
            />
            {errors.occupation && <p className="input-error-msg">{errors.occupation}</p>}
          </div>
        </div>

        {/* Alamat */}
        <div className="pt-2">
          <label className="input-label">Alamat Lengkap</label>
          <textarea
            rows={3}
            placeholder="Jalan, Gang, RT/RW..."
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            className={`input-field resize-none ${errors.address ? "error" : ""}`}
          />
          {errors.address && <p className="input-error-msg">{errors.address}</p>}
        </div>
      </div>

      {/* Bagian 2: Wilayah & Administrasi TPS */}
      <div className="card p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-primary text-sm flex items-center gap-2 border-b border-border-subtle pb-3">
          <span className="w-2 h-2 rounded-full bg-accent-emerald"></span>
          Wilayah Administrasi & Penempatan TPS
        </h3>

        <TerritorySelect
          user={user}
          value={{
            provinceId: formData.provinceId,
            kabupatenId: formData.kabupatenId,
            kecamatanId: formData.kecamatanId,
            kelurahanId: formData.kelurahanId,
          }}
          onChange={handleTerritoryChange}
          errors={{
            provinceId: errors.provinceId,
            kabupatenId: errors.kabupatenId,
            kecamatanId: errors.kecamatanId,
            kelurahanId: errors.kelurahanId,
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* TPS */}
          <div>
            <label className="input-label">Nomor TPS</label>
            <input
              type="text"
              placeholder="Contoh: 001"
              value={formData.tps}
              onChange={(e) => setFormData((prev) => ({ ...prev, tps: e.target.value }))}
              className={`input-field ${errors.tps ? "error" : ""}`}
            />
            {errors.tps && <p className="input-error-msg">{errors.tps}</p>}
          </div>

          {/* Status Pemilih */}
          <div>
            <label className="input-label">Status Keaktifan</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              className="input-field"
            >
              <option value={VoterStatus.ACTIVE}>{VOTER_STATUS_LABELS[VoterStatus.ACTIVE]}</option>
              <option value={VoterStatus.INACTIVE}>{VOTER_STATUS_LABELS[VoterStatus.INACTIVE]}</option>
              <option value={VoterStatus.NEEDS_REVIEW}>{VOTER_STATUS_LABELS[VoterStatus.NEEDS_REVIEW]}</option>
              {isEdit && (
                <option value={VoterStatus.ARCHIVED}>{VOTER_STATUS_LABELS[VoterStatus.ARCHIVED]}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          className="btn btn-secondary"
        >
          Batal
        </button>
        <button type="submit" disabled={submitting} className="btn btn-primary min-w-[140px]">
          {submitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Daftarkan Pemilih"}
        </button>
      </div>
    </form>
  );
}
