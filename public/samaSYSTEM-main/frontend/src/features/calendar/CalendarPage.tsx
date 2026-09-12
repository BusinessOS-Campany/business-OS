import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Box, Typography, IconButton, Button, Grid, Paper, Chip, Dialog,
  DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  List, ListItem, ListItemText, Avatar, Divider, ToggleButtonGroup, ToggleButton,
  InputAdornment, ClickAwayListener,
} from '@mui/material';
import {
  ChevronLeft, ChevronRight, Add, Circle, CalendarMonth, ViewWeek, TodayOutlined, ViewList,
  AccessTime, LocationOn, Notes, Close,
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import api from '../../services/api';
import {
  format, startOfMonth, endOfMonth,   startOfWeek, endOfWeek, addMonths, subMonths,
  addWeeks, subWeeks, addDays, subDays, differenceInDays, startOfDay,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, isWithinInterval, parseISO,
} from 'date-fns';

type ViewMode = 'month' | 'week' | 'day' | 'list';

interface CalendarEvent {
  id: string;
  eventName: string;
  date: string;
  endDate?: string;
  type: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
}

const TYPES = [
  { key: 'danger', labelKey: 'calendar.type.danger', color: '#d32f2f', bg: 'rgba(211,47,47,0.12)' },
  { key: 'success', labelKey: 'calendar.type.success', color: '#2e7d32', bg: 'rgba(46,125,50,0.12)' },
  { key: 'primary', labelKey: 'calendar.type.primary', color: '#3e5679', bg: 'rgba(62,86,121,0.12)' },
  { key: 'info', labelKey: 'calendar.type.info', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  { key: 'dark', labelKey: 'calendar.type.dark', color: '#1e293b', bg: 'rgba(30,41,59,0.12)' },
  { key: 'warning', labelKey: 'calendar.type.warning', color: '#e65100', bg: 'rgba(230,81,0,0.12)' },
];

const arDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const enDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const typeColor = (key: string) => TYPES.find(c => c.key === key)?.color || '#999';
const typeLabel = (t: (k: string) => string, key: string) => t(TYPES.find(c => c.key === key)?.labelKey || '');

function parseDate(d: string) {
  const parsed = parseISO(d);
  return isNaN(parsed.getTime()) ? new Date(d) : parsed;
}

function isEventOnDay(e: CalendarEvent, day: Date) {
  const start = parseDate(e.date);
  const end = e.endDate ? parseDate(e.endDate) : start;
  return isWithinInterval(day, { start, end });
}

function getEventRange(e: CalendarEvent) {
  const start = parseDate(e.date);
  const end = e.endDate ? parseDate(e.endDate) : start;
  return { start, end };
}

export default function CalendarPage() {
  const { t, dir, locale } = useLanguage();
  const [view, setView] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string[]>(TYPES.map(c => c.key));
  const [form, setForm] = useState({ eventName: '', date: '', endDate: '', type: 'danger', startTime: '', endTime: '', location: '', description: '' });
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const dayNames = locale === 'ar' ? arDayNames : enDayNames;
  const weekStartsOn: 0 | 6 = locale === 'ar' ? 6 : 0;

  const reorderedDayNames = [
    ...dayNames.slice(weekStartsOn),
    ...dayNames.slice(0, weekStartsOn),
  ];

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await api.get('/calendar');
      setEvents(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filteredEvents = useMemo(() =>
    events.filter(e => typeFilter.includes(e.type)),
    [events, typeFilter]
  );

  const getEventsForDay = useCallback((day: Date) =>
    filteredEvents.filter(e => isEventOnDay(e, day)),
    [filteredEvents]
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn });
  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const eventsForSelected = selectedDate
    ? filteredEvents.filter(e => isEventOnDay(e, selectedDate))
    : [];

  const eventsForList = [...filteredEvents].sort((a, b) => a.date.localeCompare(b.date));

  const monthYearLabel = locale === 'ar'
    ? `${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : format(currentDate, 'MMMM yyyy');

  const weekLabel = locale === 'ar'
    ? `${format(weekStart, 'd')} - ${format(weekEnd, 'd MMMM yyyy')}`
    : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  const dayLabel = format(currentDate, 'dd/MM/yyyy');

  const headerLabel = view === 'month' ? monthYearLabel : view === 'week' ? weekLabel : dayLabel;

  const handlePrev = () => {
    if (view === 'month') setCurrentDate(d => subMonths(d, 1));
    else if (view === 'week') setCurrentDate(d => subWeeks(d, 1));
    else if (view === 'day') setCurrentDate(d => subDays(d, 1));
    else setCurrentDate(d => subMonths(d, 1));
  };

  const handleNext = () => {
    if (view === 'month') setCurrentDate(d => addMonths(d, 1));
    else if (view === 'week') setCurrentDate(d => addWeeks(d, 1));
    else if (view === 'day') setCurrentDate(d => addDays(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleSaveEvent = async () => {
    if (!form.eventName || !form.date) return;
    const body = { ...form, endDate: form.endDate || undefined };
    try {
      if (editingEvent) {
        await api.put(`/calendar/${editingEvent.id}`, body);
      } else {
        await api.post('/calendar', body);
      }
      setForm({ eventName: '', date: '', endDate: '', type: 'danger', startTime: '', endTime: '', location: '', description: '' });
      setEditingEvent(null);
      setDialogOpen(false);
      fetchEvents();
    } catch { /* ignore */ }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.delete(`/calendar/${id}`);
      setForm({ eventName: '', date: '', endDate: '', type: 'danger', startTime: '', endTime: '', location: '', description: '' });
      setEditingEvent(null);
      setDialogOpen(false);
      fetchEvents();
    } catch { /* ignore */ }
  };

  const openAddDialog = (day?: Date, day2?: Date) => {
    setEditingEvent(null);
    const d = day ? format(day, 'yyyy-MM-dd') : '';
    const d2 = day2 && !isSameDay(day!, day2) ? format(day2, 'yyyy-MM-dd') : '';
    setForm({ eventName: '', date: d, endDate: d2, type: 'danger', startTime: '', endTime: '', location: '', description: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (e: CalendarEvent) => {
    setEditingEvent(e);
    setForm({ eventName: e.eventName, date: e.date, endDate: e.endDate || '', type: e.type, startTime: e.startTime || '', endTime: e.endTime || '', location: e.location || '', description: e.description || '' });
    setDialogOpen(true);
  };

  const handleDayMouseDown = (day: Date) => {
    setDragStart(day);
    setDragEnd(day);
    setSelectedDate(day);
  };

  const handleDayMouseEnter = (day: Date) => {
    if (dragStart) {
      setDragEnd(day);
    }
  };

  const handleDayMouseUp = () => {
    if (dragStart && dragEnd && !isSameDay(dragStart, dragEnd)) {
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      openAddDialog(start, end);
    }
    setDragStart(null);
    setDragEnd(null);
  };

  const isInDragRange = (day: Date) => {
    if (!dragStart || !dragEnd) return false;
    const s = dragStart < dragEnd ? dragStart : dragEnd;
    const e = dragStart < dragEnd ? dragEnd : dragStart;
    return isWithinInterval(day, { start: s, end: e });
  };

  // ---- Multi-day event helpers ----
  const eventStartsOnDay = (e: CalendarEvent, day: Date) => isSameDay(parseDate(e.date), day);

  const renderEventChip = (e: CalendarEvent, day?: Date) => {
    const isMulti = e.endDate && !isSameDay(parseDate(e.date), parseDate(e.endDate));
    const startsHere = day ? eventStartsOnDay(e, day) : true;
    const endsHere = day && e.endDate ? isSameDay(parseDate(e.endDate), day) : true;
    if (isMulti && day && !startsHere) {
      return (
        <Box key={e.id}
          onClick={(ev) => { ev.stopPropagation(); openEditDialog(e); }}
          sx={{
            height: 18, mb: 0.2, cursor: 'pointer',
            bgcolor: typeColor(e.type) + '15',
            borderLeft: e.date === e.endDate ? 'none' : `1px solid ${typeColor(e.type)}40`,
            borderRight: endsHere ? `1px solid ${typeColor(e.type)}40` : 'none',
            mx: endsHere ? 0 : -0.5,
            borderTopRightRadius: endsHere ? '4px' : 0,
            borderBottomRightRadius: endsHere ? '4px' : 0,
            borderTopLeftRadius: '4px',
            borderBottomLeftRadius: '4px',
            '&:hover': { bgcolor: typeColor(e.type) + '30' },
          }}
        />
      );
    }
    return (
      <Box key={e.id}
        onClick={(ev) => { ev.stopPropagation(); openEditDialog(e); }}
        sx={{
          fontSize: 11, px: 0.6, py: 0.2, mb: 0.2, borderRadius: 0.5, overflow: 'hidden',
          whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer',
          bgcolor: typeColor(e.type) + '20', color: typeColor(e.type),
          fontWeight: 500, borderLeft: `2px solid ${typeColor(e.type)}`,
          '&:hover': { bgcolor: typeColor(e.type) + '40' },
        }}
      >
        {e.startTime ? e.startTime + ' ' : ''}{e.eventName}
      </Box>
    );
  };

  const renderMiniCalendar = () => (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Button fullWidth variant="contained" startIcon={<Add />}
        onClick={() => openAddDialog()}
        sx={{ mb: 2, borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
      >
        {t('calendar.addEvent')}
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <IconButton size="small" onClick={() => setCurrentDate(d => subMonths(d, 1))}><ChevronLeft /></IconButton>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{monthYearLabel}</Typography>
        <IconButton size="small" onClick={() => setCurrentDate(d => addMonths(d, 1))}><ChevronRight /></IconButton>
      </Box>

      <Grid container columns={7} spacing={0}>
        {reorderedDayNames.map(d => (
          <Grid key={d} size={1}>
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', fontSize: 10, fontWeight: 600, py: 0.5 }}>
              {d.slice(0, 2)}
            </Typography>
          </Grid>
        ))}
        {monthDays.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isSel = selectedDate && isSameDay(day, selectedDate);
          return (
            <Grid key={i} size={1}>
              <Box onClick={() => setSelectedDate(day)}
                sx={{
                  textAlign: 'center', py: 0.6, cursor: 'pointer', borderRadius: 1,
                  bgcolor: isSel ? 'primary.main' : isToday(day) ? 'primary.light' : 'transparent',
                  color: isSel ? '#fff' : isToday(day) ? '#fff' : isSameMonth(day, currentDate) ? 'text.primary' : 'text.disabled',
                  '&:hover': { bgcolor: isSel ? 'primary.dark' : 'action.hover' },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: isToday(day) ? 700 : 500, fontSize: 12 }}>
                  {format(day, 'd')}
                </Typography>
                {dayEvents.length > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.3, mt: 0.2 }}>
                    {dayEvents.slice(0, 3).map(e => (
                      <Box key={e.id} sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: typeColor(e.type) }} />
                    ))}
                  </Box>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
        {t('calendar.types')}
      </Typography>
      {TYPES.map(tp => (
        <Box key={tp.key}
          onClick={() => setTypeFilter(prev =>
            prev.includes(tp.key) ? prev.filter(k => k !== tp.key) : [...prev, tp.key]
          )}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, cursor: 'pointer', opacity: typeFilter.includes(tp.key) ? 1 : 0.4 }}
        >
          <Circle sx={{ fontSize: 10, color: tp.color }} />
          <Typography variant="body2" sx={{ flexGrow: 1 }}>{t(tp.labelKey)}</Typography>
          <Typography variant="caption" color="text.secondary">{events.filter(e => e.type === tp.key).length}</Typography>
        </Box>
      ))}

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1.5, display: 'block' }}>
        {t('calendar.upcomingEvents')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, display: 'block', fontSize: 11 }}>
        {t('calendar.dontMissEvents')}
      </Typography>

      <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
        {[...filteredEvents]
          .filter(e => parseDate(e.date) >= startOfDay(new Date()))
          .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
          .slice(0, 15)
          .map(e => {
            const d = parseDate(e.date);
            const isMulti = e.endDate && !isSameDay(parseDate(e.date), parseDate(e.endDate));
            return (
              <Box key={e.id} sx={{ display: 'flex', gap: 1.5, mb: 1.5, p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer' }}
                onClick={() => openEditDialog(e)}
              >
                <Box sx={{ textAlign: 'center', minWidth: 40 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1, color: typeColor(e.type), fontSize: 18 }}>
                    {format(d, 'd')}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
                    {format(d, 'MMM')}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary', display: 'block' }}>
                    {format(d, 'yyyy')}
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>
                    {e.eventName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, display: 'block' }}>
                    {isMulti
                      ? `${format(d, 'dd MMM')} - ${format(parseDate(e.endDate!), 'dd MMM yyyy')}`
                      : e.startTime && e.endTime
                      ? `${e.startTime.replace(':00', '')} to ${e.endTime.replace(':00', '')}`
                      : e.startTime
                      ? `${e.startTime.replace(':00', '')}`
                      : t('calendar.fullDay')}
                  </Typography>
                  {e.description && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, display: 'block', mt: 0.2 }}>
                      {e.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        {filteredEvents.filter(e => parseDate(e.date) >= startOfDay(new Date())).length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 2 }}>
            {t('calendar.noUpcoming')}
          </Typography>
        )}
      </Box>
    </Paper>
  );

  const renderMonthView = () => (
    <Paper ref={gridRef} sx={{ borderRadius: 2, overflow: 'hidden', userSelect: 'none' }}
      onMouseUp={handleDayMouseUp} onMouseLeave={() => setDragStart(null)}>
      <Grid container columns={7} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        {reorderedDayNames.map(d => (
          <Grid key={d} size={1}>
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', py: 1, fontWeight: 600, color: 'text.secondary', bgcolor: 'action.hover' }}>
              {d}
            </Typography>
          </Grid>
        ))}
      </Grid>
      <Grid container columns={7}>
        {monthDays.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isSel = selectedDate && isSameDay(day, selectedDate);
          const isDrag = isInDragRange(day);
          return (
            <Grid key={i} size={1}>
              <Box
                onMouseDown={() => handleDayMouseDown(day)}
                onMouseEnter={() => handleDayMouseEnter(day)}
                sx={{
                  minHeight: 110, p: 0.5, cursor: 'pointer',
                  borderRight: (i + 1) % 7 !== 0 ? '1px solid' : 'none',
                  borderBottom: i < monthDays.length - 7 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  bgcolor: isDrag ? 'primary.main' + '15' : isSel ? 'action.selected' : isToday(day) ? 'primary.main' + '08' : 'transparent',
                  '&:hover': { bgcolor: isDrag ? 'primary.main' + '25' : 'action.hover' },
                }}
              >
                <Typography variant="caption"
                  sx={{
                    display: 'inline-block', minWidth: 22, textAlign: 'center', borderRadius: '50%',
                    fontWeight: isToday(day) ? 700 : 500, fontSize: 12, lineHeight: '22px',
                    bgcolor: isToday(day) ? 'primary.main' : 'transparent',
                    color: isToday(day) ? '#fff' : isSameMonth(day, currentDate) ? 'text.primary' : 'text.disabled',
                    mb: 0.3,
                  }}
                >
                  {format(day, 'd')}
                </Typography>
                <Box>
                  {dayEvents.filter(e => e.endDate && !eventStartsOnDay(e, day)).map(e => renderEventChip(e, day))}
                  {dayEvents.filter(e => !e.endDate || eventStartsOnDay(e, day)).slice(0, 3).map(e => renderEventChip(e, day))}
                  {dayEvents.filter(e => !e.endDate || eventStartsOnDay(e, day)).length > 3 && (
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', pl: 0.5 }}>
                      +{dayEvents.filter(e => !e.endDate || eventStartsOnDay(e, day)).length - 3} more
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );

  const renderWeekView = () => (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden', userSelect: 'none' }}
      onMouseUp={handleDayMouseUp} onMouseLeave={() => setDragStart(null)}>
      <Grid container columns={7} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        {weekDays.map((day, i) => (
          <Grid key={i} size={1}>
            <Box
              onClick={() => setSelectedDate(day)}
              sx={{
                textAlign: 'center', py: 1.5, cursor: 'pointer',
                bgcolor: isToday(day) ? 'primary.main' : 'action.hover',
                color: isToday(day) ? '#fff' : 'text.primary',
              }}
            >
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                {reorderedDayNames[i]}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {format(day, 'd')}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Grid container columns={7}>
        {weekDays.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const isSel = selectedDate && isSameDay(day, selectedDate);
          return (
            <Grid key={i} size={1}>
              <Box
                onMouseDown={() => handleDayMouseDown(day)}
                onMouseEnter={() => handleDayMouseEnter(day)}
                sx={{
                  minHeight: 400, p: 0.5, cursor: 'pointer',
                  borderRight: i < 6 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  bgcolor: isSel ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {dayEvents.filter(e => e.endDate && !eventStartsOnDay(e, day)).map(e => renderEventChip(e, day))}
                  {dayEvents.filter(e => !e.endDate || eventStartsOnDay(e, day)).slice(0, 4).map(e => renderEventChip(e, day))}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    return (
      <Paper sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
          {format(currentDate, 'dd/MM/yyyy')}
        </Typography>
        {dayEvents.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {t('calendar.noEvents')}
          </Typography>
        ) : (
          <List>
            {dayEvents.map(e => (
              <ListItem key={e.id} divider sx={{ gap: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => openEditDialog(e)}>
                <Avatar sx={{ width: 10, height: 10, bgcolor: typeColor(e.type) }} />
                <ListItemText
                  primary={e.eventName}
                  secondary={[e.endDate && format(parseDate(e.endDate), 'dd/MM') !== format(parseDate(e.date), 'dd/MM') ? `${format(parseDate(e.date), 'dd/MM')} - ${format(parseDate(e.endDate), 'dd/MM')}` : '', e.startTime && e.endTime ? `${e.startTime} - ${e.endTime}` : e.startTime || e.endTime || '', e.location, e.description].filter(Boolean).join(' · ')}
                  slotProps={{ primary: { sx: { fontWeight: 600 } }, secondary: { sx: { fontSize: 13 } } }}
                />
                <Chip label={typeLabel(t, e.type)} size="small"
                  sx={{ bgcolor: typeColor(e.type) + '20', color: typeColor(e.type), fontWeight: 600, fontSize: 11 }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    );
  };

  const renderListView = () => {
    const grouped = view === 'list' ? eventsForList : [];
    return (
      <Paper sx={{ borderRadius: 2 }}>
        {grouped.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">{t('calendar.noEvents')}</Typography>
          </Box>
        ) : (
          <List>
            {grouped.map(e => {
              const d = parseDate(e.date);
              return (
                <ListItem key={e.id} divider sx={{ gap: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => openEditDialog(e)}>
                  <Avatar sx={{ width: 10, height: 10, bgcolor: typeColor(e.type) }} />
                  <ListItemText
                    primary={e.eventName}
                    secondary={`${format(d, 'dd/MM/yyyy')}${e.endDate && format(parseDate(e.endDate), 'dd/MM') !== format(d, 'dd/MM') ? ' - ' + format(parseDate(e.endDate), 'dd/MM/yyyy') : ''}${e.startTime ? ' · ' + e.startTime : ''}${e.location ? ' · ' + e.location : ''}`}
                    slotProps={{ primary: { sx: { fontWeight: 600 } }, secondary: { sx: { fontSize: 13 } } }}
                  />
                  <Chip label={typeLabel(t, e.type)} size="small"
                    sx={{ bgcolor: typeColor(e.type) + '20', color: typeColor(e.type), fontWeight: 600, fontSize: 11 }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>
    );
  };

  const viewIcons: Record<ViewMode, React.ReactNode> = {
    month: <CalendarMonth sx={{ fontSize: 20 }} />,
    week: <ViewWeek sx={{ fontSize: 20 }} />,
    day: <TodayOutlined sx={{ fontSize: 20 }} />,
    list: <ViewList sx={{ fontSize: 20 }} />,
  };

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box sx={{ width: 280, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
        {renderMiniCalendar()}
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={handlePrev}><ChevronLeft /></IconButton>
            <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 200, textAlign: 'center' }}>
              {headerLabel}
            </Typography>
            <IconButton size="small" onClick={handleNext}><ChevronRight /></IconButton>
            <Button size="small" variant="outlined" onClick={handleToday} sx={{ textTransform: 'none', ml: 1 }}>
              {t('calendar.today')}
            </Button>
          </Box>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, v) => v && setView(v)}
            size="small"
          >
            {(['month', 'week', 'day', 'list'] as ViewMode[]).map(v => (
              <ToggleButton key={v} value={v} sx={{ textTransform: 'none', px: 1.5 }}>
                {viewIcons[v]}
                <Typography variant="caption" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>
                  {t('calendar.view.' + v)}
                </Typography>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
        {view === 'list' && renderListView()}

        {view !== 'day' && view !== 'list' && selectedDate && eventsForSelected.length > 0 && (
          <Paper sx={{ mt: 2, borderRadius: 2 }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {t('calendar.eventsFor')} {format(selectedDate, 'dd/MM/yyyy')}
              </Typography>
            </Box>
            <List dense>
              {eventsForSelected.map(e => (
                <ListItem key={e.id} divider sx={{ gap: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => openEditDialog(e)}>
                  <Avatar sx={{ width: 10, height: 10, bgcolor: typeColor(e.type) }} />
                  <ListItemText
                    primary={e.eventName}
                    secondary={[e.startTime && e.endTime ? `${e.startTime} - ${e.endTime}` : e.startTime || e.endTime || '', e.location, e.description].filter(Boolean).join(' · ')}
                    slotProps={{ primary: { sx: { fontWeight: 600, fontSize: 14 } }, secondary: { sx: { fontSize: 12 } } }}
                  />
                  <Chip label={typeLabel(t, e.type)} size="small"
                    sx={{ bgcolor: typeColor(e.type) + '20', color: typeColor(e.type), fontWeight: 600, fontSize: 10 }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2, overflow: 'hidden' } } }}>
        <Box sx={{ bgcolor: typeColor(form.type) + '18', px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{editingEvent ? t('calendar.editEvent') : t('calendar.addEvent')}</Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)}><Close /></IconButton>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          {editingEvent && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                <CalendarMonth sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {form.date && form.endDate && form.date !== form.endDate
                    ? `${format(parseDate(form.date), 'dd MMM, yyyy')} to ${format(parseDate(form.endDate), 'dd MMM, yyyy')}`
                    : format(parseDate(form.date), 'dd MMM, yyyy')}
                </Typography>
              </Box>
              {(form.startTime || form.endTime) && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                  <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {form.startTime}{form.startTime && form.endTime ? ' - ' : ''}{form.endTime}
                  </Typography>
                </Box>
              )}
              {form.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                  <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{form.location}</Typography>
                </Box>
              )}
              {form.description && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <Notes sx={{ fontSize: 16, color: 'text.secondary', mt: 0.3 }} />
                  <Typography variant="body2" color="text.secondary">{form.description}</Typography>
                </Box>
              )}
            </Box>
          )}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('calendar.type')}</InputLabel>
            <Select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))} label={t('calendar.type')}>
              {TYPES.map(tp => (
                <MenuItem key={tp.key} value={tp.key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Circle sx={{ fontSize: 12, color: tp.color }} />
                    {t(tp.labelKey)}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth label={t('calendar.eventName')} value={form.eventName} onChange={e => setForm(prev => ({ ...prev, eventName: e.target.value }))} sx={{ mb: 2 }} required />
          <Box sx={{ mb: 2, position: 'relative' }}>
            <TextField fullWidth label={t('calendar.eventDate')}
              value={form.date && form.endDate && form.date !== form.endDate ? `${form.date} to ${form.endDate}` : form.date || ''}
              onClick={() => setDatePickerOpen(true)}
              slotProps={{ htmlInput: { readOnly: true }, input: { endAdornment: <InputAdornment position="end"><CalendarMonth sx={{ fontSize: 20, color: 'text.secondary' }} /></InputAdornment> } }}
            />
            {datePickerOpen && (
              <ClickAwayListener onClickAway={() => setDatePickerOpen(false)}>
                <Paper sx={{ position: 'absolute', zIndex: 1300, mt: 0.5, p: 2, display: 'flex', gap: 1.5, alignItems: 'center', borderRadius: 2, boxShadow: 4 }}>
                  <TextField type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} size="small" slotProps={{ inputLabel: { shrink: true } }} label={t('calendar.eventDate')} />
                  <Typography variant="body2" color="text.secondary">{t('calendar.to')}</Typography>
                  <TextField type="date" value={form.endDate} onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))} size="small" slotProps={{ inputLabel: { shrink: true } }} label={t('calendar.endDate')} />
                  <Button size="small" variant="contained" onClick={() => setDatePickerOpen(false)}>OK</Button>
                </Paper>
              </ClickAwayListener>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField fullWidth label={t('calendar.startTime')} type="time" value={form.startTime} onChange={e => setForm(prev => ({ ...prev, startTime: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField fullWidth label={t('calendar.endTime')} type="time" value={form.endTime} onChange={e => setForm(prev => ({ ...prev, endTime: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
          <TextField fullWidth label={t('calendar.location')} value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} sx={{ mb: 2 }} />
          <TextField fullWidth label={t('calendar.description')} multiline rows={3} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <Box>
            {editingEvent && (
              <Button onClick={() => handleDeleteEvent(editingEvent.id)} color="error" variant="outlined">
                {t('common.delete')}
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setDialogOpen(false)} color="secondary">{t('common.cancel')}</Button>
            <Button onClick={handleSaveEvent} variant="contained" sx={{ bgcolor: typeColor(form.type), '&:hover': { bgcolor: typeColor(form.type) + 'cc' } }}>{editingEvent ? t('common.save') : t('calendar.addEvent')}</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
