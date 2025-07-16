"use client";
import React, { useState } from 'react'
import { Input } from '@/components/ui/input'

export default function BillingForm({ value, onChange, sameAsShipping, onToggleSame, errors, shipping }: any) {
  const [open, setOpen] = useState(!sameAsShipping)
  React.useEffect(() => { setOpen(!sameAsShipping) }, [sameAsShipping])
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    onChange({ ...value, [e.target.name]: e.target.value })
  }
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <input type="checkbox" checked={sameAsShipping} onChange={e => onToggleSame(e.target.checked)} className="accent-purple-600 w-5 h-5" id="billing-same" />
        <label htmlFor="billing-same" className="text-sm">Billing address is same as shipping</label>
      </div>
      <div className={`transition-all duration-300 overflow-hidden ${open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block font-medium mb-1">Full Name *</label>
            <Input name="fullName" autoComplete="name" value={value.fullName || shipping.fullName || ''} onChange={handleChange} className={errors?.fullName ? 'border-red-500' : ''} disabled={sameAsShipping} />
            {errors?.fullName && <div className="text-red-500 text-xs mt-1">{errors.fullName}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">Email *</label>
            <Input name="email" type="email" autoComplete="email" value={value.email || shipping.email || ''} onChange={handleChange} className={errors?.email ? 'border-red-500' : ''} disabled={sameAsShipping} />
            {errors?.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">Phone *</label>
            <Input name="phone" type="tel" autoComplete="tel" value={value.phone || shipping.phone || ''} onChange={handleChange} className={errors?.phone ? 'border-red-500' : ''} disabled={sameAsShipping} />
            {errors?.phone && <div className="text-red-500 text-xs mt-1">{errors?.phone}</div>}
          </div>
          <div className="col-span-2">
            <label className="block font-medium mb-1">Address Line 1 *</label>
            <Input name="address1" autoComplete="address-line1" value={value.address1 || shipping.address1 || ''} onChange={handleChange} className={errors?.address1 ? 'border-red-500' : ''} disabled={sameAsShipping} />
            {errors?.address1 && <div className="text-red-500 text-xs mt-1">{errors.address1}</div>}
          </div>
          <div className="col-span-2">
            <label className="block font-medium mb-1">Address Line 2</label>
            <Input name="address2" autoComplete="address-line2" value={value.address2 || shipping.address2 || ''} onChange={handleChange} disabled={sameAsShipping} />
          </div>
          <div>
            <label className="block font-medium mb-1">City *</label>
            <Input name="city" autoComplete="address-level2" value={value.city || shipping.city || ''} onChange={handleChange} className={errors?.city ? 'border-red-500' : ''} disabled={sameAsShipping} />
            {errors?.city && <div className="text-red-500 text-xs mt-1">{errors.city}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">State / Province *</label>
            <Input name="state" autoComplete="address-level1" value={value.state || shipping.state || ''} onChange={handleChange} className={errors?.state ? 'border-red-500' : ''} disabled={sameAsShipping} />
            {errors?.state && <div className="text-red-500 text-xs mt-1">{errors.state}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">Pincode / ZIP *</label>
            <Input name="pincode" autoComplete="postal-code" value={value.pincode || shipping.pincode || ''} onChange={handleChange} className={errors?.pincode ? 'border-red-500' : ''} disabled={sameAsShipping} />
            {errors?.pincode && <div className="text-red-500 text-xs mt-1">{errors.pincode}</div>}
          </div>
          <div>
            <label className="block font-medium mb-1">Country *</label>
            <Input name="country" autoComplete="country" value={value.country || shipping.country || ''} onChange={handleChange} className={errors?.country ? 'border-red-500' : ''} disabled={sameAsShipping} />
            {errors?.country && <div className="text-red-500 text-xs mt-1">{errors.country}</div>}
          </div>
        </div>
      </div>
    </div>
  )
} 