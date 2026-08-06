'use client';

import { ActionsPlus, Feather, GridFeedCards, LogInSquare, LogOutCircle, Mail, NotificationBell, Profile, Search } from '@/svg_components';
import { useSessionUserData } from '@/hooks/useSessionUserData';
import { useNotificationsCountQuery } from '@/hooks/queries/useNotificationsCountQuery';
import { useCreatePostModal } from '@/hooks/useCreatePostModal';
import Link from 'next/link';
import { useCallback } from 'react';
import { LogoText } from './LogoText';
import { MenuBarItem } from './MenuBarItem';
import { VideoRoomButton } from './VideoRoom';

export function MenuBar() {
  const [user] = useSessionUserData();
  const isLoggedIn = !!user;
  const username = user?.username || 'user-not-found';
  const { data: notificationCount } = useNotificationsCountQuery();
  const { launchCreatePost } = useCreatePostModal();

  const handleNewPost = useCallback(() => {
    launchCreatePost({});
  }, [launchCreatePost]);

  // Mobile bottom bar: always exactly 5 items
  const mobileItems = isLoggedIn
    ? [
        { title: 'Feed', Icon: GridFeedCards, route: '/feed' },
        { title: 'Discover', Icon: Search, route: '/discover' },
        { title: 'Messages', Icon: Mail, route: '/messages' },
        { title: 'Notifications', Icon: NotificationBell, route: '/notifications', badge: notificationCount },
        { title: 'Profile', Icon: Profile, route: `/${username}` },
      ]
    : [
        { title: 'Feed', Icon: GridFeedCards, route: '/feed' },
        { title: 'Discover', Icon: Search, route: '/discover' },
        { title: 'Join', Icon: LogInSquare, route: '/login' },
      ];

  // Desktop sidebar: full menu
  const desktopItems = [
    { title: 'Feed', Icon: GridFeedCards, route: '/feed' },
    { title: 'Discover', Icon: Search, route: '/discover' },
    ...(isLoggedIn
      ? [
          { title: 'Messages', Icon: Mail, route: '/messages' },
          { title: 'Notifications', Icon: NotificationBell, route: '/notifications', badge: notificationCount },
          { title: 'My Profile', Icon: Profile, route: `/${username}` },
          { title: 'Logout', Icon: LogOutCircle, route: '/api/auth/signout' },
        ]
      : [
          { title: 'Join', Icon: LogInSquare, route: '/login' },
        ]),
  ];

  return (
    <>
      {/* Mobile bottom bar — 5 icons, always visible */}
      <div className="fixed bottom-0 z-[2] flex w-full border-t border-border/30 bg-background/80 backdrop-blur-md md:hidden">
        {mobileItems.map((item) => (
          <MenuBarItem key={item.title} {...item}>
            {item.title}
          </MenuBarItem>
        ))}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-[200px] md:flex-shrink-0 md:flex-col md:items-start md:overflow-y-auto md:border-r md:border-border/20 md:p-3">
        <Link href="/feed" title="Home" className="mb-1 flex items-center gap-2">
          <Feather className="h-8 w-8 stroke-primary" />
          <LogoText className="text-xl" />
        </Link>
        <div className="mb-2 px-1 text-[0.5rem] font-medium tracking-[0.2em] text-muted-foreground/30">
          CASE BUILDER HQ
        </div>
        {desktopItems.map((item) => (
          <MenuBarItem key={item.title} {...item}>
            {item.title}
          </MenuBarItem>
        ))}
        {isLoggedIn && (
          <button
            type="button"
            onClick={handleNewPost}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
          >
            <ActionsPlus className="h-5 w-5 fill-primary-foreground" />
            New Post
          </button>
        )}

        {/* HQ TOOLS — Case Builder Toolkit */}
        <div className="mt-4 w-full overflow-y-auto border-t border-border/20 pt-3" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <div className="mb-2 px-4 text-[0.6rem] font-bold uppercase tracking-[0.15em] text-emerald-500/60">
            HQ Tools
          </div>
          <div className="mb-2 px-4">
            <VideoRoomButton
              roomId="hq-lobby"
              label="Video Room"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-400 transition-colors hover:bg-emerald-500/25"
            />
          </div>
          {[
            { emoji: '⚡', label: 'ARAYA', href: 'https://conciousnessrevolution.io/araya-chat.html', live: true },
            { emoji: '🧠', label: 'Case Crunch', href: 'https://conciousnessrevolution.io/guardian/case-crunch.html', live: true },
            { emoji: '📸', label: 'Evidence Snap', href: 'https://conciousnessrevolution.io/guardian/evidence-snap.html', live: true },
            { emoji: '📋', label: 'Case Dashboard', href: 'https://conciousnessrevolution.io/guardian/case-dashboard.html', live: true },
            { emoji: '🔍', label: 'Pattern Library', href: 'https://conciousnessrevolution.io/guardian/patterns-library.html', live: true },
            { emoji: '⚖️', label: 'Court Library', href: 'https://conciousnessrevolution.io/guardian/family-court-library.html', live: true },
            { emoji: '📁', label: 'Filing Library', href: 'https://conciousnessrevolution.io/guardian/family-court-library.html', live: true },
            { emoji: '🎵', label: 'Music', href: 'https://conciousnessrevolution.io/music-store.html', live: true },
          ].map((tool) => (
            <a
              key={tool.label}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-4 py-1.5 text-sm text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-400"
            >
              <span className="w-5 text-center text-base">{tool.emoji}</span>
              <span>{tool.label}</span>
            </a>
          ))}

          {/* COMING SOON — compact row */}
          <div className="mt-2 border-t border-border/10 px-4 pt-2">
            <div className="mb-1.5 text-[0.55rem] font-bold uppercase tracking-[0.15em] text-muted-foreground/30">
              Coming Soon
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Room Files', 'Actor Map', 'Playbook', 'BYOK AI'].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-border/20 px-2 py-0.5 text-[0.6rem] text-muted-foreground/25"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <a
          href="https://conciousnessrevolution.io"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex flex-col rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary-accent/30 hover:text-foreground"
        >
          <span className="text-[0.5rem] tracking-[0.15em] text-muted-foreground/30">CONSCIOUSNESS REVOLUTION</span>
          <span>← Main Site</span>
        </a>
      </div>

      {/* Mobile: Floating action button for new post */}
      {isLoggedIn && (
        <button
          type="button"
          onClick={handleNewPost}
          className="fixed bottom-16 right-4 z-[3] flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 transition-transform active:scale-90 md:hidden"
          aria-label="New Post"
        >
          <ActionsPlus className="h-7 w-7 fill-primary-foreground" />
        </button>
      )}
    </>
  );
}
