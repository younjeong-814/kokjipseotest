import { useEffect, useRef, useState } from 'react';
import { BottomNavigation } from './components/BottomNavigation';
import { StatusBar } from './components/StatusBar';
import { TopHeader } from './components/TopHeader';
import { HomePage } from './features/home/HomePage';
import { RegistrationPage } from './features/registration/RegistrationPage';
import { FridgeGuidePage, ProductGuidePage } from './features/registration/FridgeGuidePage';
import { ManualEntryPage } from './features/registration/ManualEntryPage';
import { RecipeEmptyPage } from './features/recipe/RecipeEmptyPage';
import { RecipeResultsPage } from './features/recipe/RecipeResultsPage';
import { RecipeDetailPage } from './features/recipe/RecipeDetailPage';
import { toRecipeDetail, toRecipeSummary } from './features/recipe/apiPresentation';
import type { Recipe } from './features/recipe/types';
import { RecipePage } from './features/recipe/RecipePage';
import { RecipeResults } from './features/recipe/RecipeResults';
import { matchIngredient } from './features/ingredients/classify';
import { RecipeNoUrgentPage } from './features/recipe/RecipeNoUrgentPage';
import { selectRecipeIngredients } from './features/recipe/selectRecipeIngredients';
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
import { useDashboardReports } from './features/mypage/useDashboardReports';

