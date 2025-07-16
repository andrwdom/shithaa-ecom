import React from 'react'
import { assets } from '../assets/assets'

const Navbar = ({setToken}) => {
  return (
    <div className='flex items-center py-2 px-[4%] justify-between shadow-sm' style={{ backgroundColor: '#4D1E64' }}>
        <img className='h-12 w-auto' src={assets.logo} alt="Shitha Logo" />
        <div className='flex col gap-10'>
          <button 
            onClick={()=>setToken('')} 
            className='bg-[#4B2065] text-white px-7 py-2.5 rounded-md text-sm font-medium hover:bg-[#3a174e] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4B2065] focus:ring-offset-2'
          >
            Logout
          </button>
        </div>
    </div>
  )
}

export default Navbar