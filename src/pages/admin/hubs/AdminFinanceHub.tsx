import { HubShell } from "./HubShell";
import AdminFinanceLedger from "../AdminFinanceLedger";
import AdminRefunds from "../AdminRefunds";
import AdminPayouts from "../AdminPayouts";
import AdminTaxReport from "../AdminTaxReport";
import AdminInstallments from "../AdminInstallments";

export default function AdminFinanceHub() {
  return (
    <HubShell
      title="Finance"
      description="Revenue ledger, refunds, payouts and tax reports"
      tabs={[
        { value: "ledger", label: "Ledger", content: <AdminFinanceLedger /> },
        { value: "refunds", label: "Refunds", content: <AdminRefunds /> },
        { value: "payouts", label: "Payouts", content: <AdminPayouts /> },
        { value: "installments", label: "Part Payments", content: <AdminInstallments /> },
        { value: "tax", label: "Tax Report", content: <AdminTaxReport /> },
      ]}
    />
  );
}