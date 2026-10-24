import { SubHeader } from '../../components/SubHeader';
import { CloudAccountSlot } from '../cloud/AccountContext';

export function SettingsPage({ onBack }: { onBack: () => void }) {
  return <>
    <SubHeader title="설정" onBack={onBack} />
    <main className="settings-page"><CloudAccountSlot /></main>
  </>;
}
