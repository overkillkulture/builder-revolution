'use client';

/**
 * CrDock — the ONE HUD 5-door bottom dock, ported to React for Main Chat.
 * ---------------------------------------------------------------------------
 * Canonical source: 100X_DEPLOYMENT/components/cr-frame.js (cr-chrome-v2 A-dock)
 * + DNA/HUD_MERGE_BLUEPRINT.md. This RETIRES Munia's MenuBar (both the mobile
 * bottom bar and the desktop sidebar) so Main Chat wears the same chrome as the
 * rest of the platform. HUD_MERGE law: exactly ONE bar, exactly 5 doors, never
 * a second ability bar.
 *
 *   [＋ ATTACH] [⤴ SHARE] [◉ ARAYA] [🔍 GO] [☰ DRAWER]
 *
 * - ATTACH → open the create-post composer with the file picker (IN-5 import)
 * - SHARE  → native share / copy-link of the current view (OUT-4 share)
 * - ARAYA  → open (or reuse) the in-chat ARAYA DM — the operator (IN-2 voice)
 * - GO     → search + jump (/discover) (OUT-5 route)
 * - DRAWER → everything else: rooms, feed, notifications, messages, profile,
 *            video room, tools, New Post, ← My Cockpit, ← Main Site, Logout
 *
 * The DRAWER carries the persistent "← My Cockpit" door back to
 * https://100xbuilder.io/my/pulse.html so a member is never stuck in chat
 * (WO-guild-door-roundtrip, chat-side half). A second, always-visible copy of
 * that return link lives in the top context header (MobileHeader) for a true
 * one-click return on every breakpoint.
 */

import {
  ActionsPlus,
  Comment,
  GridFeedCards,
  HamburgerMenu,
  LogOutCircle,
  Mail,
  NotificationBell,
  Profile,
  Search,
  ShareBack,
} from '@/svg_components';
import { useSessionUserData } from '@/hooks/useSessionUserData';
import { useNotificationsCountQuery } from '@/hooks/queries/useNotificationsCountQuery';
import { useCreatePostModal } from '@/hooks/useCreatePostModal';
import { useDialogs } from '@/hooks/useDialogs';
import { useToast } from '@/hooks/useToast';
import { apiUrl } from '@/lib/apiUrl';
import { cn } from '@/lib/cn';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { SVGProps, useCallback, useState } from 'react';
import { Badge } from './ui/Badge';
import { VideoRoomButton } from './VideoRoom';

const COCKPIT_URL = 'https://100xbuilder.io/my/pulse.html';
const MAIN_SITE_URL = 'https://100xbuilder.io';
// Canonical seeded ARAYA user — same id used by WorkOrdersRail.openArayaDm.
const ARAYA_USER_ID = 'cmqhkyfrb0001xtb8nh1tytw1';
const isHQ = process.env.NEXT_PUBLIC_INVITE_ONLY === 'true';

const ROOMS = [
  { slug: 'build-guild', label: 'Build Guild', dot: 'bg-primary', color: 'text-primary' },
  { slug: 'case-builder', label: 'Case Builder', dot: 'bg-cyan-400', color: 'text-cyan-400' },
  { slug: 'builder-revolution', label: 'Builder Revolution', dot: 'bg-emerald-400', color: 'text-emerald-400' },
];

const HQ_TOOLS = [
  { emoji: '⚡', label: 'ARAYA', href: 'https://conciousnessrevolution.io/araya-chat.html' },
  { emoji: '🧠', label: 'Case Crunch', href: 'https://conciousnessrevolution.io/guardian/case-crunch.html' },
  { emoji: '📸', label: 'Evidence Snap', href: 'https://conciousnessrevolution.io/guardian/evidence-snap.html' },
  { emoji: '📋', label: 'Case Dashboard', href: 'https://conciousnessrevolution.io/guardian/case-dashboard.html' },
  { emoji: '🔍', label: 'Pattern Library', href: 'https://conciousnessrevolution.io/guardian/patterns-library.html' },
  { emoji: '⚖️', label: 'Court Library', href: 'https://conciousnessrevolution.io/guardian/family-court-library.html' },
  { emoji: '🎵', label: 'Music', href: 'https://conciousnessrevolution.io/music-store.html' },
];

