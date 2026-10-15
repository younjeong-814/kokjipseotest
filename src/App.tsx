import { useEffect, useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { StatusBar } from './components/StatusBar';
import { TopHeader } from './components/TopHeader';
import { HomePage } from './features/home/HomePage';
import { RegistrationPage } from './features/registration/RegistrationPage';
import { GuidePage } from './features/registration/GuidePage';
import { FridgeGuidePage, ProductGuidePage } from './features/registration/FridgeGuidePage';
import { ManualEntryPage } from './features/registration/ManualEntryPage';
import { RecipeEmptyPage } from './features/recipe/RecipeEmptyPage';
import { FridgePage } from './features/fridge/FridgePage';
import { ReceiptCameraPage } from './features/receipt/ReceiptCameraPage';
import { ReceiptGuidePage } from './features/receipt/ReceiptGuidePage';
import { RecognitionResultPage } from './features/recognition/RecognitionResultPage';
import { useRecognition } from './features/recognition/useRecognition';
import { RegisteredFridgePage } from './features/fridge/RegisteredFridgePage';
import { MyPage } from './features/mypage/MyPage';
import { RegistrationToast } from './components/RegistrationToast';
import { additionalConnections, isScreenId, screens, type ScreenId } from './prototype/flow';
function readScreen(): ScreenId {
  const id = window.location.hash.slice(1);
  return isScreenId(id) ? id : '5558:18818';
}
export function App() {
  const [screen, setScreen] = useState(readScreen);
  const [captureGuide, setCaptureGuide] = useState<ScreenId>('5572:19475');
  const [showRegistrationToast, setShowRegistrationToast] = useState(false);
  const recognition = useRecognition();
  useEffect(() => {
    const onHashChange = () => { const nextScreen = readScreen(); setScreen(nextScreen); if (nextScreen !== '5572:19852') setShowRegistrationToast(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const navigate = (destination: ScreenId) => {
    if (destination === '5579:702' && (screen === '3061:13614' || screen === 'guide-fridge' || screen === '3372:3710' || screen === 'guide-product' || screen === '5572:19475')) {
      setCaptureGuide(screen === 'guide-fridge' ? '3061:13614' : screen === 'guide-product' ? '3372:3710' : screen);
    }
    setShowRegistrationToast((screen === '5572:19525' || screen === '5733:5582' || screen === 'guide-manual') && destination === '5572:19852');
    window.location.hash = destination;
  };
  const info = screens[screen];
  const onRecognize = () => { recognition.reset(); navigate('5572:19525'); };
  if (screen === '5733:5582' || screen === 'guide-manual') {
    return <div className="app-shell"><StatusBar /><ManualEntryPage navigate={navigate} /></div>;
  }
  if (screen === '3061:13614' || screen === 'guide-fridge' || screen === '3372:3710' || screen === 'guide-product' || screen === '5572:19475' || screen === '5579:702' || screen === '5572:19525') {
    return (
      <div className="app-shell screen-receipt">
        <StatusBar />
        {(screen === '3061:13614' || screen === 'guide-fridge') && <FridgeGuidePage navigate={navigate} />}
        {(screen === '3372:3710' || screen === 'guide-product') && <ProductGuidePage navigate={navigate} />}
        {screen === '5572:19475' && <ReceiptGuidePage navigate={navigate} />}
        {screen === '5579:702' && <ReceiptCameraPage navigate={navigate} backDestination={captureGuide} onRecognize={onRecognize} />}
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
      {screen === '3061:13127' && <MyPage navigate={navigate} />}
      {screen === '5744:5719' && <RecipeEmptyPage navigate={navigate} />}
      {screen.startsWith('guide-') && <GuidePage screen={screen} navigate={navigate} />}
      <BottomNavigation screen={screen} navigate={navigate} />
      {screen === '5572:19852' && showRegistrationToast && <RegistrationToast onDismiss={() => setShowRegistrationToast(false)} />}
    </div>
  );
}
