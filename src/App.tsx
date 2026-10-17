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
import { FridgeFoodPage } from './features/fridge/FridgeFoodPage';
import { FridgeSearchPage } from './features/fridge/FridgeSearchPage';
import { ReceiptCameraPage } from './features/receipt/ReceiptCameraPage';
import { ReceiptGuidePage } from './features/receipt/ReceiptGuidePage';
import { RecognitionResultPage } from './features/recognition/RecognitionResultPage';
import { useRecognition } from './features/recognition/useRecognition';
import { StoredIngredientsPage } from './features/ingredients/StoredIngredientsPage';
import { useIngredients } from './features/ingredients/useIngredients';
import type { Ingredient } from './features/ingredients/repository';
import { MyPage } from './features/mypage/MyPage';
import { RegistrationToast } from './components/RegistrationToast';
import { additionalConnections, isScreenId, screens, type ScreenId } from './prototype/flow';
function readScreen(): ScreenId {
  const id = window.location.hash.slice(1);
  return isScreenId(id) ? id : 'home';
}
export function App() {
  const [screen, setScreen] = useState(readScreen);
  const [searchOrigin, setSearchOrigin] = useState<'fridge' | 'fridge-food' | 'fridge-registered'>('fridge');
  const [captureGuide, setCaptureGuide] = useState<ScreenId>('guide-receipt');
  const [showRegistrationToast, setShowRegistrationToast] = useState(false);
  const ingredients = useIngredients();
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>();
  const [registrationMessage, setRegistrationMessage] = useState('');
  const recognition = useRecognition();
  useEffect(() => {
    const onHashChange = () => { const nextScreen = readScreen(); setScreen(nextScreen); if (nextScreen !== 'fridge-registered') setShowRegistrationToast(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const navigate = (destination: ScreenId) => {
    if (destination !== 'manual-entry') setEditingIngredient(undefined);
    if (destination === 'fridge-search' && (screen === 'fridge' || screen === 'fridge-food' || screen === 'fridge-registered')) setSearchOrigin(screen);
    if (destination === 'camera' && (screen === 'guide-fridge' || screen === 'guide-product' || screen === 'guide-receipt')) setCaptureGuide(screen);
    setShowRegistrationToast((screen === 'recognition-result' || screen === 'manual-entry') && destination === 'fridge-registered');
    window.location.hash = destination;
  };
  const isSearching = screen === 'fridge-search';
  const displayScreen = isSearching ? searchOrigin : screen;
  const info = screens[displayScreen];
  const onRecognize = () => { recognition.reset(); navigate('recognition-result'); };
  if (screen === 'manual-entry') {
    return <div className="app-shell"><StatusBar /><ManualEntryPage key={editingIngredient?.id ?? 'new'} navigate={navigate} initial={editingIngredient} onSave={(draft, id) => {
      ingredients.save(draft, id);
      setRegistrationMessage(id ? '식재료를 수정했어요' : '식재료 1개를 등록했어요');
      navigate('fridge-registered');
    }} /></div>;
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
    <div className={`app-shell screen-${info.menu}${isSearching ? ' fridge-search-open' : ''}`} onClick={event => {
      if (isSearching && event.target instanceof Element && !event.target.closest('button, input, select, textarea, form, a')) navigate(searchOrigin);
    }}>
      <StatusBar />
      {isSearching ? <FridgeSearchPage navigate={navigate} onClose={() => navigate(searchOrigin)} /> : <TopHeader title={info.title} search={screen === 'fridge' || screen === 'fridge-food' || screen === 'fridge-registered' ? additionalConnections.search.destination : undefined} navigate={navigate} />}
      {ingredients.error && <p className="ingredient-error" role="alert">{ingredients.error}</p>}
      {screen === 'home' && <HomePage navigate={navigate} items={ingredients.items} />}
      {(displayScreen === 'fridge' || displayScreen === 'fridge-registered') && (ingredients.items.length ? <StoredIngredientsPage navigate={navigate} items={ingredients.items} registered={displayScreen === 'fridge-registered'} onEdit={item => { setEditingIngredient(item); navigate('manual-entry'); }} onDelete={ingredients.remove} /> : <FridgePage navigate={navigate} />)}
      {displayScreen === 'fridge-food' && <FridgeFoodPage navigate={navigate} />}
      {screen === 'registration' && <RegistrationPage navigate={navigate} />}
      {screen === 'mypage' && <MyPage navigate={navigate} />}
      {screen === 'recipe' && <RecipeEmptyPage navigate={navigate} />}
      <BottomNavigation screen={displayScreen} navigate={navigate} />
      {screen === 'fridge-registered' && showRegistrationToast && <RegistrationToast message={registrationMessage || '식재료 등록 화면입니다'} onDismiss={() => setShowRegistrationToast(false)} />}
    </div>
  );
}
