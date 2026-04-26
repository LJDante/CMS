import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import Unauthorized from './pages/Unauthorized'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Patients from './pages/Patients'
import Visits from './pages/Visits'
import Consultations from './pages/Consultations'
import Inventory from './pages/Inventory'
import Requests from './pages/Requests'
import Reports from './pages/Reports'
import MedicalRecords from './pages/MedicalRecords'
import AccidentReportRepository from './pages/AccidentReportRepository'
import Scheduling from './pages/Scheduling'
import PhysicalExaminations from './pages/PhysicalExaminations'
import DentalRepository from './pages/DentalRepository'
import { Backup } from './pages/Backup'

export default function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <Layout>
                <Students />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registered-patients"
          element={
            <ProtectedRoute>
              <Layout>
                <Patients />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/visits"
          element={
            <ProtectedRoute>
              <Layout>
                <Visits />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/consultations"
          element={
            <ProtectedRoute>
              <Layout>
                <Consultations />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Layout>
                <Inventory />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <Layout>
                <Requests />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/medical-records"
          element={
            <ProtectedRoute>
              <Layout>
                <MedicalRecords />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/physical-examinations"
          element={
            <ProtectedRoute>
              <Layout>
                <PhysicalExaminations />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accident-reports"
          element={
            <ProtectedRoute>
              <Layout>
                <AccidentReportRepository />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dental-repository"
          element={
            <ProtectedRoute>
              <Layout>
                <DentalRepository />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scheduling"
          element={
            <ProtectedRoute>
              <Layout>
                <Scheduling />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/backup"
          element={
            <ProtectedRoute>
              <Layout>
                <Backup />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </DarkModeProvider>
  )
}

