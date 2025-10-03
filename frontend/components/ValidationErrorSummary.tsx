"use client";
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, AlertTriangle } from 'lucide-react';

interface ValidationErrorSummaryProps {
  errors: Record<string, string>;
  className?: string;
}

export default function ValidationErrorSummary({ errors, className = "" }: ValidationErrorSummaryProps) {
  // Filter out empty errors
  const hasErrors = Object.keys(errors).length > 0;
  
  if (!hasErrors) {
    return null;
  }

  const errorMessages = Object.values(errors);

  return (
    <Alert className={`border-red-200 bg-red-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="font-semibold mb-2">Please fix the following errors:</div>
        <ul className="list-disc list-inside space-y-1">
          {errorMessages.map((error, index) => (
            <li key={index} className="text-sm">
              {error}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
