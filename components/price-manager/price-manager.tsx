"use client";

import { CloseIcon } from "@/components/ui/icons";
import { usePriceManager } from "@/hooks/use-price-manager";
import { HeroSection } from "./hero-section";
import { ManagementTools } from "./management-tools";
import { ProductTable } from "./product-table";
import { QuotePrintDocument } from "./quote-print-document";
import { QuoteSheet } from "./quote-sheet";

export function PriceManager() {
  const manager = usePriceManager();
  const disabled = manager.status !== "ready";

  function showResults() {
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <main className="mx-auto w-[1110px] pt-[14px] pb-8 print:hidden" aria-busy={manager.status === "loading"}>
        <HeroSection settings={manager.settings} disabled={disabled} onChange={manager.updateSettings} onBuildList={showResults} />

        {manager.message && (
          <div role="status" className="mt-6 flex items-center justify-between gap-5 rounded-2xl border border-amber-300 bg-amber-50 px-6 py-4 text-sm leading-7 text-amber-900">
            <p>{manager.message}</p>
            <button type="button" aria-label="بستن پیام" onClick={() => manager.setMessage("")} className="shrink-0 cursor-pointer rounded-full p-1 outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <CloseIcon className="size-5" />
            </button>
          </div>
        )}

        <QuoteSheet settings={manager.settings} quote={manager.quote} disabled={disabled} isPrinting={manager.isPrinting} onPrint={manager.printQuote}>
          <ProductTable
            rows={manager.visibleRows}
            disabled={disabled}
            onPriceChange={manager.updatePrice}
            onQuantityChange={manager.updateQuantity}
            onBrandChange={manager.updateBrand}
            onToggle={manager.toggleProduct}
          />
        </QuoteSheet>

        <ManagementTools
          settings={manager.settings}
          disabled={disabled}
          query={manager.query}
          databasePath={manager.databasePath}
          onQueryChange={manager.setQuery}
          onSettingsChange={manager.updateSettings}
          onPriceChange={manager.updatePrice}
          onExportBackup={manager.exportBackup}
          onImportBackup={manager.restoreBackup}
        />
      </main>
      <QuotePrintDocument settings={manager.settings} quote={manager.quote} today={manager.today} />
    </>
  );
}