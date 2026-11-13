import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                'border-input bg-card ring-offset-background focus-visible:border-primary/50 file:text-foreground placeholder:text-muted-foreground flex h-10 w-full rounded-xl border px-3 py-2 text-base transition-[border-color,box-shadow] duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:shadow-[0_0_0_4px_var(--accent-soft)] focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                className,
            )}
            ref={ref}
            {...props}
        />
    );
});

Input.displayName = 'Input';

export { Input };