// One dock door (the 4 flanking doors). Thumb-height, big tap target.
function DockDoor({
  Icon,
  label,
  onClick,
  badge,
}: {
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="group relative flex h-16 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 transition-colors hover:bg-primary-accent/20 active:bg-primary-accent/30">
      <div className="relative">
        <Icon className="h-6 w-6 stroke-muted-foreground group-hover:stroke-foreground" />
        {badge !== undefined && badge !== 0 && (
          <div className="absolute right-[-70%] top-[-45%]">
            <Badge>{badge}</Badge>
          </div>
        )}
      </div>
      <span className="text-[0.62rem] font-medium tracking-wide text-muted-foreground group-hover:text-foreground">
        {label}
      </span>
    </button>
  );
}

// A single row in the drawer sheet.
function DrawerRow({
  onClick,
  href,
  external,
  children,
  className,
}: {
  onClick?: () => void;
  href?: string;
  external?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = cn(
    'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary-accent/20',
    className,
  );
  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

function LogInGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrDock() {
  const [user] = useSessionUserData();
  const isLoggedIn = !!user;
  const username = user?.username || 'user-not-found';
  const { data: notificationCount } = useNotificationsCountQuery();
  const { launchCreatePost } = useCreatePostModal();
  const { confirm } = useDialogs();
  const { showToast } = useToast();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);

  // ＋ ATTACH — import a photo/file into a new post (IN-5). Signed-out → login.
  const onAttach = useCallback(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    launchCreatePost({ shouldOpenFileInputOnMount: true });
  }, [isLoggedIn, launchCreatePost, router]);

  // ⤴ SHARE — native share of the current view, fall back to copy-link (OUT-4).
  const onShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : MAIN_SITE_URL;
    const title = typeof document !== 'undefined' ? document.title : 'Main Chat';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showToast({ title: 'Link copied', message: url });
        return;
      }
    } catch {
      /* user dismissed the share sheet, or clipboard was blocked — no-op */
    }
    showToast({ title: 'Share', message: url });
  }, [showToast]);

  // ◉ ARAYA — open (or reuse) the in-chat ARAYA DM (IN-2). Falls back to her
  // profile so the door never dead-ends. Same pattern as WorkOrdersRail.
  const onAraya = useCallback(async () => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/conversations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: ARAYA_USER_ID, type: 'DM' }),
      });
      if (res.ok) {
        const conv = await res.json().catch(() => null);
        router.push(conv?.id ? `/messages?c=${conv.id}` : '/messages');
      } else {
        router.push('/araya');
      }
    } catch {
      router.push('/araya');
    }
  }, [isLoggedIn, router]);

  // 🔍 GO — search + jump (OUT-5).
  const onGo = useCallback(() => {
    router.push('/discover');
  }, [router]);

  const onNewPost = useCallback(() => {
    closeDrawer();
    launchCreatePost({});
  }, [closeDrawer, launchCreatePost]);

  const onLogout = useCallback(() => {
    closeDrawer();
    confirm({
      title: 'Confirm Logout',
      message: 'Do you really wish to logout?',
      onConfirm: () => signOut({ callbackUrl: '/' }),
    });
  }, [closeDrawer, confirm]);

  return (
    <>
      {/* ── THE ONE DOCK — 5 doors, thumb zone, identical on every page ── */}
      <nav
        aria-label="Main dock"
        className="fixed bottom-0 left-0 z-[40] flex w-full items-stretch justify-around border-t border-border/40 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <DockDoor Icon={ActionsPlus} label="Attach" onClick={onAttach} />
        <DockDoor Icon={ShareBack} label="Share" onClick={onShare} />

        {/* ◉ ARAYA — the operator: raised, primary, center of the thumb zone */}
        <button
          type="button"
          aria-label="ARAYA"
          onClick={onAraya}
          className="group relative flex h-16 flex-1 flex-col items-center justify-center gap-0.5">
          <span className="flex h-11 w-11 -translate-y-2 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 ring-4 ring-background transition-transform group-hover:scale-105 group-active:scale-95">
            {/* concentric ◉ mark — the ARAYA operator glyph */}
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <circle cx="12" cy="12" r="9" stroke="rgb(var(--primary-foreground))" strokeWidth="2" />
              <circle cx="12" cy="12" r="3.5" fill="rgb(var(--primary-foreground))" />
            </svg>
          </span>
          <span className="-mt-1 text-[0.62rem] font-semibold tracking-wide text-primary">ARAYA</span>
        </button>

        <DockDoor Icon={Search} label="Go" onClick={onGo} />
        <DockDoor
          Icon={HamburgerMenu}
          label="Menu"
          onClick={openDrawer}
          badge={isLoggedIn ? notificationCount : undefined}
        />
      </nav>

      {/* ── ☰ DRAWER — everything else (the long tail) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[50]" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border/40 bg-background p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:max-h-none md:w-[320px] md:rounded-none md:rounded-l-2xl md:border-l">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border md:hidden" />

            {/* ← My Cockpit — the persistent way home, pinned at the top */}
            <DrawerRow
              href={COCKPIT_URL}
              external
              className="mb-2 border border-primary/40 bg-primary/10 font-semibold text-primary hover:bg-primary/20">
              <span className="text-lg">←</span>
              <span>My Cockpit</span>
              <span className="ml-auto text-[0.6rem] tracking-[0.15em] text-primary/60">PULSE</span>
            </DrawerRow>

            {/* Navigate */}
            <div className="mb-1 px-4 pt-1 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
              Navigate
            </div>
            {isLoggedIn && (
              <DrawerRow href="/main" onClick={closeDrawer}>
                <Comment className="h-5 w-5 stroke-muted-foreground" /> Main
              </DrawerRow>
            )}
            <DrawerRow href="/feed" onClick={closeDrawer}>
              <GridFeedCards className="h-5 w-5 stroke-muted-foreground" /> Feed
            </DrawerRow>
            <DrawerRow href="/discover" onClick={closeDrawer}>
              <Search className="h-5 w-5 stroke-muted-foreground" /> Discover
            </DrawerRow>
            {isLoggedIn && (
              <>
                <DrawerRow href="/messages" onClick={closeDrawer}>
                  <Mail className="h-5 w-5 stroke-muted-foreground" /> Messages
                </DrawerRow>
                <DrawerRow href="/notifications" onClick={closeDrawer}>
                  <NotificationBell className="h-5 w-5 stroke-muted-foreground" /> Notifications
                  {notificationCount ? (
                    <span className="ml-auto">
                      <Badge>{notificationCount}</Badge>
                    </span>
                  ) : null}
                </DrawerRow>
                <DrawerRow href={`/${username}`} onClick={closeDrawer}>
                  <Profile className="h-5 w-5 stroke-muted-foreground" /> My Profile
                </DrawerRow>
              </>
            )}

            {/* Rooms — the three servers */}
            <div className="mb-1 mt-3 px-4 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
              Rooms
            </div>
            {ROOMS.map((room) => (
              <DrawerRow key={room.slug} href={`/community/${room.slug}`} onClick={closeDrawer} className={room.color}>
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${room.dot}`} />
                {room.label}
              </DrawerRow>
            ))}

            {/* Tools */}
            <div className="mb-1 mt-3 px-4 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-emerald-500/60">
              {isHQ ? 'HQ Tools' : 'Tools'}
            </div>
            <div className="px-1">
              <VideoRoomButton
                roomId={isHQ ? 'hq-lobby' : 'build-guild'}
                label="Video Room"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-3 text-sm font-bold text-emerald-400 transition-colors hover:bg-emerald-500/25"
              />
            </div>
            {isHQ &&
              HQ_TOOLS.map((tool) => (
                <DrawerRow
                  key={tool.label}
                  href={tool.href}
                  external
                  className="text-muted-foreground hover:text-emerald-400">
                  <span className="w-5 text-center text-base">{tool.emoji}</span>
                  {tool.label}
                </DrawerRow>
              ))}

            {/* Actions */}
            {isLoggedIn && (
              <button
                type="button"
                onClick={onNewPost}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/80">
                <ActionsPlus className="h-5 w-5 fill-primary-foreground" />
                New Post
              </button>
            )}

            <div className="mt-3 border-t border-border/20 pt-2">
              <DrawerRow href={MAIN_SITE_URL} external className="text-muted-foreground">
                <span className="text-base">←</span> Main Site
              </DrawerRow>
              {!isLoggedIn && (
                <DrawerRow href="/login" onClick={closeDrawer} className="text-primary">
                  <LogInGlyph /> Join / Sign in
                </DrawerRow>
              )}
              {isLoggedIn && (
                <DrawerRow onClick={onLogout} className="text-muted-foreground hover:text-red-400">
                  <LogOutCircle className="h-5 w-5 stroke-current" /> Logout
                </DrawerRow>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
