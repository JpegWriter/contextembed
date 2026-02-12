import type { Metadata } from 'next';
import { getAllPillars, getPostsByPillar } from '@/lib/content';
import { PillarCard } from '@/components/PillarCard';

export const metadata: Metadata = {
  title: 'Pillars',
  description: 'Foundational guides on image metadata, authorship, and AI-ready publishing.',
};

export default function PillarsIndex() {
  const pillars = getAllPillars();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-fg">Pillars</h1>
        <p className="mt-2 text-fg-muted">
          Foundational guides. Each pillar anchors a cluster of related posts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {pillars.map((pillar) => {
          const postCount = getPostsByPillar(pillar.slug).length;
          return (
            <PillarCard key={pillar.slug} pillar={pillar} postCount={postCount} />
          );
        })}
      </div>

      {pillars.length === 0 && (
        <p className="py-20 text-center text-fg-muted">
          No published pillars yet. Run <code>npm run new:pillar &quot;Title&quot;</code> to create one.
        </p>
      )}
    </div>
  );
}
