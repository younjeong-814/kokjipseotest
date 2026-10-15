/** 'YYYY-MM-DD' 키. 날짜만 다루므로 시간대 영향을 받지 않게 로컬 날짜로 만든다. */
export const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** 앱 공통 날짜 표시: '8월 31일' */
export function formatMonthDay(key: string) {
  const date = new Date(`${key}T12:00:00`);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
