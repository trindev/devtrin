import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { Spinner } from '@/components/ui/spinner';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'press inline-flex aria-busy:[&>svg:not([role=status])]:hidden items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.16)] hover:bg-primary/90',
                destructive: 'bg-danger-soft text-destructive hover:bg-destructive hover:text-destructive-foreground',
                outline: 'border border-border bg-card hover:bg-secondary',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'text-text-2 hover:bg-secondary hover:text-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-10 px-4',
                sm: 'h-8 rounded-lg px-3 text-[0.8125rem]',
                lg: 'h-12 px-6 text-[0.9375rem]',
                icon: 'size-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    /** แสดงวงหมุนแทนไอคอนแรก และกดซ้ำไม่ได้ */
    loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
        if (asChild) {
            return (
                <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
                    {children}
                </Slot>
            );
        }

        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || loading}
                aria-busy={loading || undefined}
                {...props}
            >
                {loading && <Spinner />}
                {children}
            </button>
        );
    },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
