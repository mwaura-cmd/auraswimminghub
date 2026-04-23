import { RoleGuard } from "@/components/auth/role-guard";
import { LearnerDashboard } from "@/components/dashboard/learner-dashboard";

export default function PortalPage() {
  return (
    <RoleGuard allowedRoles={["student", "parent"]}>
      <LearnerDashboard />
    </RoleGuard>
  );
}
