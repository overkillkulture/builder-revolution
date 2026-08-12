'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * /meet — Public Meeting Room
 * ============================
 * Anyone can join. No account required.
 * Type your name → tap Join → you're in the video call.
 *
 * URL params:
 *   ?room=myroom    → custom room name (default: "lobby")
 *   ?name=Darrick   → pre-fill display name
 */

const DEFAULT_ROOM = 'lobby';
// Public Jitsi Meet server. (The old jitsi.riot.im deployment was retired by Element.)
const JITSI_DOMAIN = 'meet.jit.si';

export default function MeetPage() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get('room') || DEFAULT_ROOM;
  const nameParam = searchParams.get('name') || '';

  const [name, setName] = useState(nameParam);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  const jitsiRoomName = `CaseBuilderHQ_${roomParam.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const handleJoin = useCallback(() => {
    if (!name.trim()) return;
    setJoined(true);
    setLoading(true);
  }, [name]);

  const handleLeave = useCallback(() => {
    if (apiRef.current) {
      try { apiRef.current.dispose(); } catch (_) {}
      apiRef.current = null;
    }
    setJoined(false);
    setLoading(false);
    setError(null);
  }, []);

  const handleCopyInvite = useCallback(async () => {
    try {
      const inviteUrl = new URL('/meet', window.location.origin);
      inviteUrl.searchParams.set('room', roomParam);
      await navigator.clipboard.writeText(inviteUrl.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      return;
    }
  }, [roomParam]);

  // Escape key to leave
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && joined) handleLeave();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [joined, handleLeave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch (_) {}
        apiRef.current = null;
      }
    };
  }, []);

  // Initialize Jitsi when joined
  useEffect(() => {
    if (!joined || !containerRef.current || apiRef.current) return;

    const initJitsi = () => {
      if (!(window as any).JitsiMeetExternalAPI) {
        setError('Video API failed to load. Try refreshing.');
        setLoading(false);
        return;
      }

      try {
        const api = new (window as any).JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: jitsiRoomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            lobby: { enabled: false },
            enableLobbyChat: false,
            hideLobbyButton: true,
            requireDisplayName: false,
            toolbarButtons: [
              'microphone', 'camera', 'desktop', 'fullscreen',
              'chat', 'raisehand', 'tileview', 'hangup',
              'participants-pane', 'toggle-camera',
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            TOOLBAR_ALWAYS_VISIBLE: true,
            MOBILE_APP_PROMO: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
          },
          userInfo: {
            displayName: name.trim(),
          },
        });

        apiRef.current = api;

        api.addEventListener('videoConferenceJoined', () => {
          setLoading(false);
        });

        api.addEventListener('readyToClose', () => {
          handleLeave();
        });

        // Safety timeout
        setTimeout(() => {
          setLoading((prev) => {
            if (prev) setError('Connection is taking too long. Try leaving and rejoining.');
            return false;
          });
        }, 15000);
      } catch (e) {
        setError('Failed to start video. Try refreshing.');
        setLoading(false);
      }
    };

    // Load Jitsi script
    const existingScript = document.getElementById('jitsi-api-script');
    if (existingScript) {
      if ((window as any).JitsiMeetExternalAPI) {
        initJitsi();
      } else {
        existingScript.addEventListener('load', initJitsi);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'jitsi-api-script';
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = initJitsi;
    script.onerror = () => {
      setError('Could not load video service. Check your connection.');
      setLoading(false);
    };
    document.head.appendChild(script);
  }, [joined, jitsiRoomName, name, handleLeave]);

  // ── JOINED STATE: Fullscreen video ──
  if (joined) {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: '#080c10' }}>
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            background: '#0e161c',
            borderBottom: '1px solid rgba(46,204,113,0.2)',
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📹</span>
            <span className="text-sm font-semibold" style={{ color: '#2ecc71' }}>
              Case Builder HQ
            </span>
            <span className="text-xs" style={{ color: '#666' }}>
              #{roomParam}
            </span>
            {loading && !error && (
              <span className="animate-pulse text-xs" style={{ color: '#888' }}>
                Connecting...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyInvite}
              className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-80"
              style={{ background: 'rgba(46,204,113,0.8)' }}
            >
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
            <button
              onClick={handleLeave}
              className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-80"
              style={{ background: 'rgba(231,76,60,0.8)' }}
            >
              Leave
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-lg" style={{ color: '#e74c3c' }}>{error}</p>
            <button
              onClick={handleLeave}
              className="rounded-lg px-6 py-3 text-sm font-semibold text-white"
              style={{ background: '#333' }}
            >
              Go Back
            </button>
          </div>
        )}

        {/* Jitsi container */}
        <div ref={containerRef} className="flex-1" style={{ display: error ? 'none' : 'block' }} />
      </div>
    );
  }

  // ── LOBBY STATE: Name entry ──
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: '#0a0a1a', color: '#e0e0e0' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl"
            style={{
              background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
              boxShadow: '0 8px 32px rgba(46,204,113,0.3)',
            }}
          >
            📹
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>
            Case Builder HQ
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#888' }}>
            Join the meeting — no account required
          </p>
          <p className="mt-1 text-xs" style={{ color: '#555' }}>
            Room: <span style={{ color: '#2ecc71' }}>#{roomParam}</span>
          </p>
        </div>

        {/* Name input */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium" style={{ color: '#888' }}>
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            placeholder="Enter your name to join"
            autoFocus
            className="w-full rounded-xl px-4 py-3 text-base outline-none transition-all focus:ring-2"
            style={{
              background: '#12121a',
              border: '1px solid #333',
              color: '#e0e0e0',
            }}
          />
        </div>

        {/* Join button */}
        <button
          onClick={handleJoin}
          disabled={!name.trim()}
          className="w-full rounded-xl py-3 text-base font-bold text-white transition-all hover:opacity-90 disabled:opacity-30"
          style={{
            background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
            boxShadow: name.trim() ? '0 4px 20px rgba(46,204,113,0.3)' : 'none',
          }}
        >
          Join Meeting
        </button>

        {/* Footer */}
        <p className="mt-6 text-center text-xs" style={{ color: '#444' }}>
          Powered by Jitsi — open source video conferencing
        </p>
      </div>
    </div>
  );
}
