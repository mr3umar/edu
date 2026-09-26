import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  {
    variants: {
      variant: {
        primary: 'bg-accent-600 text-accent-foreground shadow-e1 hover:bg-accent-700 active:bg-accent-700',
        secondary: 'bg-surface text-text border border-border shadow-e1 hover:bg-surface-2 active:bg-surface-3',
        ghost: 'text-text-muted hover:bg-surface-2 hover:text-text',
        outline: 'border border-border-strong text-text hover:bg-surface-2',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'h-10 w-10 shrink-0 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  }
);
Button.displayName = 'Button';
