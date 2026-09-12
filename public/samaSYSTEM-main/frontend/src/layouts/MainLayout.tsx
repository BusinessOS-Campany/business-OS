import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, AppBar, Toolbar, Typography, IconButton, Avatar,
  Menu, MenuItem, Divider, Badge, Chip, Collapse, InputBase, Paper, ClickAwayListener, Popper, Fade,
  Dialog, Stack,
} from '@mui/material';
import {
  Menu as MenuIcon, ChevronLeft, Dashboard,
  Logout, DarkMode, LightMode,
  NotificationsNone, Mail, Warning, Fullscreen, FullscreenExit,
  ExpandMore, ExpandLess, FiberManualRecord, Search as SearchIcon,
  Person, EventNote, CalendarMonth, HelpOutlined, Lock, Message, Payments, Receipt, People, Assessment, MedicalServices, AccountBalanceWallet,
  Notifications, Language,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useLanguage, LANGUAGES } from '../contexts/LanguageContext';
import { useLayout, SIDEBAR_IMAGES } from '../contexts/LayoutContext';
import LayoutSwitcher from '../components/LayoutSwitcher';
import Preloader from '../components/Preloader';
import LockScreen from '../features/auth/LockScreen';
import api from '../services/api';

interface NotifItem {
  id: string;
  type: string;
  data: string | null;
  createdAt: string;
  readAt: string | null;
}

interface SubMenuItem { text: string; path: string; permission?: string }
interface MenuItem { text: string; icon: React.ReactNode; path?: string; permission?: string; children?: SubMenuItem[] }

const SIDEBAR_BG: Record<string, string> = {
  light: '#f5f5f5',
  dark: '#1e1e2e',
  gradient: 'linear-gradient(180deg, #1e1e2e 0%, #2d1b69 100%)',
};

