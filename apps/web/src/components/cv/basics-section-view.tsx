'use client';

import { isProfileVisible, resolveProfileUrl } from '@resumind/resume-template';
import type { Resume, ResumeProfile } from '@resumind/types';
import { ContactLineSegment, SocialNetworkIcon } from '@/components/cv/contact-icons';
import { ExternalLink } from '@/components/cv/external-link';
import { MarkdownView } from '@/components/cv/markdown-view';
import { ProfilePhotoThumbnail } from '@/components/cv/profile-photo-thumbnail';
import { parseMediaIdFromImageUrl, profilePhotoPreviewUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

function formatBasicsLocation(basics: NonNullable<Resume['basics']>): string {
  const parts = [
    basics.location?.city,
    basics.location?.region,
    basics.location?.postalCode,
    basics.location?.countryCode,
  ].filter(Boolean);
  return parts.join(', ');
}

function buildBasicsContactSegments(basics: NonNullable<Resume['basics']>): React.ReactNode[] {
  const segments: React.ReactNode[] = [];

  if (basics.email) {
    segments.push(
      <ContactLineSegment key="email" type="email">
        {basics.email}
      </ContactLineSegment>,
    );
  }
  if (basics.phone) {
    segments.push(
      <ContactLineSegment key="phone" type="phone">
        {basics.phone}
      </ContactLineSegment>,
    );
  }
  if (basics.url) {
    segments.push(
      <ContactLineSegment key="url" type="url">
        <ExternalLink href={basics.url} showIcon={false} />
      </ContactLineSegment>,
    );
  }

  const location = formatBasicsLocation(basics);
  if (location) {
    segments.push(
      <ContactLineSegment key="location" type="location">
        {location}
      </ContactLineSegment>,
    );
  }
  if (basics.location?.address) {
    segments.push(
      <ContactLineSegment key="address" type="location">
        {basics.location.address}
      </ContactLineSegment>,
    );
  }

  return segments;
}

function buildProfileContactSegments(profiles: ResumeProfile[]): React.ReactNode[] {
  return profiles
    .filter((profile) => isProfileVisible(profile))
    .map((profile, index) => {
      const href = resolveProfileUrl(profile);
      const label = profile.username?.trim() || profile.network || 'Profile';
      const key = `${profile.network ?? 'profile'}-${index}`;

      return (
        <ContactLineSegment key={key}>
          <SocialNetworkIcon network={profile.network} />
          {href ? (
            <ExternalLink href={href} showIcon={false}>
              {label}
            </ExternalLink>
          ) : (
            label
          )}
        </ContactLineSegment>
      );
    });
}

function resolveBasicsImage(basics: NonNullable<Resume['basics']>): string | undefined {
  const image = typeof basics.image === 'string' ? basics.image.trim() : '';
  return image || undefined;
}

interface BasicsSectionViewProps {
  basics: NonNullable<Resume['basics']>;
  profiles?: ResumeProfile[];
  showImage?: boolean;
  className?: string;
}

export function BasicsSectionView({
  basics,
  profiles = [],
  showImage = true,
  className,
}: BasicsSectionViewProps) {
  const imageUrl = resolveBasicsImage(basics);
  const photoSrc = imageUrl ? profilePhotoPreviewUrl(imageUrl) : undefined;
  const isOwnedMedia = !!parseMediaIdFromImageUrl(imageUrl);
  const contactSegments = [
    ...buildBasicsContactSegments(basics),
    ...buildProfileContactSegments(profiles),
  ];

  return (
    <article className={cn('surface-soft text-card-foreground space-y-3 p-4', className)}>
      <div className={cn('flex gap-4', !showImage && 'gap-0')}>
        {showImage ? (
          <ProfilePhotoThumbnail
            src={photoSrc}
            isOwnedMedia={isOwnedMedia}
            readOnly
            onUpload={() => {}}
            onDelete={() => {}}
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xl font-semibold">{basics.name || 'Untitled'}</div>
          {basics.label ? (
            <div className="text-muted-foreground font-normal">{basics.label}</div>
          ) : null}
          {contactSegments.length > 0 ? (
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-normal">
              {contactSegments.map((segment, index) => (
                <span key={`contact-${index}`} className="inline-flex items-center">
                  {index > 0 ? (
                    <span className="text-muted-foreground/60 me-3" aria-hidden="true">
                      •
                    </span>
                  ) : null}
                  {segment}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
      {basics.summary ? <MarkdownView value={basics.summary} variant="block" /> : null}
    </article>
  );
}
