// Type declarations for Next.js server module
declare module 'next/server' {
  export class NextResponse<T = any> extends Response {
    constructor(body?: BodyInit | null, init?: ResponseInit);
    
    static json<T = any>(body: T, init?: ResponseInit): NextResponse<T>;
    static redirect(url: string | URL, init?: ResponseInit): NextResponse;
    static rewrite(url: string | URL, init?: ResponseInit): NextResponse;
    static next(init?: ResponseInit): NextResponse;
  }
} 