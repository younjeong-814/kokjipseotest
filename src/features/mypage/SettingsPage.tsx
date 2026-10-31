import { useEffect, useState } from 'react';
import { SubHeader } from '../../components/SubHeader';
import { CloudAccountSlot } from '../cloud/AccountContext';
import { EmailReminderModal } from './EmailReminderModal';
import { ManualReminderTest } from '../notifications/ManualReminderTest';

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  useEffect(() => {
    const open = () => setEmailModalOpen(true);
    window.addEventListener('kokjipseo:open-email-reminder', open);
    return () => window.removeEventListener('kokjipseo:open-email-reminder', open);
  }, []);
  return <>
    <SubHeader title="설정" onBack={onBack} />
    <main className="settings-page"><CloudAccountSlot />{import.meta.env.DEV&&<ManualReminderTest />}</main>
    {emailModalOpen && <EmailReminderModal onClose={() => setEmailModalOpen(false)} />}
  </>;
}
