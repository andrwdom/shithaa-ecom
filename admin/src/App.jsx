import React, { useEffect, useState } from 'react'
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
import LoadingScreen from './components/LoadingScreen';
import CarouselManagement from './pages/CarouselManagement';
import ProtectedRoute from './components/ProtectedRoute';
import WithClickSpark from './components/WithClickSpark';

export const backendUrl = import.meta.env.VITE_API_URL
export const currency = '₹'

const App = () => {

  const [token, setToken] = useState(localStorage.getItem('token')?localStorage.getItem('token'):'');

  useEffect(()=>{
    localStorage.setItem('token',token)
  },[token])

  return (
    <WithClickSpark
      sparkColor="#FF69B4"
      sparkSize={12}
      sparkRadius={20}
      sparkCount={10}
      duration={500}
      easing="ease-out"
      extraScale={1.2}
    >
      <div className='bg-gray-50 min-h-screen'>
        <ToastContainer />
        <Toaster position="top-right" />
        <LoadingScreen />
        {token === ""
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
                      <ProtectedRoute>
                        <Orders token={token} setToken={setToken} />
                      </ProtectedRoute>
                    } />
                    <Route path="/add" element={
                      <ProtectedRoute>
                        <Add token={token} />
                      </ProtectedRoute>
                    } />
                    <Route path="/list" element={
                      <ProtectedRoute>
                        <List token={token} />
                      </ProtectedRoute>
                    } />
                    <Route path="/coupons" element={
                      <ProtectedRoute>
                        <CouponManagement token={token} />
                      </ProtectedRoute>
                    } />
                    <Route path="/carousel" element={
                      <ProtectedRoute>
                        <CarouselManagement token={token} />
                      </ProtectedRoute>
                    } />
                    <Route path="*" element={<Navigate to="/orders" replace />} />
                  </Routes>
                </div>
              </div>
            </>
          )
        }
      </div>
    </WithClickSpark>
  )
}

export default App