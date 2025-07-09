"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SizeDropdownProps {
  sizes: string[]
  selectedSize: string
  onSizeChange: (size: string) => void
}

export default function SizeDropdown({ sizes, selectedSize, onSizeChange }: SizeDropdownProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-900">Select Size</label>
      <Select value={selectedSize} onValueChange={onSizeChange}>
        <SelectTrigger className="w-full h-12 border-2 border-gray-200 focus:border-pink-400 transition-colors">
          <SelectValue placeholder="Choose your size" />
        </SelectTrigger>
        <SelectContent>
          {sizes.map((size) => (
            <SelectItem key={size} value={size} className="cursor-pointer">
              <div className="flex items-center justify-between w-full">
                <span>{size}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {size === "S" && "(32-34)"}
                  {size === "M" && "(36-38)"}
                  {size === "L" && "(40-42)"}
                  {size === "XL" && "(44-46)"}
                  {size === "XXL" && "(48-50)"}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500">
        Need help with sizing? <button className="text-pink-400 hover:underline">View Size Guide</button>
      </p>
    </div>
  )
}
