import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Classes for the wrapper that positions the chevron. */
  wrapperClassName?: string
}

/**
 * Native select with the site's chip styling. The platform control keeps its
 * own listbox, which stays correct on touch devices and with a keyboard, so
 * only the arrow is ours.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <div className={cn('relative', wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          'chip tx text-foreground focus-visible:border-accent focus-visible:ring-coral-wash block h-10 w-full appearance-none rounded-xl py-2 pr-9 pl-4 text-sm focus-visible:ring-4 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden='true'
        className='text-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2'
      />
    </div>
  )
)
Select.displayName = 'Select'

export { Select }
