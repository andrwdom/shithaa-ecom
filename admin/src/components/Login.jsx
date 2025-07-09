import axios from 'axios'
import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import shithaLogo from '../assets/shitha_logo.jpg'

const backendUrl = import.meta.env.VITE_API_URL;

const Login = ({setToken}) => {

    const [email,setEmail] = useState('')
    const [password,setPassword] = useState('')

    const onSubmitHandler = async (e) => {
        try {
            e.preventDefault();
            const response = await axios.post(backendUrl + '/api/user/admin',{email,password})
            if (response.data.success) {
                setToken(response.data.data.token)
            } else {
                toast.error(response.data.message)
            }
             
        } catch (error) {
            console.log(error);
            toast.error(error.message)
        }
    }

  return (
    <div className='min-h-screen flex items-center justify-center w-full bg-theme-50'>
        <div className='bg-white shadow-lg rounded-lg px-8 py-6 max-w-md w-full mx-4'>
            <div className="flex justify-center mb-6">
                <img src={shithaLogo} alt="Shitha Logo" className="w-32" />
            </div>
            <h1 className='text-2xl font-bold mb-6 text-theme-600 text-center'>Admin Panel</h1>
            <form onSubmit={onSubmitHandler} className="space-y-4">
                <div className=''>
                    <p className='text-sm font-medium text-theme-700 mb-2'>Email Address</p>
                    <input 
                        onChange={(e)=>setEmail(e.target.value)} 
                        value={email} 
                        className='rounded-md w-full px-3 py-2 border border-theme-200 outline-none focus:border-theme-400 focus:ring-1 focus:ring-theme-400 transition-colors' 
                        type="email" 
                        placeholder='your@email.com' 
                        required 
                    />
                </div>
                <div className=''>
                    <p className='text-sm font-medium text-theme-700 mb-2'>Password</p>
                    <input 
                        onChange={(e)=>setPassword(e.target.value)} 
                        value={password} 
                        className='rounded-md w-full px-3 py-2 border border-theme-200 outline-none focus:border-theme-400 focus:ring-1 focus:ring-theme-400 transition-colors' 
                        type="password" 
                        placeholder='Enter your password' 
                        required 
                    />
                </div>
                <button 
                    className='mt-6 w-full py-2.5 px-4 rounded-md text-white bg-theme-400 hover:bg-theme-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-400 focus:ring-offset-2' 
                    type="submit"
                > 
                    Login 
                </button>
            </form>
        </div>
    </div>
  )
}

export default Login