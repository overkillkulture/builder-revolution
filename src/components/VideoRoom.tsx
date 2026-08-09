'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * VideoRoom — Jitsi Meet embedded video conferencing via the public meet.jit.si server.
 * Each room gets a unique Jitsi room name based on the room/conversation ID.
 */

// Public Jitsi Meet server. (The old jitsi.riot.im deployment was retired by Element.)
const JITSI_DOMAIN = 'meet.jit.si';

interface VideoRoomProps {
  roomId: string;
  displayName?: string;
  onClose: () => void;
}

export function VideoRoom({ roomId, displayName, onClose }: VideoRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jitsiRoomName = `CaseBuilderHQ_${roomId.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Escape key always closes
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Cleanup on unmount — always dispose Jitsi
  useEffect(() => {
    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch (_) {}
        apiRef.current = null;
      }
    };
  }, []);

  const initJitsi = useCallback(() => {
    if (!containerRef.current || apiRef.current) return;

    // Check if the API is actually available
    if (!(window as any).JitsiMeetExternalAPI) {
      setError('Video API failed to load. Try refreshing the page.');
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
          startWithAudioMuted: true,
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
          displayName: displayName || 'Builder',
        },
      });

      apiRef.current = api;

      api.addEventListener('videoConferenceJoined', () => {
        setLoading(false);
      });

      api.addEventListener('readyToClose', () => {
        onClose();
      });

      // Safety timeout — if Jitsi never connects after 15s, show error
      setTimeout(() => {
        setLoading((prev) => {
          if (prev) setError('Connection is taking too long. You can leave and try again.');
          return false;
        });
      }, 15000);
    } catch (e) {
      setError('Failed to start video. Try refreshing.');
      setLoading(false);
    }
  }, [jitsiRoomName, displayName, onClose]);

  useEffect(() => {
    const existingScript = document.getElementById('jitsi-api-script');
    if (existingScript) {
      // Script already loaded — check if API is ready
      if ((window as any).JitsiMeetExternalAPI) {
        initJitsi();
      } else {
        // Script tag exists but API not ready yet — wait for it
        existingScript.addEventListener('load', () => initJitsi());
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'jitsi-api-script';
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => initJitsi();
    script.onerror = () => {
      setError('Could not load video service. Check your connection.');
      setLoading(false);
    };
    document.head.appendChild(script);
  }, [initJitsi]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: '#080c10' }}
    >
      {/* Header bar — always visible, always closeable */}
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
          <span className="text-sm font-semibold text-emerald-400">Video Room</span>
          {loading && !error && (
            <span className="animate-pulse text-xs text-gray-400">Connecting...</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors"
          style={{ background: 'rgba(231,76,60,0.8)' }}
        >
          ✕ Leave
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg text-red-400">{error}</p>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-600"
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

/**
 * VideoRoomButton — Drop-in button that launches a VideoRoom overlay.
 */
export function VideoRoomButton({
  roomId,
  displayName,
  className,
  label,
}: {
  roomId: string;
  displayName?: string;
  className?: string;
  label?: string;
}) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowVideo(true)}
        className={className || 'flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-500/25'}
      >
        <span>📹</span>
        <span>{label || 'Video'}</span>
      </button>
      {showVideo && (
        <VideoRoom
          roomId={roomId}
          displayName={displayName}
          onClose={() => setShowVideo(false)}
        />
      )}
    </>
  );
}
