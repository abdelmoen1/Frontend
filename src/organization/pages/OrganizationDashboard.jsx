import { useAuth } from "../../shared/auth/useAuth";

function OrganizationDashboard() {
  const { user } = useAuth();

  return (
    <main>
      <h1>لوحة المؤسسة</h1>
      <p>مرحبًا {user?.name}</p>
    </main>
  );
}

export default OrganizationDashboard;