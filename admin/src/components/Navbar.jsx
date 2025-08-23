import React from 'react'
import { assets } from '../assets/assets'

const Navbar = ({setToken}) => {
  return (
    <div className='flex items-center py-2 px-[4%] justify-between shadow-sm' style={{ backgroundColor: '#4D1E64' }}>
        <img className='h-12 w-auto' src={assets.logo} alt="Shitha Logo" />
        <div className='flex col gap-10'>
          <button 
            onClick={()=>setToken('')} 
            className='bg-[#4D1E64] text-white px-7 py-2.5 rounded-md text-sm font-medium hover:bg-[#3a164d] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4D1E64] focus:ring-offset-2 flex items-center gap-2'
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
            </svg>
            Logout
          </button>
        </div>
    </div>
  )
}

export default Navbar