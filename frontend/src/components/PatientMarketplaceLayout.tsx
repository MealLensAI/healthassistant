import { Outlet } from "react-router-dom"
import MainLayout from "@/components/MainLayout"
import ProtectedRoute from "@/components/ProtectedRoute"
import TrialBlocker from "@/components/TrialBlocker"

/**
 * Patient care routes use the shared MainLayout chrome
 * (icon sidebar + top care nav). Marketplace session boots in MainLayout.
 */
export default function PatientMarketplaceLayout() {
  return (
    <ProtectedRoute>
      <TrialBlocker>
        <MainLayout>
          <Outlet />
        </MainLayout>
      </TrialBlocker>
    </ProtectedRoute>
  )
}
