import React from 'react'
import { assets } from '../assets/assets'

const Navbar = ({setToken}) => {
  return (
    <div className='flex items-center py-4 px-[4%] justify-between bg-white shadow-sm'>
        <img className='w-[max(10%,80px)]' src={assets.logo} alt="Shitha Logo" />
        <div className='flex col gap-10'>
          <button 
            onClick={()=>setToken('')} 
            className='bg-theme-400 text-white px-5 py-2 sm:px-7 sm:py-2.5 rounded-md text-xs sm:text-sm hover:bg-theme-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-theme-400 focus:ring-offset-2'
          >
            Logout
          </button>
        </div>
    </div>
  )
}

export default Navbar