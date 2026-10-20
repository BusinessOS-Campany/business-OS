import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Avatar, TextField, InputAdornment, List, ListItemButton, ListItemAvatar,
  ListItemText, Badge, IconButton, Paper, Divider, Menu, MenuItem, Drawer, Stack,
  useTheme, Chip, alpha, Tooltip, Fade,
} from '@mui/material';
import {
  Search, MoreVert, Send, AttachFile, InsertEmoticon, Close, ArrowBack,
  Share, Bookmark, Delete, FiberManualRecord, ForumOutlined, Circle,
  Done, DoneAll, Videocam, Call, InfoOutlined, Description, Image,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string | null;
  phone: string | null;
}

interface LastMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
}

interface Conversation {
  id: string;
  participants: ChatUser[];
  lastMessage: LastMessage | null;
  unreadCount: number;
  updatedAt: string;
  archivedAt: string | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: ChatUser;
  readAt: string | null;
  attachment?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  contentType?: string | null;
}

const AVATAR_COLORS = ['#405189', '#5b6abf', '#0ab39c', '#f06548', '#f7b84b', '#3577f1', '#6f42c1', '#e83e8c'];

function hashColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return formatTime(dateStr);
  if (diff < 172800000) return 'Yesterday';
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function ChatPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { palette } = useTheme();
  const mode = palette.mode;
  const isDark = mode === 'dark';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [convMenuAnchor, setConvMenuAnchor] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showArchived, setShowArchived] = useState(false);

  const userId = user?.id;

  const fetchConversations = (archived = false) => {
    api.get(`/chat/conversations?archived=${archived}`).then(({ data }) => setConversations(data));
  };

  useEffect(() => {
    fetchConversations(false);
    api.get('/chat/users').then(({ data }) => setUsers(data));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = (conv: Conversation) => {
    setActiveConv(conv);
    setMobileListOpen(false);
    api.get(`/chat/conversations/${conv.id}/messages`).then(({ data }) => setMessages(data));
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeConv) return;
    try {
      const { data } = await api.post('/chat/messages', {
        conversationId: activeConv.id,
        content: inputValue.trim(),
      });
      setMessages(prev => [...prev, data]);
      setInputValue('');
      setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, lastMessage: data } : c));
    } catch { }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data: uploadData } = await api.post('/chat/upload', fd);
      const { data: msg } = await api.post('/chat/messages', {
        conversationId: activeConv.id,
        content: file.name,
        attachment: uploadData.path,
        attachmentName: file.name,
        attachmentSize: file.size,
        contentType: file.type,
      });
      setMessages(prev => [...prev, msg]);
    } catch { }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
  };

  const handleNewChat = async (otherUser: ChatUser) => {
    try {
      const { data: conv } = await api.post('/chat/conversations', { participantIds: [otherUser.id] });
      const mapped: Conversation = {
        id: conv.id,
        participants: conv.participants.map((p: any) => p.user),
        lastMessage: conv.messages?.[0] || null,
        unreadCount: 0,
        updatedAt: conv.updatedAt,
        archivedAt: null,
      };
      setConversations(prev => {
        const exists = prev.find(c => c.id === mapped.id);
        return exists ? prev : [mapped, ...prev];
      });
      setActiveConv(mapped);
      loadMessages(mapped);
    } catch { }
  };

  const otherParticipant = (conv: Conversation) =>
    conv.participants.find(p => p.id !== userId) || conv.participants[0];

  const filteredUsers = users.filter(u =>
    !searchQuery || `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConvs = conversations.filter(c =>
    !searchQuery || `${otherParticipant(c)?.firstName} ${otherParticipant(c)?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeUser = activeConv ? otherParticipant(activeConv) : null;

  const bgColor = isDark ? '#0f0f1a' : '#f5f5f5';
  const cardBg = isDark ? '#1a1a2e' : '#ffffff';
  const chatBg = isDark ? '#12121f' : '#f8f9fa';
  const inputBg = isDark ? '#1e1e32' : '#f0f0f0';
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const selectedBg = isDark ? 'rgba(91,106,191,0.15)' : 'rgba(91,106,191,0.08)';

  const chatList = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: cardBg }}>
      <Box sx={{ p: 2.5, pb: 1.5, borderBottom: `1px solid ${dividerColor}` }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('chat.title')}</Typography>
          <Chip
            icon={<ForumOutlined sx={{ fontSize: 14 }} />}
            label={conversations.length}
            size="small"
            sx={{ fontWeight: 600, fontSize: '0.75rem', borderRadius: '8px', height: 24 }}
          />
        </Stack>
        <TextField
          fullWidth size="small" value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('chat.search')}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
              sx: { borderRadius: '10px', fontSize: '0.85rem', bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
            },
          }}
        />
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 } }}>
        <Box sx={{ display: 'flex', px: 1.5, py: 1, gap: 0.5 }}>
          <Chip label={t('chat.active')} size="small" variant={!showArchived ? 'filled' : 'outlined'} color={!showArchived ? 'primary' : 'default'} onClick={() => { setShowArchived(false); fetchConversations(false); }} sx={{ borderRadius: '8px', fontWeight: 600 }} />
          <Chip label={t('chat.archived')} size="small" variant={showArchived ? 'filled' : 'outlined'} color={showArchived ? 'primary' : 'default'} onClick={() => { setShowArchived(true); fetchConversations(true); }} sx={{ borderRadius: '8px', fontWeight: 600 }} />
        </Box>
        {filteredConvs.length > 0 && (
          <>
            <List dense disablePadding>
              {filteredConvs.map(conv => {
                const other = otherParticipant(conv);
                if (!other) return null;
                const isSelected = activeConv?.id === conv.id;
                return (
                  <ListItemButton
                    key={conv.id}
                    selected={isSelected}
                    onClick={() => loadMessages(conv)}
                    sx={{
                      px: 2.5, py: 1.5, mx: 1, borderRadius: '10px', mb: 0.3,
                      transition: 'all 0.2s ease',
                      '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                      '&.Mui-selected': { bgcolor: selectedBg, '&:hover': { bgcolor: selectedBg } },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 48 }}>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4caf50', border: `2px solid ${cardBg}`, animation: 'pulse 2s infinite' }} />}
                      >
                        <Avatar sx={{ bgcolor: hashColor(other.id), width: 42, height: 42, fontSize: 15, fontWeight: 600 }}>
                          {initials(`${other.firstName} ${other.lastName}`)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${other.firstName} ${other.lastName}`}
                      secondary={conv.lastMessage && conv.lastMessage.content !== '.' ? conv.lastMessage.content : t('chat.noMessages')}
                      slotProps={{
                        primary: { sx: { fontWeight: isSelected ? 700 : 600, fontSize: '0.88rem', lineHeight: 1.3 } },
                        secondary: { sx: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140, fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)', mt: 0.1 } },
                      }}
                    />
                    <Stack sx={{ alignItems: 'flex-end', alignSelf: 'flex-start', mt: 0.3, gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                        {conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ''}
                      </Typography>
                      {conv.unreadCount > 0 && (
                        <Chip label={conv.unreadCount} size="small" color="primary" sx={{ height: 18, minWidth: 18, fontSize: '0.6rem', fontWeight: 700, borderRadius: '50%' }} />
                      )}
                    </Stack>
                  </ListItemButton>
                );
              })}
            </List>
          </>
        )}

        <Divider sx={{ borderColor: dividerColor, my: 0.5, mx: 2 }} />

        <Typography variant="caption" sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontWeight: 600, letterSpacing: 0.3, fontSize: '0.7rem' }}>
          <Circle sx={{ fontSize: 6 }} /> {t('chat.allUsers')}
        </Typography>
        <List dense disablePadding>
          {filteredUsers.slice(0, 10).map(u => (
            <ListItemButton
              key={u.id}
              onClick={() => handleNewChat(u)}
              sx={{ px: 2.5, py: 1, mx: 1, borderRadius: '10px', mb: 0.2, transition: 'all 0.15s ease', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' } }}
            >
              <ListItemAvatar sx={{ minWidth: 44 }}>
                <Avatar sx={{ bgcolor: hashColor(u.id), width: 36, height: 36, fontSize: 13, fontWeight: 600 }}>
                  {initials(`${u.firstName} ${u.lastName}`)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={`${u.firstName} ${u.lastName}`}
                secondary={u.role}
                slotProps={{
                  primary: { sx: { fontSize: '0.83rem', fontWeight: 500 } },
                  secondary: { sx: { fontSize: '0.72rem', textTransform: 'capitalize' } },
                }}
              />
            </ListItemButton>
          ))}
          {filteredUsers.length === 0 && searchQuery && (
            <Typography variant="body2" sx={{ px: 2.5, py: 3, color: 'text.secondary', textAlign: 'center' }}>
              {t('chat.noUsersFound')}
            </Typography>
          )}
        </List>
      </Box>
    </Box>
  );

  const profilePanel = activeUser && (
    <Box sx={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: cardBg, borderLeft: `1px solid ${dividerColor}` }}>
      <Box sx={{ textAlign: 'center', pt: 4, pb: 2, px: 3, background: isDark ? 'linear-gradient(180deg, rgba(91,106,191,0.15) 0%, transparent 100%)' : 'linear-gradient(180deg, rgba(91,106,191,0.06) 0%, transparent 100%)' }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={<Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#4caf50', border: `3px solid ${cardBg}` }} />}
        >
          <Avatar sx={{ width: 72, height: 72, fontSize: 28, bgcolor: hashColor(activeUser.id), fontWeight: 600, mx: 'auto', mb: 1.5, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
            {initials(`${activeUser.firstName} ${activeUser.lastName}`)}
          </Avatar>
        </Badge>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1rem' }}>{activeUser.firstName} {activeUser.lastName}</Typography>
        <Chip label={activeUser.role} size="small" sx={{ mt: 0.5, fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize', borderRadius: '6px', bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.8 }}>
          <FiberManualRecord sx={{ fontSize: 8, color: '#4caf50' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{t('chat.online')}</Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2.5, my: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          <Tooltip title={t('chat.viewProfile')}>
            <IconButton size="small" sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } }}>
              <InfoOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share">
            <IconButton size="small" sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } }}>
              <Share fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Bookmark">
            <IconButton size="small" sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } }}>
              <Bookmark fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('chat.delete')}>
            <IconButton size="small" sx={{ bgcolor: isDark ? 'rgba(240,101,72,0.1)' : 'rgba(240,101,72,0.08)', color: '#f06548', '&:hover': { bgcolor: isDark ? 'rgba(240,101,72,0.2)' : 'rgba(240,101,72,0.15)' } }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: dividerColor }} />

      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Circle sx={{ fontSize: 6 }} /> {t('chat.personalDetails')}
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: '8px', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: alpha(palette.primary.main, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1.2 }}>{t('chat.phone')}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>{activeUser.phone || '-'}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: '8px', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: alpha(palette.primary.main, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1.2 }}>{t('chat.email')}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>{activeUser.email || '-'}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderRadius: '8px', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: alpha(palette.primary.main, 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1.2 }}>{t('chat.location')}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.82rem' }}>-</Typography>
            </Box>
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: dividerColor }} />

      <Box sx={{ px: 2.5, py: 2, flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Circle sx={{ fontSize: 6 }} /> {t('chat.attachedFiles')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 3, opacity: 0.5 }}>
          <AttachFile sx={{ fontSize: 28, color: 'text.disabled', transform: 'rotate(45deg)', mb: 1 }} />
          <Typography variant="caption" color="text.disabled">{t('chat.noFiles')}</Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: 'calc(100vh - 110px)', display: 'flex', gap: 0, bgcolor: bgColor, borderRadius: 2, overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <Paper sx={{ width: 330, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', borderRadius: 0, overflow: 'hidden', border: 'none', boxShadow: 'none', borderRight: `1px solid ${dividerColor}`, bgcolor: cardBg }}>
        {chatList}
      </Paper>

      <Drawer open={mobileListOpen} onClose={() => setMobileListOpen(false)} sx={{ display: { md: 'none' } }}>
        <Box sx={{ width: 310, height: '100%' }}>{chatList}</Box>
      </Drawer>

      {activeConv ? (
        <Fade in timeout={300}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${dividerColor}`, bgcolor: cardBg }}>
              <IconButton sx={{ display: { md: 'none' }, mr: 1, color: 'text.secondary' }} onClick={() => setMobileListOpen(true)}>
                <ArrowBack fontSize="small" />
              </IconButton>
              <Avatar sx={{ bgcolor: activeUser ? hashColor(activeUser.id) : 'primary.main', width: 40, height: 40, fontSize: 15, fontWeight: 600, mr: 1.5 }}>
                {activeUser ? initials(`${activeUser.firstName} ${activeUser.lastName}`) : '?'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '0.9rem' }}>
                  {activeUser ? `${activeUser.firstName} ${activeUser.lastName}` : ''}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <FiberManualRecord sx={{ fontSize: 7, color: '#4caf50' }} />
                  <Typography variant="caption" sx={{ color: '#4caf50', fontSize: '0.7rem' }}>{t('chat.online')}</Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={0.3}>
                <Tooltip title="Voice Call">
                  <IconButton size="small" sx={{ color: 'text.secondary' }}><Call fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="Video Call">
                  <IconButton size="small" sx={{ color: 'text.secondary' }}><Videocam fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="More">
                  <IconButton size="small" onClick={e => setConvMenuAnchor(e.currentTarget)} sx={{ color: 'text.secondary' }}>
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Menu
                anchorEl={convMenuAnchor}
                open={!!convMenuAnchor}
                onClose={() => setConvMenuAnchor(null)}
                slotProps={{ paper: { sx: { minWidth: 160, borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' } } }}
              >
                <MenuItem onClick={() => { setConvMenuAnchor(null); setProfileOpen(true); }} sx={{ gap: 1.5, py: 1 }}>
                  <InfoOutlined fontSize="small" /> {t('chat.viewProfile')}
                </MenuItem>
                {activeConv?.archivedAt ? (
                  <MenuItem onClick={async () => { setConvMenuAnchor(null); if (activeConv) { await api.patch(`/chat/conversations/${activeConv.id}/unarchive`); fetchConversations(showArchived); } }} sx={{ gap: 1.5, py: 1 }}>
                    <ArchiveIcon /> {t('chat.unarchive')}
                  </MenuItem>
                ) : (
                  <MenuItem onClick={async () => { setConvMenuAnchor(null); if (activeConv) { await api.patch(`/chat/conversations/${activeConv.id}/archive`); fetchConversations(showArchived); } }} sx={{ gap: 1.5, py: 1 }}>
                    <ArchiveIcon /> {t('chat.archive')}
                  </MenuItem>
                )}
                <MenuItem onClick={() => setConvMenuAnchor(null)} sx={{ gap: 1.5, py: 1 }}>
                  <MuteIcon /> {t('chat.muted')}
                </MenuItem>
                <Divider sx={{ borderColor: dividerColor }} />
                <MenuItem onClick={() => setConvMenuAnchor(null)} sx={{ gap: 1.5, py: 1, color: '#f06548' }}>
                  <Delete fontSize="small" /> {t('chat.delete')}
                </MenuItem>
              </Menu>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: chatBg, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 } }}>
              {messages.length === 0 || (messages.length === 1 && messages[0].content === '.') ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 1, opacity: 0.5 }}>
                  <ForumOutlined sx={{ fontSize: 48, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.disabled">{t('chat.noMessages')}</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ maxWidth: 240, textAlign: 'center' }}>
                    {t('chat.selectConversationHint')}
                  </Typography>
                </Box>
              ) : (
                messages.filter(m => m.content !== '.').map((msg, idx) => {
                  const isMine = msg.senderId === userId;
                  const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
                  const isLast = idx === messages.filter(m => m.content !== '.').length - 1;
                  return (
                    <Box
                      key={msg.id}
                      sx={{
                        display: 'flex', mb: isLast ? 0 : 1.5,
                        flexDirection: isMine ? 'row-reverse' : 'row',
                        gap: 1.2, alignItems: 'flex-end',
                        animation: 'fadeIn 0.2s ease',
                      }}
                    >
                      {!isMine && (
                        <Avatar sx={{ width: 30, height: 30, fontSize: 11, bgcolor: hashColor(msg.sender.id), fontWeight: 600, opacity: showAvatar ? 1 : 0, transition: 'opacity 0.2s' }}>
                          {showAvatar ? initials(`${msg.sender.firstName} ${msg.sender.lastName}`) : ''}
                        </Avatar>
                      )}
                      <Box sx={{ maxWidth: '65%' }}>
                        <Paper elevation={0} sx={{
                          px: 2, py: 1.2, borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          bgcolor: isMine ? 'primary.main' : cardBg,
                          color: isMine ? '#fff' : 'text.primary',
                          boxShadow: isMine
                            ? '0 2px 8px rgba(91,106,191,0.25)'
                            : `0 1px 4px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)'}`,
                          border: isMine ? 'none' : `1px solid ${dividerColor}`,
                          position: 'relative',
                          transition: 'transform 0.1s ease',
                          '&:hover': { transform: 'scale(1.01)' },
                        }}>
                          {msg.attachment && (
                            <Box
                              component="a"
                              href={`http://localhost:3000${msg.attachment}`}
                              target="_blank"
                              sx={{
                                display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1,
                                borderRadius: '8px', textDecoration: 'none',
                                bgcolor: isMine ? 'rgba(255,255,255,0.15)' : alpha(palette.primary.main, 0.06),
                                color: isMine ? '#fff' : 'text.primary',
                              }}
                            >
                              {msg.contentType?.startsWith('image/')
                                ? <Image sx={{ fontSize: 20 }} />
                                : <Description sx={{ fontSize: 20 }} />
                              }
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {msg.attachmentName}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                                  {msg.attachmentSize ? `${(msg.attachmentSize / 1024).toFixed(1)} KB` : ''}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.5, fontSize: '0.88rem' }}>
                            {msg.content}
                          </Typography>
                        </Paper>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3, px: 0.5, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.62rem' }}>
                            {formatTime(msg.createdAt)}
                          </Typography>
                          {isMine && (
                            <Tooltip title={msg.readAt ? 'Read' : 'Delivered'}>
                              {msg.readAt
                                ? <DoneAll sx={{ fontSize: 12, color: alpha(palette.primary.main, 0.6) }} />
                                : <Done sx={{ fontSize: 12, color: 'text.disabled' }} />
                              }
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${dividerColor}`, bgcolor: cardBg }}>
              <Paper elevation={0} sx={{
                display: 'flex', alignItems: 'flex-end', gap: 0.5,
                bgcolor: inputBg, px: 1, py: 0.3, borderRadius: '24px',
                border: `1px solid ${dividerColor}`,
                transition: 'border-color 0.2s',
                '&:focus-within': { borderColor: 'primary.main' },
              }}>
                <Tooltip title="Emoji">
                  <IconButton size="small" sx={{ color: 'text.secondary', mb: 0.3 }}>
                    <InsertEmoticon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden />
                <Tooltip title="Attach">
                  <IconButton size="small" sx={{ color: 'text.secondary', mb: 0.3 }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <AttachFile sx={{ fontSize: 20, transform: 'rotate(45deg)' }} />
                  </IconButton>
                </Tooltip>
                <TextField
                  fullWidth
                  multiline
                  maxRows={3}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('chat.inputPlaceholder')}
                  variant="standard"
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      sx: { fontSize: '0.88rem', py: 0.8, px: 0.5 },
                    },
                  }}
                  sx={{ '& .MuiInputBase-root': { bgcolor: 'transparent !important' } }}
                />
                <Tooltip title="Send">
                  <span>
                    <IconButton
                      color="primary"
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                      sx={{
                        bgcolor: inputValue.trim() ? 'primary.main' : 'transparent',
                        color: inputValue.trim() ? '#fff' : 'text.disabled',
                        borderRadius: '50%', width: 36, height: 36,
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: inputValue.trim() ? 'primary.dark' : 'transparent' },
                        '&.Mui-disabled': { bgcolor: 'transparent' },
                        mb: 0.3,
                      }}
                    >
                      <Send sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Paper>
            </Box>
          </Box>
        </Fade>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1.5, bgcolor: chatBg }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '50%',
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ForumOutlined sx={{ fontSize: 36, color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }}>
            {t('chat.selectConversation')}
          </Typography>
          <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)', maxWidth: 280, textAlign: 'center' }}>
            {t('chat.selectConversationHint')}
          </Typography>
        </Box>
      )}

      {profileOpen && activeUser && (
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          {profilePanel}
        </Box>
      )}

      <Drawer open={profileOpen && !!activeUser} onClose={() => setProfileOpen(false)} anchor="right" sx={{ display: { md: 'none' } }}>
        <Box sx={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: cardBg }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, borderBottom: `1px solid ${dividerColor}` }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{t('chat.personalDetails')}</Typography>
            <IconButton size="small" onClick={() => setProfileOpen(false)}><Close fontSize="small" /></IconButton>
          </Box>
          {profilePanel}
        </Box>
      </Drawer>
    </Box>
  );
}

function ArchiveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

function MuteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
