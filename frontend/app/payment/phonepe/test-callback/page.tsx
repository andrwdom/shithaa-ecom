'use client'

import { useEffect, useState } from 'react'

export default function TestCallbackPage() {
  const [urlParams, setUrlParams] = useState<any>({})
  const [headers, setHeaders] = useState<any>({})
  const [body, setBody] = useState<any>({})

  useEffect(() => {
    // Get all URL parameters
    const params = new URLSearchParams(window.location.search)
    const allParams = Object.fromEntries(params.entries())
    setUrlParams(allParams)
    
    // Log everything for debugging
    console.log('Current URL:', window.location.href)
    console.log('URL Parameters:', allParams)
    console.log('All URL parts:', {
      href: window.location.href,
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PhonePe Callback Test</h1>
        
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">URL Information</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Full URL:</h3>
              <p className="text-sm bg-gray-100 p-2 rounded break-all">{window.location.href}</p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">URL Parameters:</h3>
              <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(urlParams, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Pathname:</h3>
              <p className="text-sm bg-gray-100 p-2 rounded">{window.location.pathname}</p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Search String:</h3>
              <p className="text-sm bg-gray-100 p-2 rounded">{window.location.search}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Common PhonePe Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Expected Parameters:</h3>
              <ul className="text-sm space-y-1">
                <li>• merchantTransactionId</li>
                <li>• transactionId</li>
                <li>• orderId</li>
                <li>• id</li>
                <li>• amount</li>
                <li>• status</li>
                <li>• state</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Found Parameters:</h3>
              <ul className="text-sm space-y-1">
                {Object.keys(urlParams).map(key => (
                  <li key={key}>• {key}: {urlParams[key]}</li>
                ))}
                {Object.keys(urlParams).length === 0 && (
                  <li className="text-gray-500">No parameters found</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => {
                const testUrl = `${window.location.origin}/payment/phonepe/callback?merchantTransactionId=test123&amount=1000`
                window.location.href = testUrl
              }}
              className="btn btn-primary w-full"
            >
              Test with Sample Parameters
            </button>
            
            <button
              onClick={() => {
                const testUrl = `${window.location.origin}/payment/phonepe/callback?transactionId=test456&amount=2000`
                window.location.href = testUrl
              }}
              className="btn btn-secondary w-full"
            >
              Test with transactionId Parameter
            </button>
            
            <button
              onClick={() => {
                const testUrl = `${window.location.origin}/payment/phonepe/callback?orderId=test789&amount=3000`
                window.location.href = testUrl
              }}
              className="btn btn-accent w-full"
            >
              Test with orderId Parameter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 