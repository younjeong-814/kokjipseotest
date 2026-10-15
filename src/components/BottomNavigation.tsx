import { asset } from '../lib/assets';
import { navigationDestinations, screens, type Navigate, type ScreenId } from '../prototype/flow';
import { PrototypeButton } from './PrototypeButton';

const labels = ['홈', '냉장고', '등록', '레시피', '마이'];
const inactiveIcons = ['home-inactive.svg', 'nav-2.svg', 'nav-5.svg', 'nav-3.svg', 'nav-1.svg'];
const activeIcons: (string | undefined)[] = ['home.svg', 'fridge-active.svg', 'add-active.svg', 'recipe-active.svg', 'nav-1.svg'];

export function BottomNavigation({ screen, navigate }: { screen: ScreenId; navigate: Navigate }) {
  const active = screens[screen].menu;
  return (
    <nav className="bottom-navigation" aria-label="주요 메뉴">
      {labels.map((label, index) => {
        const icon = index === active ? activeIcons[index] : undefined;
        const content = <><span className={`nav-icon${icon && index === 4 ? ' nav-icon-mypage-active' : ''}`}><img src={asset(icon ?? inactiveIcons[index])} alt="" /></span><span>{label}</span></>;
        const destination = navigationDestinations[screen][index];
        return destination
          ? <PrototypeButton key={label} destination={destination} navigate={navigate}>{content}</PrototypeButton>
          : <button key={label} aria-current="page" disabled>{content}</button>;
      })}
    </nav>
  );
}
