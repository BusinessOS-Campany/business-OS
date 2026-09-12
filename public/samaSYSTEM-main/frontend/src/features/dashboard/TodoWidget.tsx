import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, CardContent, Typography, Box, Checkbox, IconButton, TextField, Chip, LinearProgress,
} from '@mui/material';
import { Delete, Add, CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'dashboard_todos';

export default function TodoWidget() {
  const { t } = useLanguage();
  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const addTodo = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setTodos(prev => [...prev, { id: Date.now().toString(), text, done: false, createdAt: Date.now() }]);
    setInput('');
    inputRef.current?.focus();
  }, [input]);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const doneCount = todos.filter(t => t.done).length;
  const progress = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;

  const color = progress === 100 ? '#2e7d32' : progress > 50 ? '#3e5679' : '#7c4dff';

  const doneLabel = t('dashboard.done');

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: '16px 16px 12px', '&:last-child': { pb: '12px' }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('dashboard.todoTitle')}</Typography>
          <Typography variant="caption" color="text.secondary">{doneCount}/{todos.length}</Typography>
        </Box>

        <LinearProgress variant="determinate" value={progress}
          sx={{ height: 4, borderRadius: 2, mb: 1.5, bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': { bgcolor: color, transition: '0.6s ease' } }}
        />

        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
          <TextField
            inputRef={inputRef}
            size="small"
            placeholder={t('dashboard.todoPlaceholder')}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            sx={{ flexGrow: 1 }}
            slotProps={{ input: { sx: { borderRadius: 1.5, fontSize: 12 } } }}
          />
          <IconButton onClick={addTodo} disabled={!input.trim()}
            sx={{ bgcolor: '#3e5679', color: '#fff', borderRadius: 1.5, width: 32, height: 32,
              '&:hover': { bgcolor: '#2c4058' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}>
            <Add sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 160, mx: -0.5, px: 0.5 }}>
          {todos.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, opacity: 0.5, fontSize: 12 }}>
              {t('dashboard.todoEmpty')}
            </Typography>
          )}
          {[...todos].sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt).map(todo => (
            <Box key={todo.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.3, py: 0.3, px: 0.5, borderRadius: 1.5, mb: 0.2,
                transition: '0.2s', '&:hover': { bgcolor: 'action.hover' } }}>
              <Checkbox
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
                icon={<RadioButtonUnchecked sx={{ fontSize: 18, color: 'text.disabled' }} />}
                checkedIcon={<CheckCircle sx={{ fontSize: 18, color: '#3e5679' }} />}
                sx={{ p: 0.3 }}
              />
              <Typography variant="body2" sx={{ flexGrow: 1, fontSize: 12,
                textDecoration: todo.done ? 'line-through' : 'none',
                color: todo.done ? 'text.disabled' : 'text.primary',
                transition: '0.3s' }}>
                {todo.text}
              </Typography>
              {todo.done && <Chip label={doneLabel} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#2e7d3215', color: '#2e7d32', fontWeight: 600 }} />}
              <IconButton size="small" onClick={() => deleteTodo(todo.id)} sx={{ opacity: 0.3, '&:hover': { opacity: 1, color: 'error.main' } }}>
                <Delete sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
