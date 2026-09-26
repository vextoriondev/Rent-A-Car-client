import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Variants map onto the app's existing .badge-* tones in globals.css.
const badgeVariants = cva("badge", {
  variants: {
    tone: {
      neutral: "badge-neutral",
      good: "badge-good",
      warn: "badge-warn",
      bad: "badge-bad",
      blue: "badge-blue",
    },
  },
  defaultVariants: { tone: "neutral" },
})

function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-tone={tone ?? "neutral"}
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
