import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const medicalCardVariants = cva(
  "rounded-xl border transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card border-border",
        glass: "bg-card/60 backdrop-blur-md border-border/50",
        elevated: "bg-card border-border shadow-lg shadow-primary/5",
        danger: "bg-destructive/5 border-destructive/30",
        warning: "bg-warning/5 border-warning/30",
        success: "bg-success/5 border-success/30",
        primary: "bg-primary/5 border-primary/30",
      },
      glow: {
        none: "",
        primary: "shadow-[0_0_20px_hsl(var(--primary)/0.15)]",
        danger: "shadow-[0_0_20px_hsl(var(--danger)/0.2)]",
        warning: "shadow-[0_0_20px_hsl(var(--warning)/0.15)]",
        success: "shadow-[0_0_20px_hsl(var(--success)/0.15)]",
        pulse: "animate-pulse shadow-[0_0_20px_hsl(var(--primary)/0.2)]",
      },
      size: {
        sm: "p-3",
        default: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      glow: "none",
      size: "default",
    },
  }
);

export interface MedicalCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof medicalCardVariants> {
  gradient?: boolean;
}

const MedicalCard = React.forwardRef<HTMLDivElement, MedicalCardProps>(
  ({ className, variant, glow, size, gradient, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          medicalCardVariants({ variant, glow, size }),
          gradient && "bg-gradient-to-br from-card via-card to-secondary/30",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MedicalCard.displayName = "MedicalCard";

const MedicalCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-3 pb-3 border-b border-border/50 mb-3",
      className
    )}
    {...props}
  />
));
MedicalCardHeader.displayName = "MedicalCardHeader";

const MedicalCardIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { pulse?: boolean }
>(({ className, pulse, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center",
      pulse && "animate-pulse",
      className
    )}
    {...props}
  />
));
MedicalCardIcon.displayName = "MedicalCardIcon";

const MedicalCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold text-foreground tracking-tight", className)}
    {...props}
  />
));
MedicalCardTitle.displayName = "MedicalCardTitle";

const MedicalCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
MedicalCardDescription.displayName = "MedicalCardDescription";

const MedicalCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-3", className)} {...props} />
));
MedicalCardContent.displayName = "MedicalCardContent";

const MedicalCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "pt-3 mt-3 border-t border-border/50 flex items-center gap-2",
      className
    )}
    {...props}
  />
));
MedicalCardFooter.displayName = "MedicalCardFooter";

// Status indicator component for vitals/alerts
const StatusIndicator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    status: "stable" | "warning" | "critical" | "inactive";
    pulse?: boolean;
  }
>(({ className, status, pulse = true, ...props }, ref) => {
  const statusColors = {
    stable: "bg-success",
    warning: "bg-warning",
    critical: "bg-destructive",
    inactive: "bg-muted-foreground",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "w-2.5 h-2.5 rounded-full",
        statusColors[status],
        pulse && status !== "inactive" && status !== "stable" && "animate-pulse",
        className
      )}
      {...props}
    />
  );
});
StatusIndicator.displayName = "StatusIndicator";

export {
  MedicalCard,
  MedicalCardHeader,
  MedicalCardIcon,
  MedicalCardTitle,
  MedicalCardDescription,
  MedicalCardContent,
  MedicalCardFooter,
  StatusIndicator,
  medicalCardVariants,
};
