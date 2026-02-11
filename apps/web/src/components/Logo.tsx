/**
 * ContextEmbed Logo Component
 * Renders the CE monogram + ContextEmbed wordmark
 * 
 * Variants:
 * - 'full'     → CE mark + "ContextEmbed" wordmark (default)
 * - 'mark'     → CE mark only (for compact spaces)
 * - 'wordmark' → "ContextEmbed" text only
 */

interface LogoProps {
  variant?: 'full' | 'mark' | 'wordmark';
  /** Size presets */
  size?: 'sm' | 'md' | 'lg';
  /** Dark background mode (white text) — default true */
  dark?: boolean;
  className?: string;
}

const sizes = {
  sm: { mark: 'w-6 h-6', text: 'text-xs', letterSize: 'text-[10px]' },
  md: { mark: 'w-8 h-8', text: 'text-sm', letterSize: 'text-sm' },
  lg: { mark: 'w-10 h-10', text: 'text-lg', letterSize: 'text-base' },
};

export function Logo({ variant = 'full', size = 'md', dark = true, className = '' }: LogoProps) {
  const s = sizes[size];

  const markBg = dark
    ? 'bg-white'
    : 'bg-slate-900';
  const markText = dark
    ? 'text-slate-900'
    : 'text-white';
  const wordmarkText = dark
    ? 'text-white'
    : 'text-slate-900';

  const mark = (
    <div className={`${s.mark} ${markBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
      <span className={`${markText} font-black ${s.letterSize} leading-none tracking-tighter`}>
        CE
      </span>
    </div>
  );

  const wordmark = (
    <span className={`font-bold ${s.text} ${wordmarkText} tracking-tight`}>
      ContextEmbed
    </span>
  );

  if (variant === 'mark') {
    return <div className={`inline-flex ${className}`}>{mark}</div>;
  }

  if (variant === 'wordmark') {
    return <div className={`inline-flex ${className}`}>{wordmark}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {mark}
      {wordmark}
    </div>
  );
}

export default Logo;
