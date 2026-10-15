import { useEffect, useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { StatusBar } from './components/StatusBar';
import { TopHeader } from './components/TopHeader';
import { HomePage } from './features/home/HomePage';
import { RegistrationPage } from './features/registration/RegistrationPage';
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
  return isScreenId(id) ? id : 'home';
}
export function App() {
  const [screen, setScreen] = useState(readScreen);
  const [captureGuide, setCaptureGuide] = useState<ScreenId>('guide-receipt');
  const [showRegistrationToast, setShowRegistrationToast] = useState(false);
  const recognition = useRecognition();
  useEffect(() => {
    const onHashChange = () => { const nextScreen = readScreen(); setScreen(nextScreen); if (nextScreen !== 'fridge-registered') setShowRegistrationToast(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const navigate = (destination: ScreenId) => {
    if (destination === 'camera' && (screen === 'guide-fridge' || screen === 'guide-product' || screen === 'guide-receipt')) setCaptureGuide(screen);
    setShowRegistrationToast((screen === 'recognition-result' || screen === 'manual-entry') && destination === 'fridge-registered');
    window.location.hash = destination;
  };
  const info = screens[screen];
  const onRecognize = () => { recognition.reset(); navigate('recognition-result'); };
  if (screen === 'manual-entry') {
    return <div className="app-shell"><StatusBar /><ManualEntryPage navigate={navigate} /></div>;
  }
  if (screen === 'guide-fridge' || screen === 'guide-product' || screen === 'guide-receipt' || screen === 'camera' || screen === 'recognition-result') {
    return (
      <div className="app-shell screen-receipt">
        <StatusBar />
        {screen === 'guide-fridge' && <FridgeGuidePage navigate={navigate} />}
        {screen === 'guide-product' && <ProductGuidePage navigate={navigate} />}
        {screen === 'guide-receipt' && <ReceiptGuidePage navigate={navigate} />}
        {screen === 'camera' && <ReceiptCameraPage navigate={navigate} backDestination={captureGuide} onRecognize={onRecognize} />}
        {screen === 'recognition-result' && <RecognitionResultPage navigate={navigate} recognition={recognition} />}
      </div>
    );
  }
  return (
    <div className={`app-shell screen-${info.menu}`}>
      <StatusBar />
      <TopHeader title={info.title} search={screen === 'fridge' || screen === 'fridge-registered' ? additionalConnections.search.destination : undefined} navigate={navigate} />
      {screen === 'home' && <HomePage navigate={navigate} />}
      {screen === 'fridge' && <FridgePage navigate={navigate} />}
      {screen === 'fridge-registered' && <RegisteredFridgePage navigate={navigate} />}
      {screen === 'registration' && <RegistrationPage navigate={navigate} />}
      {screen === 'mypage' && <MyPage navigate={navigate} />}
      {screen === 'recipe' && <RecipeEmptyPage navigate={navigate} />}
      <BottomNavigation screen={screen} navigate={navigate} />
      {screen === 'fridge-registered' && showRegistrationToast && <RegistrationToast onDismiss={() => setShowRegistrationToast(false)} />}
    </div>
  );
}
