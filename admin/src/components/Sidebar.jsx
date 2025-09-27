import React from 'react'
import { NavLink } from 'react-router-dom'
import { assets } from '../assets/assets'

const Sidebar = () => {
  const navigation = [
    {
      name: 'Dashboard',
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
        </svg>
      )
    },
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
      icon: (
        <svg className="w-5 h-5" width="24" height="24" viewBox="0 0 73 73" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M41.1484 37.4871L38.6348 38.9418V65.0908L61.2694 52.0221V25.873L41.1484 37.4871Z" fill="#565656"/>
          <path d="M45.247 14.039L36.5423 9L13.2793 22.4295L21.9956 27.4684L45.247 14.039Z" fill="#565656"/>
          <path d="M59.7945 22.4307L49.7631 16.7168L26.5117 30.1463L27.8384 30.8329L36.5431 35.8602L45.2013 30.8678L59.7945 22.4307Z" fill="#565656"/>
          <path d="M24.7545 39.7573L20.5883 37.6161V30.9595L12 26.0137V51.9765L34.4717 64.9521V38.9893L24.7545 33.3917V39.7573Z" fill="#565656"/>
        </svg>
      )
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
    },
    {
      name: 'Shipping Rules',
      path: '/shipping-rules',
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
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
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