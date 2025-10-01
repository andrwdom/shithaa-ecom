import React from 'react';

export const Alert = ({ className = '', variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-background text-foreground',
    destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
    warning: 'border-yellow-500/50 bg-yellow-50 text-yellow-800 [&>svg]:text-yellow-600',
  };
  
  const variantClasses = variants[variant] || variants.default;
  
  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground ${variantClasses} ${className}`}
      {...props}
    />
  );
};

export const AlertDescription = ({ className = '', ...props }) => (
  <div className={`text-sm [&_p]:leading-relaxed ${className}`} {...props} />
);
