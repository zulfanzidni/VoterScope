"use client";

/**
 * VoterScope Demo — UsersClient Component
 *
 * Hierarchical user management interface.
 * - Enforces role escalation limits on creation.
 * - Disables self-deactivation.
 * - Dynamic territory scope assignment.
 *
 * ALL USER ACCOUNTS ARE LOCAL SYNTHETIC DEMO CREDENTIALS.
 */

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { TerritorySelect, type TerritoryValue, type TerritoryMaxLevel } from "@/components/voters/TerritorySelect";
import type { SessionUser } from "@/lib/types";
import { UserRole } from "@/lib/types";
import { normalizeUserTerritoryByRole } from "@/lib/authorization";

export type UserItem = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  provinceId?: string | null;
  kabupatenId?: string | null;
  kecamatanId?: string | null;
  kelurahanId?: string | null;
  province?: { name: string } | null;
  kabupaten?: { name: string } | null;
  kecamatan?: { name: string } | null;
  kelurahan?: { name: string } | null;
};

type Props = {
  currentUser: SessionUser;
};

type CreateUserData = {
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
  provinceId: string;
  kabupatenId: string;
  kecamatanId: string;
  kelurahanId: string;
};

export function UsersClient({ currentUser }: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);

  // Form states
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [createData, setCreateData] = useState<CreateUserData>({
    username: "",
    email: "",
    fullName: "",
    password: "Demo@12345",
    role: UserRole.KELURAHAN_OPERATOR,
    provinceId: currentUser.provinceId ?? "",
    kabupatenId: currentUser.kabupatenId ?? "",
    kecamatanId: currentUser.kecamatanId ?? "",
    kelurahanId: currentUser.kelurahanId ?? "",
  });

  const [editData, setEditData] = useState({
    fullName: "",
    email: "",
    password: "",
    isActive: true,
  });

  // Calculate assignable roles based on current user's role
  const getAssignableRoles = () => {
    switch (currentUser.role) {
      case UserRole.SUPER_ADMIN:
        return [
          UserRole.SUPER_ADMIN,
          UserRole.PROVINCE_ADMIN,
          UserRole.KABUPATEN_ADMIN,
          UserRole.KECAMATAN_ADMIN,
          UserRole.KELURAHAN_OPERATOR,
          UserRole.AUDITOR,
        ];
      case UserRole.PROVINCE_ADMIN:
        return [
          UserRole.KABUPATEN_ADMIN,
          UserRole.KECAMATAN_ADMIN,
          UserRole.KELURAHAN_OPERATOR,
        ];
      case UserRole.KABUPATEN_ADMIN:
        return [
          UserRole.KECAMATAN_ADMIN,
          UserRole.KELURAHAN_OPERATOR,
        ];
      case UserRole.KECAMATAN_ADMIN:
        return [UserRole.KELURAHAN_OPERATOR];
      default:
        return [];
    }
  };

  const assignableRoles = getAssignableRoles();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const getRoleMaxLevel = (role: UserRole): TerritoryMaxLevel | null => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
      case UserRole.AUDITOR:
        return null;
      case UserRole.PROVINCE_ADMIN:
        return "PROVINCE";
      case UserRole.KABUPATEN_ADMIN:
        return "KABUPATEN";
      case UserRole.KECAMATAN_ADMIN:
        return "KECAMATAN";
      case UserRole.KELURAHAN_OPERATOR:
      default:
        return "KELURAHAN";
    }
  };

  const territoryMaxLevel = getRoleMaxLevel(createData.role);

  const handleRoleChange = (newRole: UserRole) => {
    setCreateData((prev) => {
      const normalized = normalizeUserTerritoryByRole(newRole, prev);
      return {
        ...prev,
        role: newRole,
        provinceId: normalized.provinceId ?? "",
        kabupatenId: normalized.kabupatenId ?? "",
        kecamatanId: normalized.kecamatanId ?? "",
        kelurahanId: normalized.kelurahanId ?? "",
      };
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const normalized = normalizeUserTerritoryByRole(createData.role, createData);
      const payload = {
        ...createData,
        provinceId: normalized.provinceId,
        kabupatenId: normalized.kabupatenId,
        kecamatanId: normalized.kecamatanId,
        kelurahanId: normalized.kelurahanId,
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error?.message ?? "Gagal mendaftarkan pengguna baru.");
      } else {
        setShowCreateModal(false);
        const nextRole = assignableRoles[0] ?? UserRole.KELURAHAN_OPERATOR;
        const initNorm = normalizeUserTerritoryByRole(nextRole, {
          provinceId: currentUser.provinceId,
          kabupatenId: currentUser.kabupatenId,
          kecamatanId: currentUser.kecamatanId,
          kelurahanId: currentUser.kelurahanId,
        });
        setCreateData({
          username: "",
          email: "",
          fullName: "",
          password: "Demo@12345",
          role: nextRole,
          provinceId: initNorm.provinceId ?? "",
          kabupatenId: initNorm.kabupatenId ?? "",
          kecamatanId: initNorm.kecamatanId ?? "",
          kelurahanId: initNorm.kelurahanId ?? "",
        });
        fetchUsers();
      }
    } catch (err) {
      console.error("Failed to create user:", err);
      setFormError("Terjadi kesalahan sistem saat mendaftarkan akun.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload: Record<string, unknown> = {
        fullName: editData.fullName,
        email: editData.email,
        isActive: editData.isActive,
      };
      if (editData.password.trim()) {
        payload.password = editData.password.trim();
      }

      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error?.message ?? "Gagal memperbarui data pengguna.");
      } else {
        setEditUser(null);
        fetchUsers();
      }
    } catch {
      setFormError("Terjadi gangguan jaringan.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    if (user.id === currentUser.id) return;
    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <span className="badge badge-violet">Super Admin</span>;
      case "PROVINCE_ADMIN":
        return <span className="badge badge-blue">Admin Provinsi</span>;
      case "KABUPATEN_ADMIN":
        return <span className="badge badge-blue">Admin Kabupaten</span>;
      case "KECAMATAN_ADMIN":
        return <span className="badge badge-emerald">Admin Kecamatan</span>;
      case "KELURAHAN_OPERATOR":
        return <span className="badge badge-emerald">Operator Kelurahan</span>;
      case "AUDITOR":
        return <span className="badge badge-amber">Auditor</span>;
      default:
        return <span className="badge badge-slate">{role}</span>;
    }
  };

  // KPI calculations
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const operatorCount = users.filter((u) => u.role === "KELURAHAN_OPERATOR").length;
  const adminCount = users.filter((u) => u.role.includes("ADMIN")).length;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Manajemen Pengguna</h1>
          <p className="text-xs text-secondary mt-1">
            Pengelolaan akun administrator dan operator wilayah berbasis batas kewenangan hierarkis.
          </p>
        </div>

        {assignableRoles.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowCreateModal(true);
            }}
            className="btn btn-primary btn-sm self-start sm:self-auto"
          >
            + Tambah Pengguna Baru
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-secondary uppercase tracking-wider block">Total Pengguna</span>
            <div className="text-2xl font-semibold text-primary mt-1 font-mono tabular-nums">{totalCount} Akun</div>
          </div>
          <span className="w-8 h-8 rounded border border-blue-500/20 bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-secondary uppercase tracking-wider block">Akun Aktif</span>
            <div className="text-2xl font-semibold text-emerald-400 mt-1 font-mono tabular-nums">{activeCount} Akun</div>
          </div>
          <span className="w-8 h-8 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-secondary uppercase tracking-wider block">Admin Wilayah</span>
            <div className="text-2xl font-semibold text-blue-400 mt-1 font-mono tabular-nums">{adminCount} Orang</div>
          </div>
          <span className="w-8 h-8 rounded border border-border-subtle bg-surface-elevated text-secondary flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </span>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-secondary uppercase tracking-wider block">Operator Kelurahan</span>
            <div className="text-2xl font-semibold text-primary mt-1 font-mono tabular-nums">{operatorCount} Orang</div>
          </div>
          <span className="w-8 h-8 rounded border border-border-subtle bg-surface-elevated text-secondary flex items-center justify-center">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder="Cari username, nama lengkap, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field max-w-sm text-xs"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field text-xs w-full sm:w-[170px]"
          >
            <option value="">Semua Peran</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="PROVINCE_ADMIN">Admin Provinsi</option>
            <option value="KABUPATEN_ADMIN">Admin Kabupaten</option>
            <option value="KECAMATAN_ADMIN">Admin Kecamatan</option>
            <option value="KELURAHAN_OPERATOR">Operator Kelurahan</option>
            <option value="AUDITOR">Auditor</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field text-xs w-full sm:w-[130px]"
          >
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>

          {(search || roleFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setRoleFilter("");
                setStatusFilter("");
              }}
              className="btn btn-ghost btn-sm text-xs text-muted hover:text-primary"
            >
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-default bg-[var(--bg-elevated)]/60 text-secondary">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Pengguna</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Peran (RBAC)</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Cakupan Wilayah</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Dibuat</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-32" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-24" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-28" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-16" /></td>
                    <td className="py-3 px-4"><div className="h-4 bg-border-default rounded w-20" /></td>
                    <td className="py-3 px-4 text-right"><div className="h-4 bg-border-default rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    Tidak ada akun pengguna yang sesuai dengan filter atau cakupan wilayah Anda.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === currentUser.id;
                  const territoryLabel = user.kelurahan?.name
                    ? `${user.kelurahan.name}, ${user.kecamatan?.name ?? ""}`
                    : user.kecamatan?.name
                    ? `${user.kecamatan.name}, ${user.kabupaten?.name ?? ""}`
                    : user.kabupaten?.name
                    ? `${user.kabupaten.name}`
                    : user.province?.name
                    ? `${user.province.name}`
                    : "Nasional (Penuh)";

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* User identity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-400 font-bold flex items-center justify-center text-xs shrink-0">
                            {user.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-primary flex items-center gap-1.5">
                              <span>{user.fullName}</span>
                              {isSelf && (
                                <span className="badge badge-violet text-[9px]">Anda</span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted font-mono">
                              @{user.username} · {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>

                      {/* Territory */}
                      <td className="py-3 px-4 text-secondary text-[11px]">
                        {territoryLabel}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {user.isActive ? (
                          <span className="badge badge-emerald">Aktif</span>
                        ) : (
                          <span className="badge badge-rose">Nonaktif</span>
                        )}
                      </td>

                      {/* CreatedAt */}
                      <td className="py-3 px-4 text-muted whitespace-nowrap font-mono text-[11px]">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setFormError(null);
                              setEditUser(user);
                              setEditData({
                                fullName: user.fullName,
                                email: user.email,
                                password: "",
                                isActive: user.isActive,
                              });
                            }}
                            className="btn btn-secondary btn-sm !py-1 !px-2.5 text-[11px]"
                          >
                            Edit
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`btn btn-ghost btn-sm !py-1 !px-2 text-[11px] ${
                                user.isActive
                                  ? "text-status-error hover:bg-status-error/10"
                                  : "text-accent-emerald hover:bg-accent-emerald/10"
                              }`}
                            >
                              {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="card-elevated max-w-lg w-full p-6 space-y-4 border border-border-strong animate-in fade-in my-8">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-semibold text-primary text-base">Pendaftaran Akun Pengguna Baru</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted hover:text-primary transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="alert alert-error text-xs">
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: operator_desa"
                    value={createData.username}
                    onChange={(e) =>
                      setCreateData((prev) => ({ ...prev, username: e.target.value.toLowerCase().trim() }))
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Alamat Email</label>
                  <input
                    type="email"
                    required
                    placeholder="Contoh: user@demo.local"
                    value={createData.email}
                    onChange={(e) => setCreateData((prev) => ({ ...prev, email: e.target.value.trim() }))}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rahmat Hidayat"
                  value={createData.fullName}
                  onChange={(e) => setCreateData((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Peran (Sesuai Batas Wewenang)</label>
                  <select
                    value={createData.role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="input-field"
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">Kata Sandi (Argon2id Hash)</label>
                  <input
                    type="text"
                    required
                    placeholder="Minimal 8 karakter"
                    value={createData.password}
                    onChange={(e) => setCreateData((prev) => ({ ...prev, password: e.target.value }))}
                    className="input-field font-mono"
                  />
                </div>
              </div>

              {/* Territory scope picker based on role */}
              {territoryMaxLevel ? (
                <div className="space-y-2 pt-2 border-t border-border-subtle">
                  <div className="flex items-center justify-between">
                    <label className="input-label !mb-0">Penempatan Wilayah Penugasan</label>
                    <span className="text-[10px] text-brand-blue font-medium bg-brand-blue/10 px-2 py-0.5 rounded">
                      Tingkat: {territoryMaxLevel}
                    </span>
                  </div>
                  <TerritorySelect
                    user={currentUser}
                    maxLevel={territoryMaxLevel}
                    value={{
                      provinceId: createData.provinceId,
                      kabupatenId: createData.kabupatenId,
                      kecamatanId: createData.kecamatanId,
                      kelurahanId: createData.kelurahanId,
                    }}
                    onChange={(territory: TerritoryValue) =>
                      setCreateData((prev) => ({ ...prev, ...territory }))
                    }
                  />
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-surface-raised border border-subtle text-xs text-secondary flex items-center gap-2">
                  <span className="text-emerald-400">🌐</span>
                  <span>
                    Peran <strong>{createData.role}</strong> memiliki cakupan wewenang <strong>Nasional</strong> (tanpa pembatasan wilayah).
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={formSubmitting}
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button type="submit" disabled={formSubmitting} className="btn btn-primary btn-sm">
                  {formSubmitting ? "Menyimpan..." : "Daftarkan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="card-elevated max-w-md w-full p-6 space-y-4 border border-border-strong animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-semibold text-primary text-base">
                Edit Pengguna: @{editUser.username}
              </h3>
              <button
                onClick={() => setEditUser(null)}
                className="text-muted hover:text-primary transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="alert alert-error text-xs">
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="input-label">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editData.fullName}
                  onChange={(e) => setEditData((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={editData.email}
                  onChange={(e) => setEditData((prev) => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Reset Kata Sandi (Opsional)</label>
                <input
                  type="password"
                  placeholder="Kosongkan jika tidak ingin mengubah"
                  value={editData.password}
                  onChange={(e) => setEditData((prev) => ({ ...prev, password: e.target.value }))}
                  className="input-field"
                />
              </div>

              {editUser.id !== currentUser.id && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={editData.isActive}
                    onChange={(e) => setEditData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-border-default bg-base"
                  />
                  <label htmlFor="isActiveToggle" className="text-secondary font-medium cursor-pointer">
                    Akun Aktif (Dapat Melakukan Login)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  disabled={formSubmitting}
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button type="submit" disabled={formSubmitting} className="btn btn-primary btn-sm">
                  {formSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