export default function MainLayout() {
  const { user, logout, lock, isLocked } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const { locale, dir, setLanguage, t } = useLanguage();
  const { config, toggleSidebar, sidebarWidth } = useLayout();
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  const [notifTab, setNotifTab] = useState<'all' | 'messages' | 'alerts'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreloader, setShowPreloader] = useState(config.preloader);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoverItem, setHoverItem] = useState<string | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotifs = useCallback(() => {
    api.get('/notifications').then(({ data }) => {
      setNotifications(data.notifications);
      setNotifUnread(data.unread);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    const keepAlive = setInterval(() => { api.get('/health').catch(() => {}); }, 60000);
    return () => { clearInterval(interval); clearInterval(keepAlive); };
  }, [fetchNotifs]);

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('notification.time.now');
    if (mins < 60) return t('notification.time.min', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('notification.time.hour', { count: hours });
    const days = Math.floor(hours / 24);
    return t('notification.time.day', { count: days });
  };

  const notificationIcon = (type: string) => {
    if (type.includes('expense')) return <Warning fontSize="small" />;
    return <Mail fontSize="small" />;
  };

  const notificationColor = (type: string) => {
    if (type.includes('expense')) return 'warning.main';
    return 'primary.main';
  };

  const parseData = (raw: string | null) => {
    try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  };

  const filteredNotifications = useMemo(() => {
    const filtered = notifTab === 'alerts'
      ? notifications.filter(n => n.type.includes('expense'))
      : notifications;
    return filtered.map(n => ({
      id: n.id,
      type: n.type.includes('expense') ? 'alert' as const : 'message' as const,
      text: t(n.type, parseData(n.data)),
      time: formatRelativeTime(n.createdAt),
      unread: !n.readAt,
    }));
  }, [notifications, notifTab, locale]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };

  const unreadCount = notifUnread;

  useEffect(() => {
    if (config.preloader) {
      setShowPreloader(true);
      const t = setTimeout(() => setShowPreloader(false), 800);
      return () => clearTimeout(t);
    }
    setShowPreloader(false);
  }, [config.preloader]);

  const showText = config.sidebarOpen;
  const isDarkSidebar = config.sidebarColor === 'dark' || config.sidebarColor === 'gradient';
  const isHorizontal = config.layout === 'horizontal';
  const isSemibox = config.layout === 'semibox';
  const isBoxed = config.layoutWidth === 'boxed';
  const topbarDark = config.topbarColor === 'dark';
  const hasSidebarImage = config.sidebarImage !== 'none';

  const searchPages = [
    { label: 'Analytics Dashboard', path: '/dashboard' },
    { label: 'Help Center', path: '/help' },
    { label: 'My account settings', path: '/settings' },
  ];

  const toggleMenu = (label: string) => setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));

  const sidebarBgImage = hasSidebarImage
    ? SIDEBAR_IMAGES.find(i => i.value === config.sidebarImage)?.url
    : null;

  const menuItems: MenuItem[] = useMemo(() => {
    const all: (MenuItem & { permission?: string })[] = [
      { text: t('nav.dashboard'), icon: <Dashboard />, path: '/dashboard', permission: 'dashboard' },
      { text: t('nav.sessions'), icon: <EventNote />, path: '/sessions', permission: 'sessions' },
      { text: t('nav.appointments'), icon: <EventNote />, path: '/appointments', permission: 'appointments' },
      { text: t('nav.calendar'), icon: <CalendarMonth />, path: '/calendar', permission: 'calendar' },
      { text: t('nav.services'), icon: <MedicalServices />, path: '/services', permission: 'services' },
      { text: t('nav.coverages'), icon: <MedicalServices />, path: '/coverages', permission: 'coverages' },
      { text: t('nav.invoices'), icon: <Receipt />, path: '/invoices', permission: 'invoices' },
      { text: t('nav.website'), icon: <Language />, path: '/website', permission: 'website' },
      { text: t('nav.subscribers'), icon: <Person />, path: '/subscribers', permission: 'subscribers' },
      { text: t('nav.walletTransfers'), icon: <AccountBalanceWallet />, path: '/wallet-transfers', permission: 'wallet-transfers' },
      { text: t('nav.advances'), icon: <Payments />, path: '/advances', permission: 'advances' },
      { text: t('nav.expenses'), icon: <Receipt />, path: '/expenses', permission: 'expenses' },
      { text: t('nav.employees'), icon: <People />, path: '/employees', permission: 'employees' },
      { text: t('nav.users'), icon: <Person />, path: '/users', permission: 'users' },
      { text: t('nav.patients'), icon: <Person />, path: '/patients', permission: 'patients' },
      { text: t('nav.notifications'), icon: <Notifications />, path: '/notifications', permission: 'notifications' },
      {
        text: t('nav.reports'), icon: <Assessment />, permission: 'reports',
        children: [
          { text: t('nav.dailyReport'), path: '/reports/daily' },
          { text: t('nav.weeklyReport'), path: '/reports/weekly' },
          { text: t('nav.monthlyReport'), path: '/reports/monthly' },
          { text: t('nav.receivables'), path: '/reports/receivables', permission: 'receivables' },
          { text: t('nav.financialSummary'), path: '/reports/financial-summary', permission: 'financial-summary' },
        ],
      },
    ];
    const perms = user?.permissions ?? [];
    const isAdmin = user?.role === 'ADMIN';
    const canAccess = (p?: string) => isAdmin || !p || perms.includes(p);
    return all
      .filter(item => canAccess(item.permission) || (item.children && item.children.some(c => canAccess(c.permission))))
      .map(item => item.children
        ? { ...item, children: item.children.filter(c => canAccess(c.permission)) }
        : item);
  }, [t, user]);

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <Toolbar sx={{ justifyContent: showText ? 'space-between' : 'center', px: showText ? 2 : 0, minHeight: 56 }}>
        {showText && (
          <Typography variant="h6" sx={{ fontWeight: 700, color: isDarkSidebar ? '#fff' : undefined }} noWrap>
            {t('app.title')}
          </Typography>
        )}
        <IconButton onClick={toggleSidebar} sx={{ color: isDarkSidebar ? '#fff' : undefined }}>
          {config.sidebarOpen ? <ChevronLeft /> : <MenuIcon />}
        </IconButton>
      </Toolbar>
      <Divider sx={isDarkSidebar ? { borderColor: 'rgba(255,255,255,0.12)' } : undefined} />
      <List sx={{ flexGrow: 1, py: 0, overflow: 'auto' }}>
        {menuItems.map((item) => (
          <Box key={item.text}>
            <ListItem
              disablePadding sx={{ display: 'block' }}
              onMouseEnter={(e) => {
                if (!showText && item.children) {
                  if (hoverTimer.current) clearTimeout(hoverTimer.current);
                  setHoverItem(item.text);
                  setHoverAnchor(e.currentTarget);
                }
              }}
              onMouseLeave={() => {
                if (!showText && item.children) {
                  hoverTimer.current = setTimeout(() => {
                    setHoverItem(null);
                    setHoverAnchor(null);
                  }, 150);
                }
              }}
            >
              <ListItemButton
                selected={!item.children && !!item.path && location.pathname.startsWith(item.path)}
                onClick={() => { item.children ? toggleMenu(item.text) : item.path && navigate(item.path); }}
                sx={{ minHeight: 44, justifyContent: showText ? 'initial' : 'center', px: 2.5,
                  '&.Mui-selected': { bgcolor: isDarkSidebar ? 'rgba(255,255,255,0.12)' : undefined },
                  '&.Mui-selected:hover': { bgcolor: isDarkSidebar ? 'rgba(255,255,255,0.18)' : undefined },
                  color: isDarkSidebar ? 'rgba(255,255,255,0.85)' : undefined }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: showText ? 2 : 'auto', justifyContent: 'center',
                  color: isDarkSidebar ? 'rgba(255,255,255,0.85)' : undefined }}>
                  {item.icon}
                </ListItemIcon>
                {showText && (
                  <>
                    <ListItemText primary={item.text} sx={{ '& .MuiListItemText-primary': { color: isDarkSidebar ? 'rgba(255,255,255,0.85)' : undefined } }} />
                    {item.children && (openMenus[item.text] ? <ExpandLess /> : <ExpandMore />)}
                  </>
                )}
              </ListItemButton>
            </ListItem>
            {item.children && (
              <Collapse in={showText && openMenus[item.text]} timeout="auto" unmountOnExit>
                <List disablePadding>
                  {item.children.map(child => (
                    <ListItem key={child.text} disablePadding sx={{ display: 'block' }}>
                      <ListItemButton
                        selected={location.pathname === child.path}
                        onClick={() => navigate(child.path)}
                        sx={{ minHeight: 40, pl: 5, justifyContent: showText ? 'initial' : 'center',
                          color: isDarkSidebar ? 'rgba(255,255,255,0.7)' : undefined,
                          '&.Mui-selected': { bgcolor: isDarkSidebar ? 'rgba(255,255,255,0.1)' : undefined, color: isDarkSidebar ? '#fff' : undefined } }}
                      >
                        {showText && <ListItemIcon sx={{ minWidth: 20, mr: 1.5, color: 'inherit' }}><FiberManualRecord sx={{ fontSize: 8 }} /></ListItemIcon>}
                        {showText && <ListItemText primary={child.text} sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }} />}
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            )}
            {!showText && item.children && (
              <Popper
                open={hoverItem === item.text}
                anchorEl={hoverAnchor}
                placement={dir === 'rtl' ? 'left-start' : 'right-start'}
                transition
                sx={{ zIndex: 1400 }}
                onMouseEnter={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }}
                onMouseLeave={() => { setHoverItem(null); setHoverAnchor(null); }}
              >
                {({ TransitionProps }) => (
                  <Fade {...TransitionProps} timeout={150}>
                    <Paper
                      elevation={8}
                      sx={{
                        minWidth: 180,
                        py: 0.5,
                        bgcolor: isDarkSidebar ? '#1e1e2e' : 'background.paper',
                        border: isDarkSidebar ? '1px solid rgba(255,255,255,0.12)' : '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                      }}
                    >
                      <List dense disablePadding>
                        {item.children && item.children.map((child) => (
                          <ListItem key={child.text} disablePadding>
                            <ListItemButton
                              selected={location.pathname === child.path}
                              onClick={() => { navigate(child.path); setHoverItem(null); setHoverAnchor(null); }}
                              sx={{
                                px: 2, py: 0.8,
                                color: isDarkSidebar ? 'rgba(255,255,255,0.85)' : undefined,
                                '&.Mui-selected': { bgcolor: isDarkSidebar ? 'rgba(255,255,255,0.1)' : undefined },
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 20, mr: 1.5, color: 'inherit' }}>
                                <FiberManualRecord sx={{ fontSize: 6 }} />
                              </ListItemIcon>
                              <ListItemText primary={child.text} slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 500 } } }} />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Fade>
                )}
              </Popper>
            )}
          </Box>
        ))}
      </List>
    </Box>
  );

  const showSidebar = !isHorizontal;
  const drawerSx = {
    width: showSidebar ? sidebarWidth : 0, flexShrink: 0, whiteSpace: 'nowrap' as const,
    display: showSidebar ? 'block' : 'none',
    '& .MuiDrawer-paper': {
      width: showSidebar ? sidebarWidth : 0, boxSizing: 'border-box' as const,
      overflowX: 'hidden' as const, transition: 'width 0.3s',
      background: sidebarBgImage ? `${SIDEBAR_BG[config.sidebarColor]} url(${sidebarBgImage}) center/cover no-repeat` : SIDEBAR_BG[config.sidebarColor],
      borderInlineEnd: isDarkSidebar ? 'none' : undefined,
      ...(isSemibox ? { top: 70, height: 'calc(100vh - 82px)', borderRadius: 2 } : {}),
    },
  };

  const appBarSx = {
    position: 'fixed' as const,
    width: isHorizontal || isSemibox ? '100%' : { md: `calc(100% - ${sidebarWidth}px)` },
    left: isHorizontal || isSemibox ? 0 : { md: `${sidebarWidth}px` },
    transition: 'width 0.3s, left 0.3s',
    bgcolor: topbarDark ? '#1e1e2e' : '#fff',
    color: topbarDark ? '#fff' : 'text.primary',
    boxShadow: topbarDark ? 1 : '0 1px 3px rgba(0,0,0,0.08)',
  };

  const mainSx = {
    flexGrow: 1, minHeight: '100vh', transition: 'margin-left 0.3s, width 0.3s',
    maxWidth: isBoxed ? 1200 : '100%', mx: isBoxed ? 'auto' : undefined,
    p: config.sidebarSize === 'compact' ? 1.5 : 3, mt: config.sidebarSize === 'compact' ? 7 : 8,
    marginLeft: isSemibox ? { md: `${sidebarWidth + 8}px` } : undefined,
  };

  const topbarIcons = (
    <>
      {/* Search */}
      <IconButton onClick={() => setSearchOpen(true)} sx={{ color: 'inherit', mr: 1 }}>
        <SearchIcon />
      </IconButton>

      {/* Language */}
      <IconButton onClick={e => setLangAnchorEl(e.currentTarget)} sx={{ color: 'inherit', mr: 1 }}>
        <Typography variant="body2" sx={{ lineHeight: 1 }}>{LANGUAGES.find(l => l.code === locale)?.flag}</Typography>
      </IconButton>
      <Menu anchorEl={langAnchorEl} open={!!langAnchorEl} onClose={() => setLangAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {LANGUAGES.map(lang => (
          <MenuItem key={lang.code} selected={locale === lang.code}
            onClick={() => { setLanguage(lang.code); setLangAnchorEl(null); }}
            sx={{ gap: 1 }}
          >
            <Typography variant="body2" sx={{ lineHeight: 1 }}>{lang.flag}</Typography>
            <Typography variant="body2">{lang.label}</Typography>
          </MenuItem>
        ))}
      </Menu>

      {/* Fullscreen */}
      <IconButton onClick={toggleFullscreen} sx={{ color: 'inherit', mr: 1, display: { xs: 'none', md: 'inline-flex' } }}>
        {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
      </IconButton>

      {/* Dark/Light mode */}
      <IconButton onClick={toggleMode} sx={{ color: 'inherit', mr: 1 }}>
        {mode === 'dark' ? <LightMode /> : <DarkMode />}
      </IconButton>

      {/* Notifications */}
      <IconButton onClick={e => setNotifAnchorEl(e.currentTarget)} sx={{ color: 'inherit', mr: 1 }}>
        <Badge badgeContent={notifUnread} color="error"><NotificationsNone /></Badge>
      </IconButton>
      <Menu anchorEl={notifAnchorEl} open={!!notifAnchorEl} onClose={() => setNotifAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 460, p: 0 } } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {t('notification.' + (notifTab === 'all' ? 'notification.all' : notifTab))}{' '}
            <Typography variant="caption" color="text.secondary">({unreadCount} New)</Typography>
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {(['all', 'alerts'] as const).map(tab => (
              <Chip key={tab} label={t('notification.' + tab)}
                size="small" variant={notifTab === tab ? 'filled' : 'outlined'}
                onClick={() => setNotifTab(tab)} color={notifTab === tab ? 'primary' : 'default'}
              />
            ))}
          </Box>
        </Box>
        <Divider />
        {filteredNotifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">{t('notification.empty')}</Typography>
          </Box>
        ) : (
          filteredNotifications.map(n => (
            <MenuItem key={n.id} sx={{ gap: 1.5, py: 1.5, bgcolor: n.unread ? 'action.hover' : undefined }}>
              <ListItemIcon sx={{ minWidth: 32, color: n.type === 'alert' ? 'warning.main' : 'primary.main' }}>
                {n.type === 'alert' ? <Warning fontSize="small" /> : <Mail fontSize="small" />}
              </ListItemIcon>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: n.unread ? 600 : 400 }}>{n.text}</Typography>
                <Typography variant="caption" color="text.secondary">{n.time}</Typography>
              </Box>
            </MenuItem>
          ))
        )}
        <Divider />
        <MenuItem sx={{ justifyContent: 'center', py: 1 }} onClick={() => { setNotifAnchorEl(null); navigate('/notifications'); }}>
          <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>{t('notification.viewAll')}</Typography>
        </MenuItem>
      </Menu>

      {/* Profile */}
      <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: 15 }}>
          {user?.firstName?.charAt(0)}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 220 } } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5, textAlign: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, fontSize: 20, mx: 'auto', mb: 1 }}>
            {user?.firstName?.charAt(0)}
          </Avatar>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{user?.firstName} {user?.lastName}</Typography>
          <Typography variant="caption" color="text.secondary">{user?.role}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
          <ListItemIcon><Person fontSize="small" /></ListItemIcon> Profile
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); window.open('https://wa.me/+967777296855', '_blank'); }}>
          <ListItemIcon><HelpOutlined fontSize="small" /></ListItemIcon> Help
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); lock(); }}>
          <ListItemIcon><Lock fontSize="small" /></ListItemIcon> Lock Screen
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); logout(); }}>
          <ListItemIcon><Logout fontSize="small" /></ListItemIcon> {t('auth.logout')}
        </MenuItem>
      </Menu>
    </>
  );

  if (isHorizontal) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="fixed" sx={{ bgcolor: topbarDark ? '#1e1e2e' : '#fff', color: topbarDark ? '#fff' : 'text.primary', boxShadow: topbarDark ? 1 : '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ fontWeight: 700, mr: 4 }} color="primary" noWrap>{t('app.title')}</Typography>
            {menuItems.map(item => (
              <ListItemButton key={item.text}
                selected={!item.children && !!item.path && location.pathname.startsWith(item.path)}
                onClick={() => item.path && navigate(item.path)}
                sx={{ borderRadius: 1, mx: 0.3, width: 'auto', px: 1.5, color: topbarDark ? '#fff' : undefined,
                  '&.Mui-selected': { bgcolor: topbarDark ? 'rgba(255,255,255,0.12)' : undefined } }}
              >
                <ListItemIcon sx={{ minWidth: 28, color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            ))}
            <Box sx={{ flexGrow: 1 }} />
            {topbarIcons}
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, maxWidth: isBoxed ? 1200 : '100%', mx: isBoxed ? 'auto' : undefined, width: '100%' }}>
          <Outlet />
        </Box>
        <LayoutSwitcher />
        {showPreloader && <Preloader />}
        {isLocked && <LockScreen />}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={appBarSx} elevation={topbarDark ? 1 : 0}>
        <Toolbar>
          <IconButton edge="start" sx={{ mr: 1, color: 'inherit', display: { md: 'none' } }} onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {(() => {
              const found = menuItems.find(i => i.path && location.pathname.startsWith(i.path));
              if (found) return found.text;
              for (const parent of menuItems) {
                if (parent.children) {
                  const child = parent.children.find(c => location.pathname === c.path);
                  if (child) return child.text;
                }
              }
              return t('app.title');
            })()}
          </Typography>
          {topbarIcons}
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ ...drawerSx, display: { xs: 'none', md: 'block' } }}>{sidebarContent}</Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280, boxSizing: 'border-box',
            background: sidebarBgImage ? `${SIDEBAR_BG[config.sidebarColor]} url(${sidebarBgImage}) center/cover no-repeat` : SIDEBAR_BG[config.sidebarColor],
          },
        }}
      >
        {sidebarContent}
      </Drawer>
      <Box component="main" sx={mainSx}>
        <Outlet />
      </Box>
      <LayoutSwitcher />
      {showPreloader && <Preloader />}
      {isLocked && <LockScreen />}

      {/* Search Modal Overlay */}
      {searchOpen && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, bgcolor: 'rgba(0,0,0,0.5)' }} onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
          <Paper sx={{ width: 500, mx: 'auto', mt: 6 }} onClick={e => e.stopPropagation()}>
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search (Ctrl+K)"
                style={{ flex: 1, border: 'none', outline: 'none', padding: '12px 0', fontSize: 14, background: 'transparent', color: 'inherit' }}
              />
            </Box>
            <Box sx={{ px: 1, py: 0.5 }}>
              {searchPages.filter(p => !searchQuery || p.label.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                <Box key={p.label} onClick={() => { navigate(p.path); setSearchOpen(false); setSearchQuery(''); }} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">{p.label}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
