import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
      <div className="mb-8">
        <Image
          src="/shitha-logo.jpg"
          alt="Shitha Clothing"
          width={120}
          height={120}
          className="animate-fade-pulse"
          priority
        />
      </div>
      <div className="flex items-center justify-center space-x-2">
        <span className="sr-only">Loading...</span>
        <div className="w-6 h-6 border-4 border-theme-400 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-theme-400 font-semibold text-lg animate-pulse">Loading New Arrivals...</div>
      </div>
    </div>
  );
}
