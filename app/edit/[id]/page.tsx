'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SetForm from '@/components/SetForm';
import { getSet } from '@/lib/storage';
import { PracticeSet } from '@/types';

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [set, setSet] = useState<PracticeSet | null | undefined>(undefined);

  useEffect(() => {
    const found = getSet(id);
    if (!found) {
      router.push('/');
    } else {
      setSet(found);
    }
  }, [id, router]);

  if (set === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
      </div>
    );
  }

  return <SetForm initialSet={set ?? undefined} />;
}
