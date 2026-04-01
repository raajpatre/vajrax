import { redirect } from "next/navigation";

export default function InventoryHistoryRedirectPage() {
    redirect("/admin/requests?tab=history");
}
