import { getApiUrl } from "@/lib/server-utils";

export default function DebugPage() {
  const serverApiUrl = getApiUrl();
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug Information</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Environment</h2>
            <p className="text-gray-600">NODE_ENV: {process.env.NODE_ENV}</p>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">API Configuration</h2>
            <p className="text-gray-600">Server API URL: {serverApiUrl}</p>
            <p className="text-gray-600">NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL || 'Not set'}</p>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Server Info</h2>
            <p className="text-gray-600">Is Server Side: {typeof window === 'undefined' ? 'Yes' : 'No'}</p>
            <p className="text-gray-600">Timestamp: {new Date().toISOString()}</p>
          </div>
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API Test</h2>
          <div id="api-test-results">
            <p className="text-gray-600">Loading API test results...</p>
          </div>
        </div>
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `
          async function testApi() {
            const resultsDiv = document.getElementById('api-test-results');
            const apiUrl = '${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}';
            
            try {
              resultsDiv.innerHTML = '<p class="text-blue-600">Testing API connection...</p>';
              
              const response = await fetch(apiUrl + '/api/products?limit=1');
              const data = await response.json();
              
              resultsDiv.innerHTML = \`
                <div class="space-y-2">
                  <p class="text-green-600">✅ API Connection: Success</p>
                  <p class="text-gray-600">Status: \${response.status}</p>
                  <p class="text-gray-600">Products found: \${data.products?.length || 0}</p>
                </div>
              \`;
            } catch (error) {
              resultsDiv.innerHTML = \`
                <div class="space-y-2">
                  <p class="text-red-600">❌ API Connection: Failed</p>
                  <p class="text-gray-600">Error: \${error.message}</p>
                  <p class="text-gray-600">API URL: \${apiUrl}</p>
                </div>
              \`;
            }
          }
          
          // Run test when page loads
          if (typeof window !== 'undefined') {
            setTimeout(testApi, 1000);
          }
        `
      }} />
    </div>
  );
}
