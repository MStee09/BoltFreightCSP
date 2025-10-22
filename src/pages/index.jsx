import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from "./Layout.jsx";
import Dashboard from "./Dashboard";
import Customers from "./Customers";
import Carriers from "./Carriers";
import CarrierDetail from "./CarrierDetail";
import Tariffs from "./Tariffs";
import TariffUpload from "./TariffUpload";
import Pipeline from "./Pipeline";
import CalendarView from "./CalendarView";
import Reports from "./Reports";
import TariffDetail from "./TariffDetail";
import Help from "./Help";
import GmailCallback from "./GmailCallback";
import Settings from "./Settings";
import Login from "./Login";
import Register from "./Register";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

const PAGES = {

    Dashboard: Dashboard,

    Customers: Customers,

    Carriers: Carriers,

    CarrierDetail: CarrierDetail,

    Tariffs: Tariffs,

    TariffUpload: TariffUpload,

    Pipeline: Pipeline,

    CalendarView: CalendarView,

    Reports: Reports,

    TariffDetail: TariffDetail,

    Help: Help,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/gmail-callback" element={<GmailCallback />} />

            <Route path="/" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <Dashboard />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/Dashboard" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <Dashboard />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/Customers" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <Customers />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/Carriers" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <Carriers />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/CarrierDetail" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <CarrierDetail />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/Tariffs" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <Tariffs />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/TariffUpload" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <TariffUpload />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/Pipeline" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <Pipeline />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/CalendarView" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <CalendarView />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/Reports" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <Reports />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/TariffDetail" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <TariffDetail />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/Help" element={
                <ProtectedRoute>
                    <Layout currentPageName={currentPage}>
                        <Help />
                    </Layout>
                </ProtectedRoute>
            } />
            <Route path="/settings" element={
                <ProtectedRoute>
                    <Layout currentPageName="Settings">
                        <Settings />
                    </Layout>
                </ProtectedRoute>
            } />
        </Routes>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}