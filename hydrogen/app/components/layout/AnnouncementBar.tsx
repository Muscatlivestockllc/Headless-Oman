import { Fragment } from "react";
import { Link } from "react-router";

interface AnnouncementBarProps {
  messages?: string[];
  /** Seconds for one full scroll loop. Higher = slower. Undefined = CSS default (25s). */
  scrollSeconds?: number;
}

// Renders a message, turning inline [text](url) markdown into links so a merchant can link
// specific words (e.g. "... [Shop now](/collections/all)"). Everything else stays plain text.
function renderMessage(message: string, keyPrefix: string) {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(message)) !== null) {
    if (m.index > last) out.push(<Fragment key={`${keyPrefix}-t${i}`}>{message.slice(last, m.index)}</Fragment>);
    const [, text, url] = m;
    const isExternal = /^https?:\/\//i.test(url) && !/mls\.om/i.test(url);
    if (isExternal) {
      out.push(
        <a key={`${keyPrefix}-l${i}`} href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:no-underline">
          {text}
        </a>,
      );
    } else {
      out.push(
        <Link key={`${keyPrefix}-l${i}`} to={url} className="underline underline-offset-2 hover:no-underline">
          {text}
        </Link>,
      );
    }
    last = re.lastIndex;
    i++;
  }
  if (last < message.length) out.push(<Fragment key={`${keyPrefix}-tEnd`}>{message.slice(last)}</Fragment>);
  return out;
}

export function AnnouncementBar({ messages = [], scrollSeconds }: AnnouncementBarProps) {
  if (messages.length === 0) return null;
  // Triple so the loop never shows a gap regardless of message count
  const items = [...messages, ...messages, ...messages];
  const style = scrollSeconds ? { animationDuration: `${scrollSeconds}s` } : undefined;
  return (
    <div className="bg-gradient-brand-deep text-crimson-foreground overflow-hidden">
      <div className="flex py-2 text-xs sm:text-sm">
        <div className="announcement-scroll flex gap-12 whitespace-nowrap font-medium tracking-wide" style={style}>
          {items.map((m, i) => (
            <span key={i} className="flex-shrink-0">★ {renderMessage(m, `a${i}`)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
