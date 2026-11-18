"use client";

import { CloseIcon } from "@/components/ui/icons";
import { usePriceManager } from "@/hooks/use-price-manager";
import { useListFontPreference } from "@/hooks/use-list-font-preference";
import { HeroSection } from "./hero-section";
import { ManagementTools } from "./management-tools";
import { ProductTable } from "./product-table";
import { QuotePreview } from "./quote-preview";
import { QuotePrintDocument } from "./quote-print-document";
import { QuoteSheet } from "./quote-sheet";

export function PriceManager() {
  const manager = usePriceManager();
  const { listBold, toggleListBold } = useListFontPreference();
  const disabled = manager.status !== "ready";

  function showResults() {
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <main className="mx-auto w-[1110px] pt-[14px] pb-8 print:hidden" aria-busy={manager.status === "loading"}>
        <ManagementTools
          settings={manager.settings}
          disabled={disabled}
          databasePath={manager.databasePath}
          onSettingsChange={manager.updateSettings}
          onPriceChange={manager.updatePrice}
          onPreviousPriceChange={manager.updatePreviousPrice}
          onResetDemo={manager.resetDemo}
          listBold={listBold}
          onToggleListBold={toggleListBold}
        />

        <HeroSection settings={manager.settings} disabled={disabled} onChange={manager.updateSettings} onBuildList={showResults} />

        {manager.message && (
          <div role="status" className="mt-6 flex items-center justify-between gap-5 rounded-2xl border border-amber-300 bg-amber-50 px-6 py-4 text-sm leading-7 text-amber-900">
            <p>{manager.message}</p>
            <button type="button" aria-label="بستن پیام" onClick={() => manager.setMessage("")} className="shrink-0 cursor-pointer rounded-full p-1 outline-none focus-visible:ring-2 focus-visible:ring-brand">
              <CloseIcon className="size-5" />
            </button>
          </div>
        )}

        <QuoteSheet settings={manager.settings} quote={manager.quote} disabled={disabled} isPrinting={manager.isPrinting} onPrint={manager.openPreview}>
          <ProductTable
            rows={manager.quote.rows}
            settings={manager.settings}
            railTypes={manager.settings.railTypes}
            disabled={disabled}
            boldText={listBold}
            onRailTypeChange={manager.updateRailType}
            onBrandChange={manager.updateBrand}
            onToggle={manager.toggleProduct}
          />
        </QuoteSheet>
      </main>
      <QuotePrintDocument settings={manager.settings} quote={manager.quote} today={manager.today} boldText={listBold} />
      {manager.previewOpen && (
        <QuotePreview
          settings={manager.settings}
          quote={manager.quote}
          today={manager.today}
          boldText={listBold}
          isPrinting={manager.isPrinting}
          onPrint={manager.printQuote}
          onClose={manager.closePreview}
        />
      )}
    </>
  );
}