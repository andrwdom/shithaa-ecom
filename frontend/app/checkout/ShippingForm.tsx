import React from 'react'
import { Input } from '@/components/ui/input'

const countries = ["India", "United States", "United Kingdom", "Canada", "Australia"]

export default function ShippingForm({ value, onChange, errors }: any) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    onChange({ ...value, [e.target.name]: e.target.value })
  }
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4 text-[rgb(71,60,102)]">Shipping Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block font-medium mb-1">Full Name *</label>
          <Input name="fullName" autoComplete="name" value={value.fullName || ''} onChange={handleChange} className={errors?.fullName ? 'border-red-500' : ''} />
          {errors?.fullName && <div className="text-red-500 text-xs mt-1">{errors.fullName}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Email *</label>
          <Input name="email" type="email" autoComplete="email" value={value.email || ''} onChange={handleChange} className={errors?.email ? 'border-red-500' : ''} />
          {errors?.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Phone *</label>
          <Input name="phone" type="tel" autoComplete="tel" value={value.phone || ''} onChange={handleChange} className={errors?.phone ? 'border-red-500' : ''} />
          {errors?.phone && <div className="text-red-500 text-xs mt-1">{errors.phone}</div>}
        </div>
        <div className="col-span-2">
          <label className="block font-medium mb-1">Address Line 1 *</label>
          <Input name="address1" autoComplete="address-line1" value={value.address1 || ''} onChange={handleChange} className={errors?.address1 ? 'border-red-500' : ''} />
          {errors?.address1 && <div className="text-red-500 text-xs mt-1">{errors.address1}</div>}
        </div>
        <div className="col-span-2">
          <label className="block font-medium mb-1">Address Line 2</label>
          <Input name="address2" autoComplete="address-line2" value={value.address2 || ''} onChange={handleChange} />
        </div>
        <div>
          <label className="block font-medium mb-1">City *</label>
          <Input name="city" autoComplete="address-level2" value={value.city || ''} onChange={handleChange} className={errors?.city ? 'border-red-500' : ''} />
          {errors?.city && <div className="text-red-500 text-xs mt-1">{errors.city}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">State / Province *</label>
          <Input name="state" autoComplete="address-level1" value={value.state || ''} onChange={handleChange} className={errors?.state ? 'border-red-500' : ''} />
          {errors?.state && <div className="text-red-500 text-xs mt-1">{errors.state}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Pincode / ZIP *</label>
          <Input name="pincode" autoComplete="postal-code" value={value.pincode || ''} onChange={handleChange} className={errors?.pincode ? 'border-red-500' : ''} />
          {errors?.pincode && <div className="text-red-500 text-xs mt-1">{errors.pincode}</div>}
        </div>
        <div>
          <label className="block font-medium mb-1">Country *</label>
          <select name="country" autoComplete="country" value={value.country || ''} onChange={handleChange} className={`input input-bordered w-full ${errors?.country ? 'border-red-500' : ''}`} >
            <option value="">Select country</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors?.country && <div className="text-red-500 text-xs mt-1">{errors.country}</div>}
        </div>
      </div>
    </div>
  )
} 