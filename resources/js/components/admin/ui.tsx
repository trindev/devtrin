import clsx from 'clsx';
import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export function Button({
    variant = 'primary',
    size = 'md',
    loading,
    className,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md'; loading?: boolean }) {
    return (
        <button
            {...props}
            disabled={props.disabled || loading}
            className={clsx(
                'inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-60',
                size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
                variant === 'primary' && 'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200',
                variant === 'secondary' && 'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
                variant === 'ghost' && 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
                variant === 'danger' && 'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40',
                className,
            )}
        >
            {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {children}
        </button>
    );
}

export function Field({ label, hint, error, children, htmlFor, className }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string; className?: string }) {
    return (
        <div className={className}>
            <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {label}
            </label>
            {children}
            {error ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                    {error}
                </p>
            ) : (
                hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
            )}
        </div>
    );
}

const inputClass =
    'block w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 focus:outline-none aria-invalid:border-red-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={clsx(inputClass, 'h-10', className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={clsx(inputClass, 'py-2.5 leading-relaxed', className)} />;
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
    return (
        <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
                <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
                {description && <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>}
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={clsx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-violet-600' : 'bg-zinc-300 dark:bg-zinc-700')}
            >
                <span className={clsx('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
            </button>
        </label>
    );
}

export function Card({ title, description, children, className, actions }: { title?: string; description?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
    return (
        <section className={clsx('rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900', className)}>
            {(title || actions) && (
                <header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <div>
                        {title && <h2 className="font-semibold text-zinc-900 dark:text-white">{title}</h2>}
                        {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
                    </div>
                    {actions}
                </header>
            )}
            <div className="p-5">{children}</div>
        </section>
    );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
                {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}
