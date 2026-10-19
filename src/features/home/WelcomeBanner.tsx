export function WelcomeBanner({ hasIngredients = false }: { hasIngredients?: boolean }) {
  return <section className="banner-section"><div className="welcome-banner"><h2>{hasIngredients ? '오늘 꼭 챙겨야 할 재료가 있어요' : '우리 집 냉장고를 채워볼까요?'}</h2>{hasIngredients ? <p>소비기한이 지난 재료는 상태를 확인하고,<br/>임박한 재료로 메뉴를 추천받아 보세요.</p> : <p>식재료를 등록하면 소비기한과 남은 양을<br/>한눈에 확인할 수 있어요.</p>}</div></section>;
}
