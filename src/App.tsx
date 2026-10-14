import { useEffect, useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { StatusBar } from './components/StatusBar';
import { TopHeader } from './components/TopHeader';
import { HomePage } from './features/home/HomePage';
import { RegistrationPage } from './features/registration/RegistrationPage';
import { GuidePage } from './features/registration/GuidePage';
import { FridgePage } from './features/fridge/FridgePage';
import { ReceiptCameraPage } from './features/receipt/ReceiptCameraPage';
import { ReceiptGuidePage } from './features/receipt/ReceiptGuidePage';
import { RecognitionResultPage } from './features/recognition/RecognitionResultPage';
import { useRecognition } from './features/recognition/useRecognition';
import { RegisteredFridgePage } from './features/fridge/RegisteredFridgePage';
import { RegistrationToast } from './components/RegistrationToast';
import { additionalConnections, isScreenId, screens, type ScreenId } from './prototype/flow';
function readScreen(): ScreenId {
  const id = window.location.hash.slice(1);
  return isScreenId(id) ? id : '5558:18818';
}
export function App() {
  const [screen, setScreen] = useState(readScreen);
  const [showRegistrationToast, setShowRegistrationToast] = useState(false);
  const recognition = useRecognition();
  useEffect(() => {
    const onHashChange = () => { const nextScreen = readScreen(); setScreen(nextScreen); if (nextScreen !== '5572:19852') setShowRegistrationToast(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const navigate = (destination: ScreenId) => {
    setShowRegistrationToast(screen === '5572:19525' && destination === '5572:19852');
    window.location.hash = destination;
  };
  const info = screens[screen];
  const onRecognize = () => { recognition.reset(); navigate('5572:19525'); };
  if (screen === '5572:19475' || screen === '5579:702' || screen === '5572:19525') {
    return (
      <div className="app-shell screen-receipt">
        <StatusBar />
        {screen === '5572:19475' && <ReceiptGuidePage navigate={navigate} />}
        {screen === '5579:702' && <ReceiptCameraPage navigate={navigate} onRecognize={onRecognize} />}
        {screen === '5572:19525' && <RecognitionResultPage navigate={navigate} recognition={recognition} />}
      </div>
    );
  }
  return (
    <div className={`app-shell screen-${info.menu}`}>
      <StatusBar />
      <TopHeader title={info.title} search={screen === '5558:19292' || screen === '5572:19852' ? additionalConnections.search.destination : undefined} navigate={navigate} />
      {screen === '5558:18818' && <HomePage navigate={navigate} />}
      {screen === '5558:19292' && <FridgePage navigate={navigate} />}
      {screen === '5572:19852' && <RegisteredFridgePage navigate={navigate} />}
      {screen === '5558:19197' && <RegistrationPage navigate={navigate} />}
      {screen.startsWith('guide-') && <GuidePage screen={screen} navigate={navigate} />}
      <BottomNavigation screen={screen} navigate={navigate} />
      {screen === '5572:19852' && showRegistrationToast && <RegistrationToast onDismiss={() => setShowRegistrationToast(false)} />}
    </div>
  );
}
