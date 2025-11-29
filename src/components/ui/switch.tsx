import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const [isChecked, setIsChecked] = React.useState(props.checked ?? props.defaultChecked ?? false);

  React.useEffect(() => {
    if (props.checked !== undefined) {
      setIsChecked(props.checked);
    }
  }, [props.checked]);

  const handleChange = (checked: boolean) => {
    setIsChecked(checked);
    props.onCheckedChange?.(checked);
  };

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        backgroundColor: isChecked ? '#22c55e' : '#64748b',
      }}
      {...props}
      onCheckedChange={handleChange}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        style={{
          backgroundColor: '#ffffff',
          transform: isChecked ? 'translateX(20px)' : 'translateX(2px)',
          transition: 'transform 150ms ease-out',
        }}
        className="pointer-events-none block h-5 w-5 rounded-full shadow-lg"
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
