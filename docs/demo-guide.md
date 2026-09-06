# VoterScope Demo — Evaluator & Demo Guide

> **⚠️ DEMO NOTICE & DATA INTEGRITY STATEMENT:**
> This application is an educational and portfolio demonstration system. All voter records, NIK numbers, and addresses are **100% synthetically generated**. The system strictly contains no political persuasion, voter profiling, or campaign-targeting mechanisms.

---

## 1. Quick Start Guide

To run the application locally on your machine:

```bash
# 1. Enter the project directory
cd voterscope-demo

# 2. Install dependencies (if not already done)
npm install

# 3. Initialize SQLite database & seed synthetic data
npm run db:reset

# 4. Start the development server
npm run dev
```

Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**.
You will be greeted with the VoterScope Demo login screen.

---

## 2. Preconfigured Demo Accounts

Six demo personas with distinct administrative scopes and privileges are preconfigured in the database. You can click on the quick-fill buttons on the login page or enter credentials manually:

| Username | Password | Role | Administrative Scope | Typical Responsibilities |
|---|---|---|---|---|
| `superadmin` | `Demo@12345` | `SUPER_ADMIN` | Nasional (Seluruh Indonesia) | System administration, all user accounts, national analytics |
| `province_admin` | `Demo@12345` | `PROVINCE_ADMIN` | Demo Provinsi | Provincial monitoring, Kabupaten admin management |
| `kabupaten_admin` | `Demo@12345` | `KABUPATEN_ADMIN` | Demo Kabupaten Alpha | District monitoring, Kecamatan admin management |
| `kecamatan_admin` | `Demo@12345` | `KECAMATAN_ADMIN` | Demo Kecamatan 1 | Sub-district coordination, Kelurahan operator management |
| `kelurahan_operator`| `Demo@12345` | `KELURAHAN_OPERATOR` | Demo Kelurahan A | Local voter registration, address verification |
| `auditor` | `Demo@12345` | `AUDITOR` | Nasional (Read-Only) | Compliance monitoring, audit log inspection, data exports |

---

## 3. Recommended Evaluation Scenarios

### Scenario A: Super Admin Overview & National Analytics
1. **Login**: Click **"Super Admin"** on the login page and click **"Masuk ke Sistem"**.
2. **Dashboard Review**:
   - View national demographic KPIs: Total Voters (100), Active (90%), Verification Rate.
   - Inspect Recharts visualizations: Gender distribution donut, Age cohorts bar chart (`17-25`, `26-35`, `36-50`, `51+`), Regional breakdown by Regency.
   - Check the **Aktivitas Audit Terbaru** stream at the bottom of the dashboard.
3. **Data Pemilih**: Click **"Data Pemilih"** in the sidebar.
   - Notice that NIKs are masked by default (`3201************`).
   - Use the search bar to type a name (e.g. `Budi` or `Siti`) and observe debounced real-time filtering.
   - Filter by status (`Aktif`, `Non-Aktif`, `Meninggal`, `Pindah Domisili`).
4. **NIK Unmasking**:
   - Click the "Eye" (Lihat) icon on any voter row to open the detailed dossier.
   - Click **"Buka Masking NIK"**.
   - Note the security confirmation dialog. Once confirmed, the full synthetic NIK is decrypted via AES-256-GCM and displayed.
   - Check that an immutable audit log entry (`NIK_UNMASK`) is immediately dispatched.

---

### Scenario B: Operator Scope & Anti-IDOR Boundaries
1. **Logout & Login as Operator**:
   - Click **"Keluar"** from the sidebar.
   - Click **"Operator Kelurahan"** (`kelurahan_operator`) and sign in.
2. **Verify Scoped Dashboard**:
   - Observe that the dashboard stats now reflect **only** voters residing in **Demo Kelurahan A** (local counts, not national numbers).
