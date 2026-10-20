import { useState } from 'react';
import { Box, Tabs, Tab, Typography, Paper, Button } from '@mui/material';
import { Workspaces, Comment, MedicalServices, Article, Email, MarkEmailRead, OpenInNew, HealthAndSafety, PhotoLibrary } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import PackagesTab from './PackagesTab';
import TestimonialsTab from './TestimonialsTab';
import DoctorsTab from './DoctorsTab';
import BlogTab from './BlogTab';
import ContactMessagesTab from './ContactMessagesTab';
import NewsletterTab from './NewsletterTab';
import InsuranceCompaniesTab from './InsuranceCompaniesTab';
import GalleryTab from './GalleryTab';

export default function WebsitePage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: t('website.tab.packages'), icon: <Workspaces /> },
    { label: t('website.tab.testimonials'), icon: <Comment /> },
    { label: t('website.tab.doctors'), icon: <MedicalServices /> },
    { label: t('website.tab.insuranceCompanies'), icon: <HealthAndSafety /> },
    { label: t('website.tab.blog'), icon: <Article /> },
    { label: t('website.tab.contact'), icon: <Email /> },
    { label: t('website.tab.newsletter'), icon: <MarkEmailRead /> },
    { label: t('website.tab.gallery'), icon: <PhotoLibrary /> },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Workspaces sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('website.title')}</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<OpenInNew />}
          component="a"
          href="https://samacenter.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('website.openSite')}
        </Button>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          dir="rtl"
        >
          {tabs.map((tb, i) => (
            <Tab key={tb.label} icon={tb.icon} iconPosition="start" label={tb.label} value={i} />
          ))}
        </Tabs>
      </Paper>

      <Box>
        {tab === 0 && <PackagesTab />}
        {tab === 1 && <TestimonialsTab />}
        {tab === 2 && <DoctorsTab />}
        {tab === 3 && <InsuranceCompaniesTab />}
        {tab === 4 && <BlogTab />}
        {tab === 5 && <ContactMessagesTab />}
        {tab === 6 && <NewsletterTab />}
        {tab === 7 && <GalleryTab />}
      </Box>
    </Box>
  );
}
