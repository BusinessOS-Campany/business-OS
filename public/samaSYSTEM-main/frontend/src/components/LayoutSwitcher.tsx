import React, { useState } from 'react';
import {
  Box, Fab, Drawer, Typography, ToggleButtonGroup, ToggleButton,
  Tooltip, IconButton, Divider, Stack,
} from '@mui/material';
import {
  Style as StyleIcon, Close, ViewSidebar, ViewCompact,
  HorizontalSplit, WidthFull, GridView,
  WbSunny, Brightness3, Window as WindowIcon,
  CheckCircleOutlined, CircleOutlined, RestartAlt,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { useLayout, SIDEBAR_IMAGES } from '../contexts/LayoutContext';
import type { LayoutConfig } from '../contexts/LayoutContext';

const COLOR_PRESETS = [
  '#1976d2', '#7c4dff', '#e91e63', '#ff5722', '#4caf50',
  '#00bcd4', '#ff9800', '#607d8b',
];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function RadioGroup<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string; icon: React.ReactNode }[]; onChange: (v: T) => void;
}) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v) => v && onChange(v)}
      size="small"
      sx={{
        display: 'flex', gap: 0.5,
        '& .MuiToggleButton-root': {
          flex: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
          flexDirection: 'column', py: 1, gap: 0.3, fontSize: '0.7rem',
          textTransform: 'none',
        },
      }}
    >
      {options.map(o => (
        <ToggleButton key={o.value} value={o.value}>
          {o.icon}
          <Typography variant="caption">{o.label}</Typography>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export default function LayoutSwitcher() {
  const { config, updateConfig } = useLayout();
  const { primaryColor, setPrimaryColor } = useThemeMode();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const upd = (partial: Partial<LayoutConfig>) => updateConfig(partial);

  return (
    <>
      <Tooltip title={t('layout.settings.tooltip')} placement="left">
        <Fab
          size="small"
          color="primary"
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', bottom: 24, right: 16, zIndex: 1200 }}
        >
          <StyleIcon />
        </Fab>
      </Tooltip>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 340, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('layout.settings.title')}</Typography>
            <IconButton size="small" onClick={() => setOpen(false)}><Close /></IconButton>
          </Box>
          <Divider />
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, pt: 2.5 }}>
            <Section label={t('layout.settings.layout')}>
              <RadioGroup
                value={config.layout}
                options={[
                  { value: 'vertical', label: t('layout.settings.layout.vertical'), icon: <ViewSidebar sx={{ fontSize: 20 }} /> },
                  { value: 'horizontal', label: t('layout.settings.layout.horizontal'), icon: <HorizontalSplit sx={{ fontSize: 20 }} /> },
                  { value: 'semibox', label: t('layout.settings.layout.semibox'), icon: <GridView sx={{ fontSize: 20 }} /> },
                ]}
                onChange={v => upd({ layout: v })}
              />
            </Section>

            <Section label={t('layout.settings.semiboxWidth')}>
              <RadioGroup
                value={config.layoutWidth}
                options={[
                  { value: 'fluid', label: t('layout.settings.semiboxWidth.fluid'), icon: <WidthFull sx={{ fontSize: 20 }} /> },
                  { value: 'boxed', label: t('layout.settings.semiboxWidth.boxed'), icon: <WindowIcon sx={{ fontSize: 20 }} /> },
                ]}
                onChange={v => upd({ layoutWidth: v })}
              />
            </Section>

            <Section label={t('layout.settings.topbarColor')}>
              <RadioGroup
                value={config.topbarColor}
                options={[
                  { value: 'light', label: t('layout.settings.topbarColor.light'), icon: <WbSunny sx={{ fontSize: 20 }} /> },
                  { value: 'dark', label: t('layout.settings.topbarColor.dark'), icon: <Brightness3 sx={{ fontSize: 20 }} /> },
                ]}
                onChange={v => upd({ topbarColor: v })}
              />
            </Section>

            <Section label={t('layout.settings.sidebarSize')}>
              <RadioGroup
                value={config.sidebarSize}
                options={[
                  { value: 'default', label: t('layout.settings.sidebarSize.default'), icon: <ViewSidebar sx={{ fontSize: 20 }} /> },
                  { value: 'compact', label: t('layout.settings.sidebarSize.compact'), icon: <ViewCompact sx={{ fontSize: 20 }} /> },
                ]}
                onChange={v => upd({ sidebarSize: v })}
              />
            </Section>

            <Section label={t('layout.settings.sidebarColor')}>
              <RadioGroup
                value={config.sidebarColor}
                options={[
                  { value: 'light', label: t('layout.settings.sidebarColor.light'), icon: <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: '#f5f5f5', border: '2px solid #ccc' }} /> },
                  { value: 'dark', label: t('layout.settings.sidebarColor.dark'), icon: <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: '#1e1e1e', border: '2px solid #444' }} /> },
                  { value: 'gradient', label: t('layout.settings.sidebarColor.gradient'), icon: <Box sx={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} /> },
                ]}
                onChange={v => upd({ sidebarColor: v })}
              />
            </Section>

            <Section label={t('layout.settings.sidebarImages')}>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {SIDEBAR_IMAGES.map(img => (
                  <Box
                    key={img.value}
                    onClick={() => upd({ sidebarImage: img.value })}
                    sx={{
                      width: 56, height: 48, borderRadius: 1.5, overflow: 'hidden',
                      border: '2px solid', borderColor: config.sidebarImage === img.value ? 'primary.main' : 'divider',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: img.value === 'none' ? 'action.hover' : 'transparent',
                      position: 'relative',
                    }}
                  >
                    {img.value === 'none' ? (
                      <Typography variant="caption" color="text.disabled">{t('layout.settings.sidebarImages.none')}</Typography>
                    ) : (
                      <Box
                        component="img"
                        src={img.url}
                        alt={img.value}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    {config.sidebarImage === img.value && (
                      <CheckCircleOutlined sx={{ position: 'absolute', fontSize: 16, color: 'primary.main', bgcolor: 'background.paper', borderRadius: '50%' }} />
                    )}
                  </Box>
                ))}
              </Box>
            </Section>

            <Section label={t('layout.settings.primaryColor')}>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map(color => (
                  <Box
                    key={color}
                    onClick={() => setPrimaryColor(color)}
                    sx={{
                      width: 32, height: 32, borderRadius: '50%', bgcolor: color,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid', borderColor: primaryColor === color ? color : 'transparent',
                      outline: primaryColor === color ? `2px solid ${color}40` : 'none',
                      outlineOffset: 2,
                    }}
                  >
                    {primaryColor === color && (
                      <CheckCircleOutlined sx={{ fontSize: 16, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
                    )}
                  </Box>
                ))}
              </Box>
            </Section>

            <Section label={t('layout.settings.preloader')}>
              <RadioGroup
                value={config.preloader ? 'enable' : 'disable'}
                options={[
                  { value: 'enable', label: t('layout.settings.preloader.enable'), icon: <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '3px solid', borderColor: 'primary.main', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} /> },
                  { value: 'disable', label: t('layout.settings.preloader.disable'), icon: <CircleOutlined sx={{ fontSize: 20 }} /> },
                ]}
                onChange={v => upd({ preloader: v === 'enable' })}
              />
            </Section>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: 'center' }}>
              <IconButton
                color="error"
                onClick={() => {
                  updateConfig({
                    layout: 'vertical', layoutWidth: 'fluid', topbarColor: 'light',
                    sidebarSize: 'default', sidebarColor: 'light', sidebarImage: 'none',
                    preloader: false,
                  });
                  setPrimaryColor('#1976d2');
                }}
                sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, px: 2, gap: 0.5 }}
              >
                <RestartAlt />
                <Typography variant="button" color="error">Reset</Typography>
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
