"use client";
import React from 'react'
import { Input } from '@/components/ui/input'

const countries = ["India", "United States", "United Kingdom", "Canada", "Australia"]

export default function ShippingForm({ value, onChange, errors }: any) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    onChange({ ...value, [e.target.name]: e.target.value });
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 w-full max-w-xl mx-auto">
      <h3 className="text-md font-semibold mb-4 text-[rgb(71,60,102)]">Shipping Information</h3>
      {/* Contact Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <Input
            name="fullName"
            autoComplete="name"
            required
            placeholder="e.g. Andrew Dominic"
            value={value.fullName || ""}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors?.fullName ? "border-red-500" : ""}`}
          />
          {errors?.fullName && <div className="text-red-500 text-xs mt-1">{errors.fullName}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="e.g. andrew@email.com"
            value={value.email || ""}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors?.email ? "border-red-500" : ""}`}
          />
          {errors?.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <Input
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="numeric"
            required
            placeholder="e.g. 9876543210"
            value={value.phone || ""}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors?.phone ? "border-red-500" : ""}`}
          />
          {errors?.phone && <div className="text-red-500 text-xs mt-1">{errors.phone}</div>}
        </div>
      </div>
      {/* Address Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Flat/House No. *</label>
          <Input
            name="flatHouseNo"
            autoComplete="address-line1"
            required
            placeholder="e.g. 123/4A"
            value={value.flatHouseNo || ""}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors?.flatHouseNo ? "border-red-500" : ""}`}
          />
          {errors?.flatHouseNo && <div className="text-red-500 text-xs mt-1">{errors.flatHouseNo}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street *</label>
          <Input
            name="streetAddress"
            autoComplete="address-line2"
            required
            placeholder="e.g. Nakeerer Street"
            value={value.streetAddress || ""}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors?.streetAddress ? "border-red-500" : ""}`}
          />
          {errors?.streetAddress && <div className="text-red-500 text-xs mt-1">{errors.streetAddress}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Area/Locality *</label>
          <Input
            name="areaLocality"
            autoComplete="address-level3"
            required
            placeholder="e.g. Anna Nagar"
            value={value.areaLocality || ""}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors?.areaLocality ? "border-red-500" : ""}`}
          />
          {errors?.areaLocality && <div className="text-red-500 text-xs mt-1">{errors.areaLocality}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
          <Input
            name="landmark"
            autoComplete="off"
            placeholder="e.g. Near City Park (optional)"
            value={value.landmark || ""}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
          <Input
            name="city"
            autoComplete="address-level2"
            required
            placeholder="e.g. Chennai"
            value={value.city || ""}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors?.city ? "border-red-500" : ""}`}
          />
          {errors?.city && <div className="text-red-500 text-xs mt-1">{errors.city}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
          <Input
            name="state"
            autoComplete="address-level1"
            required
            placeholder="e.g. Tamil Nadu"
            value={value.state || ""}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors?.state ? "border-red-500" : ""}`}
          />
          {errors?.state && <div className="text-red-500 text-xs mt-1">{errors.state}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
          <Input
            name="pincode"
            autoComplete="postal-code"
            inputMode="numeric"
            required
            placeholder="e.g. 600001"
            value={value.pincode || ""}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${errors?.pincode ? "border-red-500" : ""}`}
          />
          {errors?.pincode && <div className="text-red-500 text-xs mt-1">{errors.pincode}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
          <Input
            name="country"
            autoComplete="country"
            value="India"
            disabled
            className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
} 