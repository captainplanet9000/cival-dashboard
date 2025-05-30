/**
 * Declaration file for uuid module
 * This is used to fix TypeScript errors when importing uuid
 */
declare module 'uuid' {
  export function v4(): string;
  export function v4(options: any): string;
  export function v4(options: any, buffer: any, offset?: number): any;

  export function v1(): string;
  export function v1(options: any): string;
  export function v1(options: any, buffer: any, offset?: number): any;

  export function v3(name: string | Buffer, namespace: string | Buffer): string;
  export function v3(name: string | Buffer, namespace: string | Buffer, buffer: Buffer, offset?: number): Buffer;

  export function v5(name: string | Buffer, namespace: string | Buffer): string;
  export function v5(name: string | Buffer, namespace: string | Buffer, buffer: Buffer, offset?: number): Buffer;
  
  export function validate(uuid: string): boolean;
  export function parse(uuid: string): Buffer;
  export function stringify(buffer: Buffer, offset?: number): string;
} 