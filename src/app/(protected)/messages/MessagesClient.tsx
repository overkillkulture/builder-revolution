'use client';
import { apiUrl } from '@/lib/apiUrl';

import { useCallback, useEffect, useRef, useState } from 'react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import {
  MainContainer,
  Sidebar,
  ConversationList,
  Conversation,
  Avatar,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  ConversationHeader,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';
import { VideoRoomButton } from '@/components/VideoRoom';
import { useToast } from '@/hooks/useToast';

interface UserSummary {
  id: string;
  name: string;
  username: string;
  profilePhoto: string | null;
}

interface ConversationData {
  id: number;
  name: string;
  type: string;
  members: UserSummary[];
  lastMessage: {
    content: string;
    senderName: string;
    createdAt: string;
  } | null;
  hasUnread: boolean;
}

interface MessageData {
  id: number;
  content: string;
  createdAt: string;
  senderId: string;
  sender: UserSummary;
}

interface RoomData {
  id: number;
  name: string;
  description: string | null;
  type: string;
  members: (UserSummary & { role: string })[];
  memberCount: number;
  myRole: string;
  lastMessage: {
    content: string;
    senderName: string;
    createdAt: string;
  } | null;
  hasUnread: boolean;
}

interface ChannelData {
  id: number;
  name: string;
  description: string | null;
  type: string;
  memberCount: number;
  messageCount: number;
  // S482: the API pins exactly one channel as the town square (busiest human
  // channel) and always returns it, so arrival can reliably land there.
  isTownSquare?: boolean;
  lastMessage: {
    content: string;
    senderName: string;
    createdAt: string;
  } | null;
}

interface MemberData {
  id: string;
  name: string;
  username: string;
  profilePhoto: string | null;
  role: string;
  active: boolean;
}

