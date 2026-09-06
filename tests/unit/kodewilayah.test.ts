/**
 * VoterScope Demo — Unit Tests: Indonesian Territory & Kode Wilayah Service
 *
 * Validates the 38 provinces standard, Kemendagri territory hierarchy,
 * in-memory caching mechanisms, and offline fallback snapshots for
 * Jawa Barat, Jawa Tengah, and Jawa Timur.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ALL_38_PROVINCES,
  ALL_514_REGENCIES,
  FALLBACK_REGENCIES,
  FALLBACK_DISTRICTS,
  FALLBACK_VILLAGES,
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
  getCacheStats,
  clearCache,
} from "@/lib/territory/kodewilayah";

describe("Indonesian Territory Service (API Kode Wilayah)", () => {
  beforeEach(() => {
    clearCache();
  });

  it("provides exactly 38 official Indonesian provinces", async () => {
    const provinces = await getProvinces();
    expect(provinces).toHaveLength(38);
    expect(ALL_38_PROVINCES).toHaveLength(38);
  });

  it("includes all 4 Papua new autonomous regions (DOB 2022)", async () => {
    const provinces = await getProvinces();
    const provinceNames = provinces.map((p) => p.name);

    expect(provinceNames).toContain("PAPUA SELATAN");
    expect(provinceNames).toContain("PAPUA TENGAH");
    expect(provinceNames).toContain("PAPUA PEGUNUNGAN");
    expect(provinceNames).toContain("PAPUA BARAT DAYA");
  });

  it("includes major economic and population centers", async () => {
    const provinces = await getProvinces();
    const codes = provinces.map((p) => p.code);

    expect(codes).toContain("31"); // DKI Jakarta
    expect(codes).toContain("32"); // Jawa Barat
    expect(codes).toContain("33"); // Jawa Tengah
    expect(codes).toContain("34"); // DI Yogyakarta
    expect(codes).toContain("35"); // Jawa Timur
    expect(codes).toContain("36"); // Banten
    expect(codes).toContain("51"); // Bali
    expect(codes).toContain("12"); // Sumatera Utara
  });

  it("retrieves regencies for Jawa Barat (code 32)", async () => {
    const regencies = await getRegencies("32");
    expect(regencies.length).toBeGreaterThan(0);

    const bogor = regencies.find((r) => r.id === "3201");
    expect(bogor).toBeDefined();
    expect(bogor?.name).toContain("BOGOR");
  });

  it("retrieves districts for Kabupaten Bogor (code 3201)", async () => {
    const districts = await getDistricts("3201");
    expect(districts.length).toBeGreaterThan(0);

    const cibinong = districts.find((d) => d.id === "3201210");
    expect(cibinong).toBeDefined();
    expect(cibinong?.name).toBe("CIBINONG");
  });

  it("retrieves villages for Kecamatan Cibinong (code 3201210)", async () => {
    const villages = await getVillages("3201210");
    expect(villages.length).toBeGreaterThan(0);

    const pakansari = villages.find((v) => v.id === "3201210005");
    expect(pakansari).toBeDefined();
    expect(pakansari?.name).toBe("PAKANSARI");
  });

  it("retrieves regencies and districts for Jawa Tengah (code 33)", async () => {
    const regencies = await getRegencies("33");
    expect(regencies.length).toBeGreaterThan(0);

    // Verify Kota Semarang exists
    const semarang = regencies.find((r) => r.id === "3374");
    expect(semarang).toBeDefined();
    expect(semarang?.name).toContain("SEMARANG");

    // Verify Surakarta (Solo) exists
    const solo = regencies.find((r) => r.id === "3372");
    expect(solo).toBeDefined();
    expect(solo?.name).toContain("SURAKARTA");

    // Retrieve districts for Kota Semarang (3374)
    const districts = await getDistricts("3374");
    expect(districts.length).toBeGreaterThan(0);
    const banyumanik = districts.find((d) => d.id === "3374030");
    expect(banyumanik).toBeDefined();

    // Retrieve villages for Banyumanik (3374030)
    const villages = await getVillages("3374030");
    expect(villages.length).toBeGreaterThan(0);
    const pudakpayung = villages.find((v) => v.name.includes("PUDAKPAYUNG"));
    expect(pudakpayung).toBeDefined();
  });

  it("retrieves regencies and districts for Jawa Timur (code 35)", async () => {
    const regencies = await getRegencies("35");
    expect(regencies.length).toBeGreaterThan(0);

    // Verify Kota Surabaya exists
    const surabaya = regencies.find((r) => r.id === "3578");
    expect(surabaya).toBeDefined();
    expect(surabaya?.name).toContain("SURABAYA");

    // Verify Kota Malang exists
    const malang = regencies.find((r) => r.id === "3573");
    expect(malang).toBeDefined();
    expect(malang?.name).toContain("MALANG");

    // Retrieve districts for Kota Surabaya (3578)
    const districts = await getDistricts("3578");
    expect(districts.length).toBeGreaterThan(0);
    const genteng = districts.find((d) => d.id === "3578120");
    expect(genteng).toBeDefined();

    // Retrieve villages for Genteng (3578120)
    const villages = await getVillages("3578120");
    expect(villages.length).toBeGreaterThan(0);
  });

  it("verifies offline fallback snapshot presence for Jawa Barat, Jawa Tengah, and Jawa Timur", () => {
    expect(FALLBACK_REGENCIES["32"]?.length).toBeGreaterThan(0);
    expect(FALLBACK_REGENCIES["33"]?.length).toBeGreaterThan(0);
    expect(FALLBACK_REGENCIES["35"]?.length).toBeGreaterThan(0);

    // Check districts in snapshot
    expect(FALLBACK_DISTRICTS["3201"]?.length).toBeGreaterThan(0); // Bogor
    expect(FALLBACK_DISTRICTS["3374"]?.length).toBeGreaterThan(0); // Semarang
    expect(FALLBACK_DISTRICTS["3578"]?.length).toBeGreaterThan(0); // Surabaya

    // Check villages in snapshot
    expect(FALLBACK_VILLAGES["3201210"]?.length).toBeGreaterThan(0); // Cibinong
    expect(FALLBACK_VILLAGES["3374030"]?.length).toBeGreaterThan(0); // Banyumanik
    expect(FALLBACK_VILLAGES["3578120"]?.length).toBeGreaterThan(0); // Genteng
  });

  it("populates in-memory cache and provides cache statistics", async () => {
    clearCache();
    let stats = getCacheStats();
    expect(stats.regenciesCount).toBe(0);

    // Call getRegencies for Jawa Tengah (33)
    await getRegencies("33");
    stats = getCacheStats();
    expect(stats.regenciesCount).toBe(1);
    expect(stats.cachedKeys.regencies).toContain("33");

    // Call getRegencies for Jawa Timur (35)
    await getRegencies("35");
    stats = getCacheStats();
    expect(stats.regenciesCount).toBe(2);
    expect(stats.cachedKeys.regencies).toContain("35");

    // Retrieve from cache directly
    const cachedJateng = await getRegencies("33");
    expect(cachedJateng.length).toBeGreaterThan(0);

    // Clear cache
    clearCache();
    expect(getCacheStats().regenciesCount).toBe(0);
  });

  it("safely handles unknown region codes without crashing", async () => {
    const nonExistentRegencies = await getRegencies("99999");
    expect(nonExistentRegencies).toEqual([]);

    const nonExistentDistricts = await getDistricts("9999999");
    expect(nonExistentDistricts).toEqual([]);

    const nonExistentVillages = await getVillages("9999999999");
    expect(nonExistentVillages).toEqual([]);
  });

  it("provides comprehensive coverage of all 514 regencies across all 38 provinces", async () => {
    const provinceCodes = ALL_38_PROVINCES.map((p) => p.code);
    expect(Object.keys(ALL_514_REGENCIES)).toHaveLength(38);

    let totalRegencies = 0;
    for (const code of provinceCodes) {
      const regList = await getRegencies(code);
      expect(regList.length).toBeGreaterThan(0);
      totalRegencies += regList.length;
    }
    expect(totalRegencies).toBe(514);
  });

  it("retrieves full regencies and auto-fallback districts for Bali (51) and Papua DOBs", async () => {
    const baliReg = await getRegencies("51");
    expect(baliReg).toHaveLength(9);
    expect(baliReg.map((r) => r.name)).toContain("KABUPATEN BADUNG");

    // Retrieve districts for Badung (5103)
    const badungDistricts = await getDistricts("5103");
    expect(badungDistricts.length).toBeGreaterThan(0);

    // Papua Barat Daya (92)
    const pbd = await getRegencies("92");
    expect(pbd).toHaveLength(6);
    expect(pbd.map((r) => r.name)).toContain("KOTA SORONG");

    // Papua Selatan (93)
    const ps = await getRegencies("93");
    expect(ps).toHaveLength(4);
    expect(ps.map((r) => r.name)).toContain("KABUPATEN MERAUKE");
  });
});
