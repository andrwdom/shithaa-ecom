"use client";
import React from 'react'
import { Input } from '@/components/ui/input'
import dynamic from "next/dynamic";
const PlacesAutocomplete = dynamic(() => import("react-places-autocomplete"), { ssr: false });

const countries = ["India", "United States", "United Kingdom", "Canada", "Australia"]

export default function ShippingForm({ value, onChange, errors }: any) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    onChange({ ...value, [e.target.name]: e.target.value });
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 w-full max-w-xl mx-auto">
      <h3 className="text-md font-semibold mb-4 text-[rgb(71,60,102)]">Shipping Information</h3>
      <form autoComplete="on">
        <div className="grid grid-cols-1 gap-4">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <Input
              id="fullName"
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
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <Input
              id="email"
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
          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <Input
              id="phone"
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
          {/* Address Line 1 with Google Places Autocomplete */}
          <div>
            <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 1 *
            </label>
            <PlacesAutocomplete
              value={value.addressLine1 || ""}
              onChange={address => onChange({ ...value, addressLine1: address })}
              onSelect={address => onChange({ ...value, addressLine1: address })}
              searchOptions={{ componentRestrictions: { country: "in" } }}
            >
              {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
                <div className="relative">
                  <Input
                    {...getInputProps({
                      id: "addressLine1",
                      name: "addressLine1",
                      autoComplete: "address-line1",
                      required: true,
                      placeholder: "e.g. 123/4A, Nakeerer Street",
                      className: `w-full border rounded-lg px-3 py-2 text-sm ${errors?.addressLine1 ? "border-red-500" : ""}`,
                    })}
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 bg-white border rounded shadow z-50 mt-1 max-h-56 overflow-y-auto">
                      {loading && <div className="px-3 py-2 text-gray-500">Loading...</div>}
                      {suggestions.map(suggestion => (
                        <div
                          {...getSuggestionItemProps(suggestion, {
                            className: "px-3 py-2 cursor-pointer hover:bg-gray-100"
                          })}
                          key={suggestion.placeId}
                        >
                          {suggestion.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </PlacesAutocomplete>
            {errors?.addressLine1 && <div className="text-red-500 text-xs mt-1">{errors.addressLine1}</div>}
          </div>
          {/* Address Line 2 (optional) */}
          <div>
            <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-1">
              Address Line 2
            </label>
            <Input
              id="addressLine2"
              name="addressLine2"
              autoComplete="address-line2"
              placeholder="Apartment, suite, etc. (optional)"
              value={value.addressLine2 || ""}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <Input
              id="city"
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
          {/* State */}
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State *
            </label>
            <Input
              id="state"
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
          {/* Postal Code */}
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code *
            </label>
            <Input
              id="postalCode"
              name="postalCode"
              autoComplete="postal-code"
              inputMode="numeric"
              required
              placeholder="e.g. 600001"
              value={value.postalCode || ""}
              onChange={handleChange}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${errors?.postalCode ? "border-red-500" : ""}`}
            />
            {errors?.postalCode && <div className="text-red-500 text-xs mt-1">{errors.postalCode}</div>}
          </div>
          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country *
            </label>
            <Input
              id="country"
              name="country"
              autoComplete="country"
              value="India"
              disabled
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>
      </form>
    </div>
  );
} 