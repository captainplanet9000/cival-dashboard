// This file marks authenticated dashboard pages as client-side only
// to prevent build-time authentication errors

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
