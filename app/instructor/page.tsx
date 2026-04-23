import { RoleGuard } from "@/components/auth/role-guard";
import { InstructorDashboard } from "@/components/dashboard/instructor-dashboard";

export default function InstructorPage() {
  return (
    <RoleGuard allowedRoles={["instructor"]}>
      <InstructorDashboard />
    </RoleGuard>
  );
}
