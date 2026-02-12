export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  updated?: string;
  tags: string[];
  pillar: string;
  series?: string;
  draft: boolean;
  canonical?: string;
}

export interface PillarFrontmatter {
  title: string;
  description: string;
  date: string;
  updated?: string;
  tags: string[];
  draft: boolean;
  canonical?: string;
}

export interface Post {
  slug: string;
  frontmatter: PostFrontmatter;
  content: string;
  readingTime: string;
  headings: Heading[];
}

export interface Pillar {
  slug: string;
  frontmatter: PillarFrontmatter;
  content: string;
  readingTime: string;
  headings: Heading[];
}

export interface Heading {
  depth: number;
  text: string;
  slug: string;
}

export interface SeriesInfo {
  name: string;
  slug: string;
  posts: Post[];
}
