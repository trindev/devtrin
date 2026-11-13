import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type ReactNode } from 'react';

/**
 * Modal กระจกฝ้า สำหรับฟอร์มเพิ่ม/แก้ไข — จอเล็กเลื่อนขึ้นจากขอบล่าง จอใหญ่ลอยกลางจอ
 *
 * <Modal open={open} onOpenChange={setOpen} title="แก้ไขคดี" footer={<Button>บันทึก</Button>}>…ฟอร์ม…</Modal>
 */
export function Modal({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    size = 'md',
    trigger,
}: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    trigger?: ReactNode;
}) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[var(--scrim)] backdrop-blur-[2px]" />
                <DialogPrimitive.Content
                    className={cn(
                        'glass text-foreground fixed z-50 flex max-h-[min(88dvh,860px)] w-full flex-col overflow-hidden outline-none',
                        // มือถือ: แผ่นล่าง
                        'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-8 data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8 data-[state=open]:fade-in-0 inset-x-0 bottom-0 rounded-t-3xl data-[state=open]:duration-300',
                        // จอใหญ่: ลอยกลาง
                        'sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl',
                        { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size],
                    )}
                >
                    <div className="flex items-start gap-4 px-6 pt-5 pb-3">
                        <div className="min-w-0 flex-1">
                            <DialogPrimitive.Title className="text-lg leading-7 font-medium">{title}</DialogPrimitive.Title>
                            {description ? (
                                <DialogPrimitive.Description className="text-muted-foreground mt-0.5 text-sm">
                                    {description}
                                </DialogPrimitive.Description>
                            ) : (
                                <DialogPrimitive.Description className="sr-only">
                                    {typeof title === 'string' ? title : 'หน้าต่าง'}
                                </DialogPrimitive.Description>
                            )}
                        </div>
                        <DialogPrimitive.Close
                            className="press text-muted-foreground hover:bg-secondary hover:text-foreground -mr-2 rounded-full p-2"
                            aria-label="ปิด"
                        >
                            <X className="size-[18px]" strokeWidth={1.75} />
                        </DialogPrimitive.Close>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">{children}</div>
                    {footer && (
                        <div className="border-border flex flex-col-reverse gap-2 border-t px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
                            {footer}
                        </div>
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
