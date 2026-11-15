import { track } from './funnel-browser';
import { BrandBars } from './brand-mark';
import { SHARE_CTA_LABEL, SHARE_MARK_LABEL, type ShareChannel } from './share-channel';

export function ShareMark({ channel }: { channel: ShareChannel }) {
  if (!channel.showMark) {
    return null;
  }
  return (
    <div className="share-mark">
      <div className="share-mark-brand">
        <BrandBars width={16} height={12} gap={2} />
        <span>{SHARE_MARK_LABEL}</span>
      </div>
      <a
        href={channel.href}
        onClick={() => track('shared_compose')}
      >
        {SHARE_CTA_LABEL}
      </a>
    </div>
  );
}
