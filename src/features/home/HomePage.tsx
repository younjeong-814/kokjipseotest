import { WelcomeBanner } from './WelcomeBanner';
import { FridgeSummary } from './FridgeSummary';
import { EmptyFridge } from './EmptyFridge';
import type { Navigate } from '../../prototype/flow';
export function HomePage({ navigate }: { navigate: Navigate }) {
  return <main data-figma-node="5558:18818"><WelcomeBanner /><FridgeSummary /><EmptyFridge onRegister={() => navigate('5558:19197')} /></main>;
}
