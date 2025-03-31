// Type declarations for modules without type definitions

// Resolve React type declarations
declare module 'react' {
  import * as React from 'react';
  export = React;
  export as namespace React;
}

// UI Component declarations
declare module '@/components/ui/card' {
  export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
  export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>>;
  export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/button' {
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
  }
  
  export const Button: React.FC<ButtonProps>;
}

declare module '@/components/ui/tabs' {
  export const Tabs: React.FC<React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string, value?: string, onValueChange?: (value: string) => void }>;
  export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const TabsTrigger: React.FC<React.HTMLAttributes<HTMLButtonElement> & { value: string }>;
  export const TabsContent: React.FC<React.HTMLAttributes<HTMLDivElement> & { value: string }>;
}

declare module '@/components/ui/input' {
  export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
  export const Input: React.FC<InputProps>;
}

declare module '@/components/ui/badge' {
  export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  }
  export const Badge: React.FC<BadgeProps>;
}

declare module '@/components/ui/dialog' {
  export const Dialog: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const DialogTrigger: React.FC<{ asChild?: boolean } & React.HTMLAttributes<HTMLButtonElement>>;
  export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
  export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>>;
  export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const DialogClose: React.FC<React.HTMLAttributes<HTMLButtonElement>>;
}

declare module '@/components/ui/switch' {
  export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
  export const Switch: React.FC<SwitchProps>;
}

declare module '@/components/ui/label' {
  export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    htmlFor?: string;
  }
  export const Label: React.FC<LabelProps>;
}

declare module '@/components/ui/slider' {
  export interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number[];
    defaultValue?: number[];
    min?: number;
    max?: number;
    step?: number;
    onValueChange?: (value: number[]) => void;
    onValueCommit?: (value: number[]) => void;
  }
  export const Slider: React.FC<SliderProps>;
}
