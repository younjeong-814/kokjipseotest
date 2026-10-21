import { useEffect, useState } from 'react';
import type { Ingredient } from '../ingredients/repository';
import { loadHistory } from '../report/weeklyReport';
import { syncActivities } from './activityLog';
import { reportsFromActivities, applyDailyScores } from './statistics';
import { pendingReports } from './report';
export function useDashboardReports(items: Ingredient[], ingredientError: string) {
  const [state,setState] = useState({reports:pendingReports(0),error:''});
  useEffect(() => {
    const refresh = () => {
      try {
        if (ingredientError) throw new Error(ingredientError);
        const events = syncActivities(localStorage,items,loadHistory(localStorage));
        const reports = reportsFromActivities(events);
        try { applyDailyScores(localStorage,reports,events); }
        catch { setState({reports,error:'관리점수를 읽거나 저장하지 못했어요. 저장 설정 확인 후 새로고침해 주세요.'}); return; }
        setState({reports,error:''});
      } catch { setState(previous => ({...previous,error:'리포트를 불러오지 못했어요. 저장 설정 확인 후 새로고침해 주세요.'})); }
    };
    refresh();
    const timer = window.setInterval(refresh,30000);
    window.addEventListener('storage',refresh);
    document.addEventListener('visibilitychange',refresh);
    return () => {window.clearInterval(timer);window.removeEventListener('storage',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[items,ingredientError]);
  return state;
}
