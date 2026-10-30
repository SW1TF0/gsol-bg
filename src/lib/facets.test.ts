import { test } from "node:test";
import assert from "node:assert/strict";
import { compareFacetValues, extractFacets, type FacetSource } from "./facets.ts";

const product = (over: Partial<FacetSource>): FacetSource => ({
  name: "Продукт",
  category: "laptopi",
  stockStatus: "in_stock",
  specs: [],
  components: null,
  ...over,
});

test("машина GSOL: процесор, видеокарта, памет и диск от частите", () => {
  const f = extractFacets(
    product({
      category: "kompyutri",
      components: { cpu: "Ryzen 5 5600G", gpu: "", ram: "Fury Beast 16GB (2x8) DDR4-3200", storage: "NV3 500GB NVMe", case: "x" },
    }),
  );
  assert.equal(f.cpu, "AMD Ryzen 5");
  assert.equal(f.gpu, "Вградена графика");
  assert.equal(f.ram, "16 GB");
  assert.equal(f.storage, "500 GB");
  assert.equal(f.stock, "В наличност");
});

test("машина с видеокарта и Intel Core Ultra", () => {
  const f = extractFacets(
    product({ category: "kompyutri", components: { cpu: "Core Ultra 5 245KF", gpu: "GeForce RTX 5060 Ti 8GB", case: "x", storage: "2TB NVMe" } }),
  );
  assert.equal(f.cpu, "Intel Core Ultra 5");
  assert.equal(f.gpu, "NVIDIA RTX 5060 Ti");
  assert.equal(f.storage, "2 TB");
});

test("лаптоп от спецификацията на доставчика", () => {
  const f = extractFacets(
    product({
      specs: [
        { k: "CPU model", v: "Intel® Core™ 3 Processor N350, Up to 3.9 GHz" },
        { k: "Memory size", v: "8 GB" },
        { k: "SSD", v: "512GB PCIe NVMe" },
        { k: "Screen size", v: '15.6"' },
        { k: "Screen resolution", v: "1920 x 1080 Full HD" },
        { k: "Screen type", v: "IPS, anti-glare" },
        { k: "Graphics", v: "Intel UHD Graphics" },
        { k: "OS", v: "No OS" },
      ],
    }),
  );
  assert.equal(f.cpu, "Intel Core 3");
  assert.equal(f.ram, "8 GB");
  assert.equal(f.storage, "512 GB");
  assert.equal(f.screen, '15,6"');
  assert.equal(f.res, "Full HD");
  assert.equal(f.panel, "IPS");
  assert.equal(f.gpu, "Вградена графика");
  assert.equal(f.os, "Без ОС");
});

test("монитор и видеокарта", () => {
  const m = extractFacets(
    product({
      category: "periferiya",
      specs: [
        { k: "Големина на екрана (инч)", v: "27" },
        { k: "Refresh rate", v: "180Hz" },
        { k: "Тип на панела(матрицата)", v: "Fast IPS" },
        { k: "Screen resolution", v: "2560x1440" },
      ],
    }),
  );
  assert.equal(m.screen, '27"');
  assert.equal(m.refresh, "180 Hz");
  assert.equal(m.res, "QHD");
  const g = extractFacets(product({ category: "komponenti/videokarti", name: "GB RTX5070TI EAGLE OC SFF 16G", specs: [{ k: "Memmory size", v: "16GB" }] }));
  assert.equal(g.gpu, "NVIDIA RTX 5070 Ti");
  assert.equal(g.vram, "16 GB");
});

test("нечетимото не става стойност; подреждане по число", () => {
  assert.deepEqual(extractFacets(product({ stockStatus: "out_of_stock", specs: [{ k: "OS", v: "" }] })), {});
  assert.deepEqual(["32 GB", "8 GB", "16 GB"].sort(compareFacetValues), ["8 GB", "16 GB", "32 GB"]);
  assert.deepEqual(["1 TB", "500 GB"].sort(compareFacetValues), ["500 GB", "1 TB"]);
});
