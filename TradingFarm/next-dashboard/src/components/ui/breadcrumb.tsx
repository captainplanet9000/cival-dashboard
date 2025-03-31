import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    aria-label="breadcrumb"
    className={cn(
      "flex items-center text-sm text-muted-foreground",
      className
    )}
    {...props}
  />
));
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.OlHTMLAttributes<HTMLOListElement>
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-1.5 break-words",
      className
    )}
    {...props}
  />
));
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    asChild?: boolean;
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : Link;

  return (
    <Comp
      ref={ref}
      className={cn("hover:text-foreground transition-colors", className)}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbSeparator = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    icon?: React.ReactNode;
  }
>(({ className, icon = <ChevronRightIcon className="h-4 w-4" />, ...props }, ref) => (
  <span
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={cn("opacity-50", className)}
    {...props}
  >
    {icon}
  </span>
));
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

// Re-export to have a more compact API
function SimpleBreadcrumb({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  // Get all children and make sure they're an array
  const items = React.Children.toArray(children);
  
  // If no children or one child, return as is
  if (items.length <= 1) {
    return (
      <Breadcrumb className={className} {...props}>
        <BreadcrumbList>
          {items.map((item, index) => (
            <BreadcrumbItem key={index}>{item}</BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }
  
  return (
    <Breadcrumb className={className} {...props}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>{item}</BreadcrumbItem>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

// Export all components
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  SimpleBreadcrumb as BreadcrumbSimple
};

// Default export for convenience in our previous page
export { SimpleBreadcrumb as default };