import { MyPage } from './features/mypage/MyPage';
import { WeeklyReportPage } from './features/report/WeeklyReportPage';
import { buildWeeklyReport, loadHistory } from './features/report/weeklyReport';
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
  const dashboard = useDashboardReports(ingredients.items, ingredients.error);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | undefined>();
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [detailId, setDetailId] = useState(readDetailId);
  const [detailOrigin, setDetailOrigin] = useState<'home' | 'fridge' | 'fridge-registered' | 'fridge-food'>('fridge-registered');
  const [editingFromDetail, setEditingFromDetail] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');
  // 레시피 화면에서 고른 재료. 추천 결과 화면과 '다른 임박 재료 선택'으로 돌아올 때 유지한다.
  const [openedRecipe, setOpenedRecipe] = useState<Recipe | null>(null);
  const [recipeSelection, setRecipeSelection] = useState<string[] | undefined>();
  const registering = useRef(false);
  const recognition = useRecognition();
  useEffect(() => {
    const onHashChange = () => { const nextScreen = readScreen(); setScreen(nextScreen); setDetailId(readDetailId()); if (nextScreen !== 'fridge-registered' && nextScreen !== 'fridge-food') setShowRegistrationToast(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const navigate = (destination: ScreenId) => {
    if (destination !== 'manual-entry') setEditingIngredient(undefined);
    if (destination === 'fridge-search' && (screen === 'fridge' || screen === 'fridge-food' || screen === 'fridge-registered')) setSearchOrigin(screen);
    if (destination === 'camera' && (screen === 'guide-fridge' || screen === 'guide-product' || screen === 'guide-receipt')) setCaptureGuide(screen);
    setShowRegistrationToast((screen === 'recognition-result' || screen === 'manual-entry') && (destination === 'fridge-registered' || destination === 'fridge-food'));
    window.location.hash = destination;
  };
  const isSearching = screen === 'fridge-search';
  const displayScreen = isSearching ? searchOrigin : screen;
  const ingredientItems = ingredients.items.filter(item => !isFood(item));
  const foodItems = ingredients.items.filter(isFood);
  const hasRecipeSelection = ingredientItems.some(item => recipeSelection?.includes(item.id));
  // 새로고침 등으로 선택한 재료가 없으면 재료 선택 화면으로 돌아간다.
  useEffect(() => { if ((screen === 'recipe-no-result' || screen === 'recipe-results') && !hasRecipeSelection) window.location.replace('#recipe'); }, [screen, hasRecipeSelection]);
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
    // 국·찌개·밀키트 같은 음식은 냉장고 음식 탭에 들어간다. 모두 음식이면 음식 탭을 연다.
    const foods = drafts.filter(isFood).length;
    const ingredientsCount = drafts.length - foods;
    const message = [ingredientsCount && `식재료 ${ingredientsCount}개`, foods && `음식 ${foods}개`].filter(Boolean).join(', ');
    try { registering.current = true; ingredients.saveRecognized(drafts); setRegistrationMessage(`${message}를 등록했어요`); navigate(ingredientsCount ? 'fridge-registered' : 'fridge-food'); }
    catch (failure) { registering.current = false; setRecognitionError(failure instanceof Error ? failure.message : '저장하지 못했어요.'); }
  };
  if (screen === 'recipe-detail') {
    const id = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('recipe');
    return <div className="app-shell"><StatusBar />{openedRecipe && openedRecipe.id === id ? <><RecipeDetailPage recipe={toRecipeDetail(openedRecipe)} onBack={() => navigate('recipe-results')} /><p className="recipe-source">출처: 농림수산식품교육문화정보원</p></> : <main className="ingredient-not-found"><p>레시피 목록에서 다시 선택해 주세요.</p><button onClick={() => navigate('recipe')}>재료 선택으로 가기</button></main>}</div>;
  }
  if (screen === 'recipe-results') {
    const selected = (recipeSelection ?? []).flatMap(id => ingredientItems.filter(item => item.id === id));
    if (!selected.length) return null;
    const names = [...new Set(selected.map(item => matchIngredient(item.name)?.keyword ?? item.name.trim()))];
    return <div className="app-shell"><StatusBar /><RecipeResults key={JSON.stringify(names)} ingredients={names} selectionContext={{ selected, onBack: () => navigate('recipe'), onReselect: () => navigate('recipe') }} renderResults={(data, pagination) => <><RecipeResultsPage recipes={data.recipes.map(recipe => toRecipeSummary(recipe, names))} selectedIngredients={selected.map(item => item.name)} onBack={() => navigate('recipe')} onOpen={id => { const recipe = data.recipes.find(item => item.id === id); if (recipe) { setOpenedRecipe(recipe); window.location.hash = `recipe-detail?recipe=${encodeURIComponent(id)}`; } }} footer={<footer className="recipe-results-footer">{pagination}<p className="recipe-source">출처: 농림수산식품교육문화정보원</p></footer>} /></>} /><BottomNavigation screen={screen} navigate={navigate} /></div>;
  }
  if (screen === 'weekly-report') {
    return <div className="app-shell"><StatusBar /><WeeklyReportPage report={buildWeeklyReport(ingredients.items, loadHistory(localStorage))} onBack={() => navigate('mypage')} /><BottomNavigation screen={screen} navigate={navigate} /></div>;
  }
  if (screen === 'ingredient-detail') {
    const item = ingredients.items.find(value => value.id === detailId);
    return <div className="app-shell"><StatusBar />{item ? <IngredientDetailPage key={item.id} item={item} onBack={() => navigate(detailOrigin)} onEdit={patch => ingredients.updateInfo(item.id, patch)} onSave={patch => ingredients.updateDetails(item.id, patch)} onCondition={status => ingredients.recordCondition(item.id, status)} onDiscard={() => { ingredients.remove(item.id); navigate(detailOrigin); }} onConsume={() => { ingredients.consume(item.id); navigate(detailOrigin); }} /> : <main className="ingredient-not-found"><p role="alert">{ingredients.error || '식재료를 찾을 수 없어요. 삭제된 항목인지 확인해 주세요.'}</p><button onClick={() => navigate('fridge')}>냉장고로 돌아가기</button></main>}</div>;
  }
  if (screen === 'recipe-no-result') {
    // 재료 선택 화면과 같은 순서(임박순)로 보여준다.
    const selected = (recipeSelection ?? []).flatMap(id => ingredientItems.filter(item => item.id === id));
    if (!selected.length) return null;
    const names = [...new Set(selected.map(item => matchIngredient(item.name)?.keyword ?? item.name.trim()))];
    return <div className="app-shell"><StatusBar /><RecipeResults key={JSON.stringify(names)} ingredients={names} selectionContext={{ selected, onBack: () => navigate('recipe'), onReselect: () => navigate('recipe') }} /></div>;
  }
  // 식재료는 있지만 D-3 이내·기한경과 재료가 없으면 탭바 없는 안내 화면을 보여준다. 식재료가 아예 없으면 아래 RecipeEmptyPage.
  if (screen === 'recipe' && ingredientItems.length && !selectRecipeIngredients(ingredientItems, new Date()).length) {
    return <div className="app-shell"><StatusBar /><RecipeNoUrgentPage onBack={() => navigate('home')} onOpenFridge={() => navigate('fridge')} /></div>;
  }
  if (screen === 'manual-entry') {
    return <div className="app-shell"><StatusBar /><ManualEntryPage key={editingIngredient?.id ?? 'new'} navigate={navigate} initial={editingIngredient} onCancel={editingFromDetail && editingIngredient ? () => openDetail(editingIngredient) : undefined} onSave={(draft, id) => {
      ingredients.save(draft, id);
      const noun = isFood(draft) ? '음식' : '식재료';
      setRegistrationMessage(id ? `${noun}${noun === '음식' ? '을' : '를'} 수정했어요` : `${noun} 1개를 등록했어요`);
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
      {(displayScreen === 'fridge' || displayScreen === 'fridge-registered') && (ingredientItems.length ? <StoredIngredientsPage key={displayScreen} navigate={navigate} items={ingredientItems} registered={displayScreen === 'fridge-registered'} onOpen={item => { setDetailOrigin(displayScreen === 'fridge-registered' ? 'fridge-registered' : 'fridge'); openDetail(item); }} onDelete={ingredients.remove} /> : <FridgePage navigate={navigate} />)}
      {displayScreen === 'fridge-food' && (foodItems.length ? <StoredIngredientsPage key="food" food navigate={navigate} items={foodItems} onOpen={item => { setDetailOrigin('fridge-food'); openDetail(item); }} onDelete={ingredients.remove} /> : <FridgeFoodPage navigate={navigate} />)}
      {screen === 'registration' && <RegistrationPage navigate={navigate} />}
      {screen === 'mypage' && <MyPage navigate={navigate} report={buildWeeklyReport(ingredients.items, loadHistory(localStorage))} registeredCount={ingredientItems.length} reports={dashboard.reports} error={dashboard.error} />}
      {screen === 'recipe' && (ingredientItems.length ? <RecipePage items={ingredientItems} initialSelected={recipeSelection} onRecommend={selected => { setRecipeSelection(selected.map(item => item.id)); navigate('recipe-results'); }} /> : <RecipeEmptyPage navigate={navigate} />)}
      <BottomNavigation screen={displayScreen} navigate={navigate} />
      {(screen === 'fridge-registered' || screen === 'fridge-food') && showRegistrationToast && <RegistrationToast message={registrationMessage || '식재료 등록 화면입니다'} onDismiss={() => setShowRegistrationToast(false)} />}
    </div>
  );
}
