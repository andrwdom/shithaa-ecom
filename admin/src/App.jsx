import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import { Routes, Route, Navigate } from 'react-router-dom'
import Add from './pages/Add'
import List from './pages/List'
import Orders from './pages/Orders'
import CouponManagement from './pages/CouponManagement'
import Login from './components/Login'
import { ToastContainer } from 'react-toastify';
import { Toaster } from 'react-hot-toast';
import 'react-toastify/dist/ReactToastify.css';
import CarouselManagement from './pages/CarouselManagement';
import ShippingRules from './pages/ShippingRules';
import ProtectedRoute from './components/ProtectedRoute';

export const backendUrl = import.meta.env.VITE_API_URL || 'https://shithaa.in'
export const currency = '₹'

const App = () => {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token');
    return storedToken && storedToken !== 'undefined' ? storedToken : '';
  });

  useEffect(() => {
    if (token && token !== 'undefined' && token.trim() !== '') {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  return (
    <div className='bg-gray-50 min-h-screen'>
      <ToastContainer />
      <Toaster position="top-right" />
      {!token || token === 'undefined' || token.trim() === ""
        ? (
          <Routes>
            <Route path="/" element={<Login setToken={setToken} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )
        : (
          <>
            <Navbar setToken={setToken} />
            <hr />
            <div className='flex w-full'>
              <Sidebar />
              <div className='w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base'>
                <Routes>
                  <Route path="/orders" element={
                    <ProtectedRoute token={token}>
                      <Orders token={token} setToken={setToken} />
                    </ProtectedRoute>
                  } />
                  <Route path="/add" element={
                    <ProtectedRoute token={token}>
                      <Add token={token} />
                    </ProtectedRoute>
                  } />
                  <Route path="/list" element={
                    <ProtectedRoute token={token}>
                      <List token={token} />
                    </ProtectedRoute>
                  } />
                  <Route path="/coupons" element={
                    <ProtectedRoute token={token}>
                      <CouponManagement token={token} />
                    </ProtectedRoute>
                  } />
                  <Route path="/carousel" element={
                    <ProtectedRoute token={token}>
                      <CarouselManagement token={token} />
                    </ProtectedRoute>
                  } />
                  <Route path="/shipping-rules" element={
                    <ProtectedRoute token={token}>
                      <ShippingRules token={token} />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<Navigate to="/orders" replace />} />
                </Routes>
              </div>
            </div>
          </>
        )}
    </div>
  )
}

export default App