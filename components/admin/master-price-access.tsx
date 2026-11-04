"use client";

import { Dialog } from "@/components/ui/dialog";
import { MasterPricesDialog } from "@/components/price-manager/master-prices-dialog";
import { useMasterPriceAccess } from "@/hooks/use-master-price-access";
import type { AdminAction } from "@/hooks/use-master-price-access";
import type { QuoteSettings } from "@/lib/price-manager/types";
import { AdminPasswordDialog } from "./admin-password-dialog";

interface MasterPriceAccessProps {
  action: AdminAction;
  settings: QuoteSettings;
  onClose: () => void;
  onResetDemo: () => void;
  onPriceChange: (key: string, value: number | null) => void;
  onPreviousPriceChange: (key: string, value: number | null) => void;
}

/** No master-price table is mounted before successful authentication. */
export function MasterPriceAccess(props: MasterPriceAccessProps) {
  const access = useMasterPriceAccess(props);
  if (access.phase === "password") {
    return <AdminPasswordDialog busy={access.busy} error={access.error} onSubmit={access.authenticate} onClose={access.requestClose} />;
  }
  if (access.phase === "prices") {
    return <MasterPricesDialog open settings={props.settings} onClose={access.requestClose} onPriceChange={props.onPriceChange} onPreviousPriceChange={props.onPreviousPriceChange} />;
  }
  return (
    <Dialog open title="پایان مدیریت" size="compact" onClose={access.requestClose}>
      {access.phase === "close-error" ? (
        <>
          <p role="alert" className="text-sm leading-7 text-red-700">{access.error}</p>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={access.retryClose} className="cursor-pointer rounded-full bg-brand px-5 py-3 text-sm text-white">تلاش دوباره</button>
            <button type="button" onClick={access.returnToPrices} className="cursor-pointer rounded-full border border-outline px-5 py-3 text-sm">بازگشت به قیمت‌ها</button>
          </div>
        </>
      ) : <p role="status" className="text-sm leading-7">در حال ذخیره تغییرات و قفل‌کردن مدیریت…</p>}
    </Dialog>
  );
}
