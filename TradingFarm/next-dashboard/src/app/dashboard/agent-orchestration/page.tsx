
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function MockPage() {
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>This page is under maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <p>We're working on improving this feature. Please check back later.</p>
        </CardContent>
      </Card>
    </div>
  );
}
