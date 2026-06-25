import { HubShell } from "./HubShell";
import AdminFinanceLedger from "../AdminFinanceLedger";
import AdminRefunds from "../AdminRefunds";
import AdminPayouts from "../AdminPayouts";
import AdminTaxReport from "../AdminTaxReport";

export default function AdminFinanceHub() {
  return (
    <HubShell
      title="Finance"
      description="Revenue ledger, refunds, payouts and tax reports"
      tabs={[
        { value: "ledger", label: "Ledger", content: <AdminFinanceLedger /> },
        { value: "refunds", label: "Refunds", content: <AdminRefunds /> },
        { value: "payouts", label: "Payouts", content: <AdminPayouts /> },
        { value: "tax", label: "Tax Report", content: <AdminTaxReport /> },
      ]}
    />
  );
}