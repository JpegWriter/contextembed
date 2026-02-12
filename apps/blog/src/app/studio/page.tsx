import type { Metadata } from 'next';
import { getAllDrafts } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Studio',
  description: 'Draft management dashboard.',
  robots: { index: false },
};

export default function StudioPage() {
  const drafts = getAllDrafts();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-fg">Studio</h1>
        <p className="mt-2 text-fg-muted">
          {drafts.length} draft{drafts.length !== 1 && 's'} found. Click a path to open in your editor.
        </p>
      </div>

      {drafts.length === 0 ? (
        <p className="py-20 text-center text-fg-muted">No drafts.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border text-left">
                <th className="py-2 pr-4 font-semibold text-fg-muted">Type</th>
                <th className="py-2 pr-4 font-semibold text-fg-muted">Title</th>
                <th className="py-2 font-semibold text-fg-muted">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drafts.map((d) => (
                <tr key={d.filePath} className="group">
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        d.type === 'pillar'
                          ? 'bg-accent/10 text-accent'
                          : 'bg-bg-secondary text-fg-muted'
                      }`}
                    >
                      {d.type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium text-fg">{d.title}</td>
                  <td className="py-3 font-mono text-xs text-fg-muted group-hover:text-accent transition-colors">
                    {d.filePath}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
