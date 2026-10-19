import type { ReactNode } from 'react';

type Props = { title?: ReactNode; description?: ReactNode };

export function ReminderBanner({ title = '오늘 꼭 챙겨야 할 재료가 있어요', description = <>소비기한이 지난 재료는 상태를 확인하고,<br />임박한 재료로 메뉴를 추천받아 보세요.</> }: Props) {
  return <div className="welcome-banner"><h2>{title}</h2><p>{description}</p></div>;
}
