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
    console.log('App.jsx: Token changed to:', token);
    console.log('App.jsx: localStorage token:', localStorage.getItem('token'));
    
    if (token && token !== 'undefined' && token.trim() !== '') {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // Check if token is valid on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken && storedToken !== 'undefined' && storedToken.trim() !== '') {
      setToken(storedToken);
    }
  }, []);

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
              
              {/* Admin Panel Footer */}
              <footer className="mt-auto py-6 bg-gray-800 text-white text-center">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-gray-500 text-sm">
                      Site by{' '}
                      <a
                        href="https://www.instagram.com/elev8max/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center font-bold hover:opacity-80 transition-all duration-300 elev8max-gold text-base tracking-wide"
                      >
                        Elev8Max
                      </a>
                    </p>
                  </div>
                </div>
              </footer>
            </>
          )
        }
      </div>
  )
}

export default App