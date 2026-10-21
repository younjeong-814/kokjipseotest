export function WelcomeBanner({ hasIngredients = false, hasUrgentIngredients = false }: { hasIngredients?: boolean; hasUrgentIngredients?: boolean }) {
  const title = !hasIngredients ? '우리 집 냉장고를 채워볼까요?' : hasUrgentIngredients ? '오늘 꼭 챙겨야 할 재료가 있어요' : '소비기한이 임박한 재료는 없어요';
  return <section className="banner-section"><div className="welcome-banner"><h2>{title}</h2>{!hasIngredients ? <p>식재료를 등록하면 소비기한과 남은 양을<br/>한눈에 확인할 수 있어요.</p> : hasUrgentIngredients ? <p>소비기한이 지난 재료는 상태를 확인하고,<br/>임박한 재료로 메뉴를 추천받아 보세요.</p> : <p>냉장고에 있는 재료를 살펴보고,<br/>오늘 사용할 재료를 골라보세요.</p>}</div></section>;
}