export function MessagesClient({ userId, embedded = false }: { userId: string; embedded?: boolean }) {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [activeType, setActiveType] = useState<'dm' | 'room' | 'channel'>('dm');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const autoSelectedRef = useRef(false);
  const { showToast } = useToast();

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const [convRes, roomRes, channelRes] = await Promise.all([
        fetch(apiUrl('/api/conversations')),
        fetch(apiUrl('/api/rooms')),
        fetch(apiUrl('/api/channels')),
      ]);
      if (convRes.ok) {
        const data = await convRes.json();
        setConversations(data);
      }
      if (roomRes.ok) {
        const data = await roomRes.json();
        setRooms(data);
      }
      if (channelRes.ok) {
        const data = await channelRes.json();
        setChannels(data);
      }
    } catch (e) {
      console.error('Failed to load conversations', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRoom = useCallback(async () => {
    if (!newRoomName.trim()) return;
    try {
      const res = await fetch(apiUrl('/api/rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName, description: newRoomDesc }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewRoomName('');
        setNewRoomDesc('');
        setShowCreateRoom(false);
        await loadConversations();
        setActiveConv(data.id);
        setActiveType('room');
      }
    } catch (e) {
      console.error('Failed to create room', e);
    }
  }, [newRoomName, newRoomDesc, loadConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: number) => {
    try {
      const res = await fetch(apiUrl(`/api/conversations/${convId}/messages`));
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  }, []);

  // Load the roster for the Members column (WO-view-03 Phase 2). Public channels
  // return the whole town-square roster; private rooms/DMs return theirs (or []
  // on 403). Silent-empty on failure so it never breaks the chat pane.
  const loadMembers = useCallback(async (convId: number) => {
    try {
      const res = await fetch(apiUrl(`/api/conversations/${convId}/members`));
      setMembers(res.ok ? await res.json() : []);
    } catch (e) {
      setMembers([]);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-select the most recently active conversation on first load so the user
  // lands in a live chat with a visible composer — not the empty "Select a
  // conversation" void (MC-09/MC-10). Prefer whatever has the newest message;
  // fall back to the first room/conversation. Runs once (autoSelectedRef).
  useEffect(() => {
    if (autoSelectedRef.current || loading || activeConv !== null) return;
    // Honor ?c=<id> from a "Message <user>" click — open THAT conversation
    // instead of the General auto-select (was: click Message -> dumped in General).
    const targetId = typeof window !== 'undefined' ? Number(new URLSearchParams(window.location.search).get('c')) : NaN;
    if (targetId && !Number.isNaN(targetId)) {
      const inConv = conversations.find((c) => c.id === targetId);
      const inRoom = rooms.find((r) => r.id === targetId);
      const inChan = channels.find((ch) => ch.id === targetId);
      if (inConv || inRoom || inChan) {
        autoSelectedRef.current = true;
        setActiveConv(targetId);
        setActiveType(inConv ? 'dm' : inRoom ? 'room' : 'channel');
        return;
      }
    }
    // Prefer landing in the pinned town-square channel so everyone arrives in the
    // same team room (MC-26). S482: trust the API's `isTownSquare` flag (busiest
    // channel, always returned even when quiet) instead of matching the name
    // "general" — the seeded room was "Builders Lounge", so the name match never
    // fired and a quiet room dropped users onto the empty lane-menu. Name match
    // kept as a legacy fallback.
    const townSquare =
      channels.find((ch) => ch.isTownSquare) ||
      channels.find((ch) => /^#?\s*general$/i.test(ch.name));
    if (townSquare) {
      autoSelectedRef.current = true;
      setActiveConv(townSquare.id);
      setActiveType('channel');
      return;
    }
    const candidates = [
      ...channels.map((ch) => ({ id: ch.id, type: 'channel' as const, at: ch.lastMessage?.createdAt })),
      ...rooms.map((r) => ({ id: r.id, type: 'room' as const, at: r.lastMessage?.createdAt })),
      ...conversations.map((c) => ({ id: c.id, type: 'dm' as const, at: c.lastMessage?.createdAt })),
    ];
    if (candidates.length === 0) return;
    const withMessages = candidates
      .filter((c) => c.at)
      .sort((a, b) => (a.at! < b.at! ? 1 : -1));
    const pick = withMessages[0] || candidates[0];
    autoSelectedRef.current = true;
    setActiveConv(pick.id);
    setActiveType(pick.type);
  }, [loading, activeConv, rooms, conversations, channels]);

  // Poll for new messages when a conversation is active
  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv);
      loadMembers(activeConv);
      pollRef.current = setInterval(() => {
        loadMessages(activeConv);
        loadConversations();
        loadMembers(activeConv);
      }, 3000);
    } else {
      setMembers([]);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConv, loadMessages, loadConversations, loadMembers]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeConv || !text.trim()) return;

      // Optimistic update (tempId lets us roll it back if the send fails)
      const tempId = Date.now();
      const optimistic: MessageData = {
        id: tempId,
        content: text,
        createdAt: new Date().toISOString(),
        senderId: userId,
        sender: { id: userId, name: 'You', username: '', profilePhoto: null },
      };
      setMessages((prev) => [...prev, optimistic]);

      const fail = (msg: string) => {
        // Remove the optimistic bubble so the user isn't shown a message that
        // didn't send (it used to linger, then vanish on the next 3s poll with
        // no error). Surface why (S446).
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        showToast({ title: 'Message not sent', message: msg, type: 'error' });
      };

      try {
        const res = await fetch(apiUrl(`/api/conversations/${activeConv}/messages`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        });
        if (res.ok) {
          loadMessages(activeConv);
        } else if (res.status === 401) {
          fail('Please sign in again.');
        } else if (res.status === 403) {
          fail("You can't post to this conversation.");
        } else {
          fail('Something went wrong — try again.');
        }
      } catch (e) {
        console.error('Failed to send message', e);
        fail('Check your connection and try again.');
      }
    },
    [activeConv, userId, loadMessages, showToast],
  );

  const activeConvData = activeType === 'room'
    ? rooms.find((r) => r.id === activeConv)
    : activeType === 'channel'
      ? channels.find((ch) => ch.id === activeConv)
      : conversations.find((c) => c.id === activeConv);

  // /api/conversations returns every conversation the user belongs to — after
  // channel auto-join that includes CHANNELs/ROOMs, which have their own
  // sidebar sections. Keep the DM list to true 1:1s and groups only.
  const dms = conversations.filter((c) => c.type !== 'CHANNEL' && c.type !== 'ROOM');

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className={embedded ? '' : 'px-4 pt-4'}>
      {!embedded && <h1 className="mb-4 text-4xl font-bold">Messages</h1>}
      <div
        // On phones (chatscope responsive) the sidebar is CSS-hidden while a
        // conversation is open. cs-view-list / cs-view-chat let globals.css show
        // the FULL-WIDTH channel list when nothing is selected (Back arrow sets
        // activeConv=null), so mobile users can still switch channels.
        className={activeConv ? 'cs-view-chat' : 'cs-view-list'}
        style={{
          height: 'calc(100vh - 160px)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 230, 150, 0.15)',
        }}
      >
        {/* responsive: on phones the channel sidebar collapses so the message
            pane gets full width (was squished to ~1 word per line). The Back
            button below returns to the channel list. Desktop (>768px) unchanged. */}
        <MainContainer responsive>
          <Sidebar position="left" style={{ background: '#0e161c', borderRight: '1px solid rgba(0,230,150,0.1)' }}>
            <ConversationList style={{ background: '#0e161c' }}>
              {/* CHANNELS SECTION — the public town square (everyone can read/post) */}
              {channels.length > 0 && (
                <>
                  <div style={{ padding: '10px 16px 4px', fontSize: '0.65rem', color: '#39d98a', letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' as const }}>
                    Channels
                  </div>
                  {channels.map((channel) => (
                    <Conversation
                      key={`channel-${channel.id}`}
                      name={`# ${channel.name}`}
                      info={channel.lastMessage?.content || `${channel.messageCount} messages`}
                      lastActivityTime={
                        channel.lastMessage ? timeAgo(channel.lastMessage.createdAt) : undefined
                      }
                      active={channel.id === activeConv && activeType === 'channel'}
                      onClick={() => { setActiveConv(channel.id); setActiveType('channel'); }}
                      style={{
                        background: channel.id === activeConv && activeType === 'channel' ? 'rgba(57,217,138,0.14)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        borderLeft: '3px solid rgba(57,217,138,0.4)',
                      }}
                    >
                      <Avatar
                        name={channel.name}
                        style={{ background: 'rgba(57,217,138,0.2)', color: '#39d98a' }}
                      />
                    </Conversation>
                  ))}
                </>
              )}

              {/* ROOMS SECTION */}
              {rooms.length > 0 && (
                <>
                  <div style={{ padding: '10px 16px 4px', fontSize: '0.65rem', color: '#2ecc71', letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' as const }}>
                    Private Rooms
                  </div>
                  {rooms.map((room) => (
                    <Conversation
                      key={`room-${room.id}`}
                      name={`# ${room.name}`}
                      info={room.lastMessage?.content || `${room.memberCount} members`}
                      lastActivityTime={
                        room.lastMessage ? timeAgo(room.lastMessage.createdAt) : undefined
                      }
                      unreadCnt={room.hasUnread ? 1 : 0}
                      active={room.id === activeConv && activeType === 'room'}
                      onClick={() => { setActiveConv(room.id); setActiveType('room'); }}
                      style={{
                        background: room.id === activeConv && activeType === 'room' ? 'rgba(46,204,113,0.12)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        borderLeft: '3px solid rgba(46,204,113,0.3)',
                      }}
                    >
                      <Avatar
                        name={room.name}
                        style={{
                          background: 'rgba(46, 204, 113, 0.2)',
                          color: '#2ecc71',
                        }}
                      />
                    </Conversation>
                  ))}
                </>
              )}

              {/* CREATE ROOM BUTTON */}
              <div
                onClick={() => setShowCreateRoom(!showCreateRoom)}
                style={{
                  padding: '8px 16px', fontSize: '0.78rem', color: '#2ecc71',
                  cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  opacity: 0.7,
                }}
              >
                + Create Private Room
              </div>

              {showCreateRoom && (
                <div style={{ padding: '8px 12px', background: 'rgba(46,204,113,0.04)' }}>
                  <input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Room name"
                    style={{
                      width: '100%', padding: '6px 10px', background: '#080c10',
                      border: '1px solid rgba(46,204,113,0.2)', borderRadius: '6px',
                      color: '#e0e0e0', fontSize: '0.82rem', marginBottom: '4px',
                    }}
                  />
                  <input
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="Description (optional)"
                    style={{
                      width: '100%', padding: '6px 10px', background: '#080c10',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                      color: '#e0e0e0', fontSize: '0.78rem', marginBottom: '6px',
                    }}
                  />
                  <button
                    onClick={createRoom}
                    style={{
                      width: '100%', padding: '6px', background: '#2ecc71', color: '#000',
                      border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    Create Room
                  </button>
                </div>
              )}

              {/* DMS SECTION */}
              <div style={{ padding: '10px 16px 4px', fontSize: '0.65rem', color: '#8ca59b', letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' as const }}>
                Direct Messages
              </div>
              {loading ? (
                <Conversation name="Loading..." />
              ) : dms.length === 0 ? (
                <Conversation
                  name="No conversations yet"
                  info="Visit a profile and send a message"
                />
              ) : (
                dms.map((conv) => (
                  <Conversation
                    key={conv.id}
                    name={conv.name}
                    info={conv.lastMessage?.content || 'No messages yet'}
                    lastActivityTime={
                      conv.lastMessage ? timeAgo(conv.lastMessage.createdAt) : undefined
                    }
                    unreadCnt={conv.hasUnread ? 1 : 0}
                    active={conv.id === activeConv && activeType === 'dm'}
                    onClick={() => { setActiveConv(conv.id); setActiveType('dm'); }}
                    style={{
                      background: conv.id === activeConv && activeType === 'dm' ? 'rgba(0,230,150,0.1)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <Avatar
                      name={conv.name}
                      style={{
                        background: 'rgba(156, 39, 176, 0.3)',
                        color: '#c084fc',
                      }}
                    />
                  </Conversation>
                ))
              )}
            </ConversationList>
          </Sidebar>

          {/* chat-ui-kit's ChatContainer only recognizes its slot components
              (ConversationHeader / MessageList / MessageInput) as DIRECT
              children — wrapping them in a Fragment made it render nothing (the
              missing-composer bug, MC-10). Keep them direct + conditional. */}
          <ChatContainer style={{ background: '#080c10' }}>
            {activeConvData && (
              <ConversationHeader style={{ background: '#0e161c', borderBottom: '1px solid rgba(0,230,150,0.1)' }}>
                {/* Back arrow — visible only on mobile (chatscope responsive);
                    returns to the channel list. */}
                <ConversationHeader.Back onClick={() => setActiveConv(null)} />
                <Avatar
                  name={activeConvData.name}
                  style={{
                    background: 'rgba(156, 39, 176, 0.3)',
                    color: '#c084fc',
                  }}
                />
                <ConversationHeader.Content>
                  <span style={{ color: '#dceae6', fontWeight: 600 }}>
                    {activeType !== 'dm' ? `# ${activeConvData.name}` : activeConvData.name}
                  </span>
                  {'memberCount' in activeConvData && (
                    <span style={{ color: '#6a8a7a', fontSize: '0.75rem', display: 'block' }}>
                      {activeConvData.memberCount} member{activeConvData.memberCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </ConversationHeader.Content>
                <ConversationHeader.Actions>
                  <VideoRoomButton
                    roomId={`${activeType}-${activeConv}`}
                    label="Video Call"
                  />
                </ConversationHeader.Actions>
              </ConversationHeader>
            )}

            <MessageList style={{ background: '#080c10' }}>
              {!activeConvData ? (
                <MessageList.Content
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: '#8ca59b',
                    fontSize: '1.1rem',
                    textAlign: 'center',
                    padding: '24px',
                  }}
                >
                  <p style={{ fontSize: '2.5rem', marginBottom: '10px' }}>👋</p>
                  <p style={{ fontWeight: 600, color: '#dceae6', marginBottom: '6px' }}>
                    Welcome — jump into the conversation
                  </p>
                  <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '18px', maxWidth: '340px', lineHeight: 1.5 }}>
                    Pick a channel on the left to see what the team is building, or jump into the town square and post your first message.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      // Land in the pinned town square (S482 isTownSquare flag),
                      // else the first available channel. Was a link to the
                      // /community feed, which is retired (redirects here).
                      const general =
                        channels.find((ch) => ch.isTownSquare) ||
                        channels.find((ch) => /^#?\s*general$/i.test(ch.name)) ||
                        channels[0];
                      if (general) { setActiveConv(general.id); setActiveType('channel'); }
                    }}
                    disabled={channels.length === 0}
                    style={{
                      background: '#2ecc71', color: '#03110a', fontWeight: 700,
                      padding: '10px 20px', borderRadius: '10px', fontSize: '0.9rem',
                      border: 'none', cursor: channels.length === 0 ? 'default' : 'pointer',
                      opacity: channels.length === 0 ? 0.5 : 1,
                    }}
                  >
                    Enter the town square →
                  </button>
                  <p style={{ fontSize: '0.78rem', opacity: 0.45, marginTop: '14px' }}>
                    Or use “+ Create Private Room” on the left to start a group.
                  </p>
                </MessageList.Content>
              ) : messages.length === 0 ? (
                <MessageList.Content
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: '#8ca59b',
                    textAlign: 'center',
                    padding: '20px',
                  }}
                >
                  <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
                    {activeType !== 'dm' ? '🏠' : '💬'}
                  </p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#dceae6', marginBottom: '6px' }}>
                    {activeType !== 'dm'
                      ? `Welcome to # ${activeConvData.name}`
                      : `Chat with ${activeConvData.name}`}
                  </p>
                  <p style={{ fontSize: '0.85rem', opacity: 0.6, maxWidth: '320px', lineHeight: 1.5 }}>
                    {activeType !== 'dm'
                      ? 'This room is ready. Type a message below to get started. Invite other builders to collaborate.'
                      : 'Send a message to start the conversation.'}
                  </p>
                  {'description' in activeConvData && activeConvData.description && (
                    <p style={{ fontSize: '0.8rem', opacity: 0.4, marginTop: '8px', fontStyle: 'italic' }}>
                      {activeConvData.description}
                    </p>
                  )}
                </MessageList.Content>
              ) : null}
              {activeConvData &&
                messages.map((msg) => (
                  <Message
                    key={msg.id}
                    model={{
                      message: msg.content,
                      sentTime: msg.createdAt,
                      sender: msg.sender.name || 'Unknown',
                      direction: msg.senderId === userId ? 'outgoing' : 'incoming',
                      position: 'single',
                    }}
                  >
                    {msg.senderId !== userId && (
                      <Avatar
                        name={msg.sender.name || '?'}
                        style={{
                          background: 'rgba(0, 230, 150, 0.2)',
                          color: '#00e696',
                        }}
                      />
                    )}
                    <Message.Header
                      sender={msg.senderId === userId ? '' : (msg.sender.name || 'Unknown')}
                      sentTime={timeAgo(msg.createdAt)}
                    />
                  </Message>
                ))}
            </MessageList>

            {activeConvData && (
              <MessageInput
                placeholder="Type a message..."
                attachButton={false}
                onSend={sendMessage}
                style={{
                  background: '#0e161c',
                  borderTop: '1px solid rgba(0,230,150,0.1)',
                }}
              />
            )}
          </ChatContainer>

          {/* MEMBERS COLUMN (right) — the third column of the Discord/Slack
              layout (WO-view-03 Phase 2). Shows the active room's roster with an
              honest "active" dot (membership.lastReadAt within 5 min, not fake
              presence). chatscope hides right sidebars on phones automatically. */}
          {activeConvData && members.length > 0 && (
            <Sidebar position="right" style={{ background: '#0e161c', borderLeft: '1px solid rgba(0,230,150,0.1)', minWidth: '210px' }}>
              <div style={{ padding: '14px 16px 6px', fontSize: '0.65rem', color: '#39d98a', letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' as const }}>
                Members — {members.length}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {members.map((m) => (
                  <div
                    key={m.id}
                    title={m.active ? 'Active recently' : 'Member'}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 16px' }}
                  >
                    <span style={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar
                        name={m.name}
                        src={m.profilePhoto || undefined}
                        size="sm"
                        style={{ background: 'rgba(0,230,150,0.18)', color: '#00e696' }}
                      />
                      <span
                        style={{
                          position: 'absolute', bottom: 0, right: 0, width: '9px', height: '9px',
                          borderRadius: '50%', border: '2px solid #0e161c',
                          background: m.active ? '#3ba55d' : '#5b6b64',
                        }}
                      />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', color: m.active ? '#e6f4ee' : '#9db3aa', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.name}
                      </span>
                      {m.role !== 'member' && (
                        <span style={{ color: '#39d98a', fontSize: '0.62rem', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                          {m.role}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Sidebar>
          )}
        </MainContainer>
      </div>
    </div>
  );
}
