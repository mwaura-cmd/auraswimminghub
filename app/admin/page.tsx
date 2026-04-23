import { RoleGuard } from "@/components/auth/role-guard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default function AdminPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <AdminDashboard />
    </RoleGuard>
  );
}
