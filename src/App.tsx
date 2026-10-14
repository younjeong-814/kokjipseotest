import { useEffect, useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { StatusBar } from './components/StatusBar';
import { TopHeader } from './components/TopHeader';
import { HomePage } from './features/home/HomePage';
import { RegistrationPage } from './features/registration/RegistrationPage';
import { FridgePage } from './features/fridge/FridgePage';
import { ReceiptCameraPage } from './features/receipt/ReceiptCameraPage';
import { ReceiptGuidePage } from './features/receipt/ReceiptGuidePage';
import { additionalConnections, isScreenId, screens, type ScreenId } from './prototype/flow';
function readScreen(): ScreenId {
  const id = window.location.hash.slice(1);
  return isScreenId(id) ? id : '5558:18818';
}
export function App() {
  const [screen, setScreen] = useState(readScreen);
  useEffect(() => {
    const onHashChange = () => { setScreen(readScreen()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const navigate = (destination: ScreenId) => { window.location.hash = destination; };
  const info = screens[screen];
  if (screen === '5572:19475' || screen === '5579:702') {
    return (
      <div className="app-shell screen-receipt">
        <StatusBar />
        {screen === '5572:19475' ? <ReceiptGuidePage navigate={navigate} /> : <ReceiptCameraPage navigate={navigate} />}
      </div>
    );
  }
  return (
    <div className={`app-shell screen-${info.menu}`}>
      <StatusBar />
      <TopHeader title={info.title} search={screen === '5558:19292' ? additionalConnections.search.destination : undefined} navigate={navigate} />
      {screen === '5558:18818' && <HomePage navigate={navigate} />}
      {screen === '5558:19292' && <FridgePage navigate={navigate} />}
      {screen === '5558:19197' && <RegistrationPage navigate={navigate} />}
      <BottomNavigation screen={screen} navigate={navigate} />
    </div>
  );
}
