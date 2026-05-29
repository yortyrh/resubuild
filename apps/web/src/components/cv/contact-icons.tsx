'use client';

import { normalizeSocialNetworkKey, type SocialNetworkKey } from '@resumind/resume-template';
import { Link, type LucideIcon, Mail, MapPin, Phone, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { FaLinkedin } from 'react-icons/fa6';
import {
  SiBehance,
  SiDiscord,
  SiDribbble,
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiPinterest,
  SiReddit,
  SiX,
} from 'react-icons/si';
import { cn } from '@/lib/utils';

const ICON_CLASS = 'size-3.5 shrink-0';

const BRAND_ICONS: Record<SocialNetworkKey, IconType> = {
  linkedin: FaLinkedin,
  facebook: SiFacebook,
  instagram: SiInstagram,
  github: SiGithub,
  reddit: SiReddit,
  discord: SiDiscord,
  x: SiX,
  dribbble: SiDribbble,
  behance: SiBehance,
  pinterest: SiPinterest,
};

export type ContactIconType = 'location' | 'phone' | 'email' | 'url';

const CONTACT_ICONS: Record<ContactIconType, LucideIcon> = {
  location: MapPin,
  phone: Phone,
  email: Mail,
  url: Link,
};

export function ContactIcon({ type, className }: { type: ContactIconType; className?: string }) {
  const Icon = CONTACT_ICONS[type];
  return <Icon className={cn(ICON_CLASS, className)} aria-hidden="true" />;
}

export function SocialNetworkIcon({
  network,
  className,
}: {
  network: string | undefined | null;
  className?: string;
}) {
  const key = normalizeSocialNetworkKey(network);
  if (key) {
    const Icon = BRAND_ICONS[key];
    return <Icon className={cn(ICON_CLASS, className)} aria-hidden="true" />;
  }
  return <Share2 className={cn(ICON_CLASS, className)} aria-hidden="true" />;
}

export function ContactLineSegment({
  type,
  children,
  className,
}: {
  type?: ContactIconType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {type ? <ContactIcon type={type} /> : null}
      {children}
    </span>
  );
}

export function SocialNetworkTitle({
  network,
  children,
  className,
}: {
  network: string | undefined | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <SocialNetworkIcon network={network} />
      {children}
    </span>
  );
}