3. **Verify Boundary Restrictions (Anti-IDOR)**:
   - Notice that **"Manajemen User"** and **"Audit Log"** are completely hidden from the sidebar navigation.
   - Attempting to directly browse to `http://localhost:3000/dashboard/users` or `http://localhost:3000/dashboard/audit` displays a security card explaining the role limitation (`Akses Terbatas`).
4. **Voter Registration with Synthetic Generator**:
   - Click **"Pendaftaran Baru"**.
   - In the registration form, the territory selector is automatically locked to Demo Kelurahan A.
   - Click **"⚡ Generate Data Sintetis"** to automatically populate a valid synthetic Indonesian voter (realistic synthetic name, 16-digit valid format NIK, address, RT/RW).
   - Click **"Simpan Pemilih"**. The record is validated server-side by Zod, the NIK is encrypted with AES-256-GCM, and an HMAC blind index is generated.

---

### Scenario C: Auditor Compliance & Data Export
1. **Logout & Login as Auditor**:
   - Sign in as `auditor`.
2. **Audit Log Inspection**:
   - Click **"Audit Log"** in the sidebar.
   - Filter logs by Action (`USER_LOGIN`, `VOTER_CREATE`, `NIK_UNMASK`, `USER_UPDATE`).
   - Click **"Inspeksi"** on any log row to inspect the full JSON metadata payload (including actor IP, user agent, timestamps, and modified fields).
3. **Compliance Export**:
   - Click **"Export CSV"** or **"Export JSON"** in the upper right.
   - The browser downloads a formatted audit report for regulatory compliance review.
4. **Read-Only Verification**:
   - Go to **"Data Pemilih"**. Notice that the "Tambah Pemilih", "Edit", and "Arsipkan" buttons are disabled or hidden, maintaining read-only compliance posture.

---

### Scenario D: User Management & Role Escalation Defense
1. **Login as Super Admin**:
   - Navigate to **"Manajemen User"** (`/dashboard/users`).
   - View the active administrators and operators across all tiers.
2. **Subordinate Role Delegation**:
   - Click **"+ Tambah Pengguna Baru"**.
   - Note that Super Admin can create any subordinate role.
3. **Role Escalation Prevention**:
   - Log out and log in as `kecamatan_admin` (Kecamatan Admin).
   - Go to **"Manajemen User"**.
   - Click **"+ Tambah Pengguna Baru"**. Notice that the role dropdown is restricted **strictly to Kelurahan Operator**. A Kecamatan Admin is prevented by both client UI and server-side RBAC from creating accounts equal to or higher than their own rank.
4. **Self-Deactivation Guard**:
   - Attempting to toggle off the active switch for one's own account is rejected with an error ("Anda tidak dapat menonaktifkan akun Anda sendiri").

---

### Scenario E: Profile Settings & OWASP Password Security
1. **Open Profile**:
   - Click on your avatar/username pill in the top bar or click **"Profil & Akun"** in the sidebar.
2. **Self-Service Updates**:
   - Edit your full name or email and click **"Simpan Perubahan"**.
3. **Argon2id Password Change**:
   - In the **"Ubah Kata Sandi"** form, test entering a weak password.
   - Observe the live security checklist updating:
     * Min. 8 karakter
     * Huruf besar (A-Z)
     * Huruf kecil (a-z)
     * Angka (0-9)
     * Karakter khusus (@$!%*?&#)
   - Verify that entering an incorrect current password yields a clear server error and is logged as a failed attempt in the audit trail.
   - Review the **Status Keamanan & Arsitektur Sesi** card at the bottom detailing Argon2id, iron-session 8h TTL, and AES-256 protections.

---

## 4. Resetting the Demo Data

If at any point during testing you wish to reset all synthetic voter records, users, and audit logs to their pristine factory state:

```bash
npm run db:reset
```

This will run Prisma migrations and re-seed the 6 demo accounts, territory hierarchies, and 100 synthetic voter profiles.
