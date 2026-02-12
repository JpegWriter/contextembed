export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const SITE = {
  name: 'ContextEmbed Blog',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://blog.contextembed.com',
  description:
    'Deep dives on image metadata, authorship integrity, and AI-ready publishing.',
  author: 'ContextEmbed',
};
