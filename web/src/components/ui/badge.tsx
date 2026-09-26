import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-1',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-2 text-text-muted',
        accent: 'bg-accent-100 text-accent-700',
        success: 'bg-success-bg text-success',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
