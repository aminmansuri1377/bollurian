import { getPriceKey, isBrandSelectable, resolveBrand } from "./brand-rules";
import { CLIENT_PRODUCTS } from "./client-products";
import { OMITTED_PRODUCT_ID } from "./constants";
import { getMasterPrice, getPreviousPrice } from "./master-price";
import { isRecord } from "./settings";
import type { Product, QuoteSettings } from "./types";

const PRICE_TRANSFER_FORMAT = "bollourian-master-prices";
const PRICE_TRANSFER_VERSION = 1;

export interface ImportedMasterPrices {
  prices: Record<string, number>;
  previousPrices: Record<string, number>;
  createdAt: string;
}

interface PriceEntry {
  product: Product;
  brand: string;
  key: string;
}

function masterPriceEntries(): PriceEntry[] {
  return CLIENT_PRODUCTS
    .filter((product) => product.id !== OMITTED_PRODUCT_ID)
    .flatMap((product) => {
      const brands = isBrandSelectable(product)
        ? product.brands
        : [resolveBrand(product, undefined)];
      return brands.map((brand) => ({
        product,
        brand,
        key: getPriceKey(product, brand),
      }));
    });
}

function readPriceMap(value: unknown, fieldName: string): Record<string, number> {
  if (!isRecord(value)) throw new Error(`فیلد ${fieldName} در فایل قیمت معتبر نیست.`);
  const result: Record<string, number> = {};
  for (const [key, price] of Object.entries(value)) {
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
      throw new Error(`قیمت نامعتبر برای ${key} در فایل پیدا شد.`);
    }
    result[key] = price;
  }
  return result;
}

function assertCompatiblePriceKeys(prices: Record<string, number>): void {
  const expected = masterPriceEntries().map((entry) => entry.key).sort();
  const received = Object.keys(prices).sort();
  if (expected.length !== received.length || expected.some((key, index) => key !== received[index])) {
    throw new Error("این فایل قیمت با نسخه فعلی لیست محصولات سازگار نیست. از برنامه‌ای با همین نسخه خروجی بگیرید.");
  }
}

export function createMasterPriceExport(settings: QuoteSettings) {
  const prices: Record<string, number> = {};
  const previousPrices: Record<string, number> = {};

  for (const { product, brand, key } of masterPriceEntries()) {
    const price = getMasterPrice(product, settings, brand);
    if (price === null) throw new Error(`قیمت «${product.name}» کامل نیست و خروجی ساخته نشد.`);
    prices[key] = price;

    const previous = getPreviousPrice(product, settings, brand);
    if (previous !== null) previousPrices[key] = previous;
  }

  return {
    format: PRICE_TRANSFER_FORMAT,
    version: PRICE_TRANSFER_VERSION,
    createdAt: new Date().toISOString(),
    itemCount: Object.keys(prices).length,
    prices,
    previousPrices,
  };
}

export function downloadMasterPrices(settings: QuoteSettings): number {
  const payload = createMasterPriceExport(settings);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  const persianDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).replace(/\//g, "-");
  anchor.download = `لیست قیمت آپدیت بلوریان - ${persianDate} -.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return payload.itemCount;
}

export async function readMasterPriceFile(file: File): Promise<ImportedMasterPrices> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error("فایل انتخاب‌شده JSON معتبر نیست.");
  }

  if (!isRecord(raw) || raw.format !== PRICE_TRANSFER_FORMAT || Number(raw.version) !== PRICE_TRANSFER_VERSION) {
    throw new Error("این فایل، خروجی قیمت معتبر بلوریان نیست.");
  }

  const prices = readPriceMap(raw.prices, "prices");
  const previousPrices = readPriceMap(raw.previousPrices ?? {}, "previousPrices");
  assertCompatiblePriceKeys(prices);

  const allowedKeys = new Set(Object.keys(prices));
  if (Object.keys(previousPrices).some((key) => !allowedKeys.has(key))) {
    throw new Error("فایل قیمت شامل کلید قیمت قبلی ناشناخته است.");
  }

  return {
    prices,
    previousPrices,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
  };
}
