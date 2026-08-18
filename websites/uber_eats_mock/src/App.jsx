import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import CartPanel from './components/CartPanel';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { AppProvider } from './context/AppContext';
import Account from './pages/Account';
import Checkout from './pages/Checkout';
import Favorites from './pages/Favorites';
import Go from './pages/Go';
import Homepage from './pages/Homepage';
import Orders from './pages/Orders';
import OrderTracking from './pages/OrderTracking';
import SearchPage from './pages/SearchPage';
import StorePage from './pages/StorePage';

function LegacyRestaurantRedirect() {
  const { id } = useParams();
  const { search } = useLocation();

  // CUA-Gym task ed102b55-60f0-558b-b76f-a29b0d199624 still launches /restaurant/rest_9.
  return <Navigate to={{ pathname: `/store/${id}`, search }} replace />;
}

function AppRoutes() {
  const location = useLocation();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const showApplicationChrome = location.pathname !== '/go';

  return (
    <div className="app-layout">
      {showApplicationChrome && (
        <>
          <Header
            onCartClick={() => setIsCartOpen(true)}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
          <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        </>
      )}
      <main className={showApplicationChrome ? 'app-main' : undefined}>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/store/:id" element={<StorePage />} />
          <Route path="/restaurant/:id" element={<LegacyRestaurantRedirect />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:orderId" element={<OrderTracking />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/account" element={<Account />} />
          <Route path="/go" element={<Go />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
