import React from 'react'
import { NavLink } from 'react-router-dom'
import { assets } from '../assets/assets'

const Sidebar = () => {
  const navigation = [
    {
      name: 'Add Items',
      path: '/add',
      icon: <img className='w-5 h-5' src={assets.add_icon} alt="" />
    },
    {
      name: 'List Items',
      path: '/list',
      icon: <img className='w-5 h-5' src={assets.order_icon} alt="" />
    },
    {
      name: 'Orders',
      path: '/orders',
      icon: <img className='w-5 h-5' src={assets.order_icon} alt="" />
    },
    {
      name: 'Coupons',
      path: '/coupons',
      icon: <img className='w-5 h-5' src={assets.discount} alt="" />
    },
    {
      name: 'Carousel Banners',
      path: '/carousel',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )
    }
  ];

  return (
    <div className='w-[18%] min-h-screen border-r-2'>
      <div className='flex flex-col gap-4 pt-6 pl-[20%] text-[15px]'>
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            className='flex items-center gap-3 border border-gray-300 border-r-0 px-3 py-2 rounded-l'
            to={item.path}
          >
            {item.icon}
            <p className='hidden md:block'>{item.name}</p>
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default Sidebar