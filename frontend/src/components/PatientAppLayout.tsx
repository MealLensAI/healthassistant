import { Outlet } from "react-router-dom"
import MainLayout from "@/components/MainLayout"
import ProtectedRoute from "@/components/ProtectedRoute"
import TrialBlocker from "@/components/TrialBlocker"

/** Shared patient chrome — mounts once across meal tools and care routes. */
export default function PatientAppLayout() {
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
