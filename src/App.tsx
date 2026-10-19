import { useEffect, useRef, useState } from 'react';
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
import { IngredientDetailPage } from './features/ingredients/IngredientDetailPage';
import { recognizeReceipt } from './features/receipt/ocr';
import { defaultStorage } from './features/ingredients/expiry';
import { toDateKey } from './lib/date';
import { StoredIngredientsPage } from './features/ingredients/StoredIngredientsPage';
import { useIngredients } from './features/ingredients/useIngredients';
import type { Ingredient } from './features/ingredients/repository';
import { isFood } from './features/ingredients/expiry';
import { MyPage } from './features/mypage/MyPage';
import { RegistrationToast } from './components/RegistrationToast';
import { additionalConnections, isScreenId, screens, type ScreenId } from './prototype/flow';
function readScreen(): ScreenId {
  const id = window.location.hash.slice(1).split('?')[0];
  return isScreenId(id) ? id : 'home';
}
const readDetailId = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('item');
export function App() {
  const [screen, setScreen] = useState(readScreen);
  const [searchOrigin, setSearchOrigin] = useState<'fridge' | 'fridge-food' | 'fridge-registered'>('fridge');
  const [captureGuide, setCaptureGuide] = useState<ScreenId>('guide-receipt');
  const [showRegistrationToast, setShowRegistrationToast] = useState(false);
  const ingredients = useIngredients();
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>();
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [detailId, setDetailId] = useState(readDetailId);
  const [detailOrigin, setDetailOrigin] = useState<'home' | 'fridge' | 'fridge-registered' | 'fridge-food'>('fridge-registered');
  const [editingFromDetail, setEditingFromDetail] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');
  const registering = useRef(false);
  const recognition = useRecognition();
  useEffect(() => {
    const onHashChange = () => { const nextScreen = readScreen(); setScreen(nextScreen); setDetailId(readDetailId()); if (nextScreen !== 'fridge-registered') setShowRegistrationToast(false); window.scrollTo(0, 0); };
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
  const ingredientItems = ingredients.items.filter(item => !isFood(item));
  const foodItems = ingredients.items.filter(isFood);
  const info = screens[displayScreen];
  // 영수증 가이드에서 들어온 촬영만 OCR을 거친다. 냉장고·상품 촬영 인식은 아직 샘플 결과를 보여준다.
  const onCapture = async (image: string) => {
    const receipt = captureGuide === 'guide-receipt' ? await recognizeReceipt(image) : null;
    registering.current = false;
    setRecognitionError('');
    if (receipt) recognition.showReceipt(receipt);
    else recognition.showSample();
    navigate('recognition-result');
  };
  const openDetail = (item: Ingredient) => { window.location.hash = `ingredient-detail?item=${encodeURIComponent(item.id)}`; };
  const registerRecognized = () => {
    if (registering.current) return;
    // 보관 시작일은 결과 화면의 날짜(영수증 구매일 또는 촬영일)다. 미래 날짜면 등록일을 쓴다.
    const storageStartedOn = recognition.date <= toDateKey(new Date()) ? recognition.date : undefined;
    const drafts = recognition.items.map(item => ({ name: item.name, category: item.category, storage: defaultStorage(item.name), quantity: item.quantity, unit: '개', date: '', storageStartedOn, source: captureGuide === 'guide-receipt' ? 'ocr' as const : 'camera' as const }));
    if (!drafts.length) { setRecognitionError('등록할 식재료가 없어요. 다시 촬영해 주세요.'); return; }
    try { registering.current = true; ingredients.saveRecognized(drafts); setRegistrationMessage(`식재료 ${drafts.length}개를 등록했어요`); navigate('fridge-registered'); }
    catch (failure) { registering.current = false; setRecognitionError(failure instanceof Error ? failure.message : '저장하지 못했어요.'); }
  };
  if (screen === 'ingredient-detail') {
    const item = ingredients.items.find(value => value.id === detailId);
    return <div className="app-shell"><StatusBar />{item ? <IngredientDetailPage key={item.id} item={item} onBack={() => navigate(detailOrigin)} onEdit={patch => ingredients.updateInfo(item.id, patch)} onSave={patch => ingredients.updateDetails(item.id, patch)} onCondition={status => ingredients.recordCondition(item.id, status)} /> : <main className="ingredient-not-found"><p role="alert">{ingredients.error || '식재료를 찾을 수 없어요. 삭제된 항목인지 확인해 주세요.'}</p><button onClick={() => navigate('fridge')}>냉장고로 돌아가기</button></main>}</div>;
  }
  if (screen === 'manual-entry') {
    return <div className="app-shell"><StatusBar /><ManualEntryPage key={editingIngredient?.id ?? 'new'} navigate={navigate} initial={editingIngredient} onCancel={editingFromDetail && editingIngredient ? () => openDetail(editingIngredient) : undefined} onSave={(draft, id) => {
      ingredients.save(draft, id);
      setRegistrationMessage(id ? '식재료를 수정했어요' : '식재료 1개를 등록했어요');
      if (id && editingFromDetail && editingIngredient) openDetail(editingIngredient);
      else navigate(isFood(draft) ? 'fridge-food' : 'fridge-registered');
    }} /></div>;
  }
  if (screen === 'guide-fridge' || screen === 'guide-product' || screen === 'guide-receipt' || screen === 'camera' || screen === 'recognition-result') {
    return (
      <div className="app-shell screen-receipt">
        <StatusBar />
        {screen === 'guide-fridge' && <FridgeGuidePage navigate={navigate} />}
        {screen === 'guide-product' && <ProductGuidePage navigate={navigate} />}
        {screen === 'guide-receipt' && <ReceiptGuidePage navigate={navigate} />}
        {screen === 'camera' && <ReceiptCameraPage navigate={navigate} backDestination={captureGuide} onCapture={onCapture} />}
        {recognitionError && <p className="ingredient-error" role="alert">{recognitionError}</p>}
        {screen === 'recognition-result' && <RecognitionResultPage navigate={navigate} recognition={recognition} onRegister={registerRecognized} />}
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
      {screen === 'home' && <HomePage navigate={navigate} items={ingredients.items} onOpen={item => { setDetailOrigin('home'); openDetail(item); }} />}
      {(displayScreen === 'fridge' || displayScreen === 'fridge-registered') && (ingredientItems.length ? <StoredIngredientsPage key={displayScreen} navigate={navigate} items={ingredientItems} registered={displayScreen === 'fridge-registered'} onOpen={item => { setDetailOrigin(displayScreen === 'fridge-registered' ? 'fridge-registered' : 'fridge'); openDetail(item); }} /> : <FridgePage navigate={navigate} />)}
      {displayScreen === 'fridge-food' && (foodItems.length ? <StoredIngredientsPage key="food" food navigate={navigate} items={foodItems} onOpen={item => { setDetailOrigin('fridge-food'); openDetail(item); }} /> : <FridgeFoodPage navigate={navigate} />)}
      {screen === 'registration' && <RegistrationPage navigate={navigate} />}
      {screen === 'mypage' && <MyPage navigate={navigate} />}
      {screen === 'recipe' && <RecipeEmptyPage navigate={navigate} />}
      <BottomNavigation screen={displayScreen} navigate={navigate} />
      {screen === 'fridge-registered' && showRegistrationToast && <RegistrationToast message={registrationMessage || '식재료 등록 화면입니다'} onDismiss={() => setShowRegistrationToast(false)} />}
    </div>
  );
}
