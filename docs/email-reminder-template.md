# 소비 권장일 이메일 템플릿 예시

`supabase/functions/_shared/emailTemplates.ts`의 `renderReminderEmail()`이 발송용 제목, HTML, 텍스트 본문을 만듭니다. HTML은 이메일 클라이언트 호환성을 위해 테이블 레이아웃과 인라인 스타일을 사용하며, 색상은 `src/styles/tokens.css`의 디자인 시스템 값(`#2a9df8`, `#eaf5fe`, `#d4ebfe`, `#2a3038`, `#555d6d`, `#868b94`)을 따릅니다.

```ts
const message = renderReminderEmail({
  to: 'user@example.com',
  ingredients: [
    { name: '서울우유 1L', expiryDate: '2026-10-30' },
    { name: '두부', expiryDate: '2026-10-30' },
  ],
});
// message.subject, message.html, message.text를 메일 제공자 어댑터에 전달
```

기본 링크는 GitHub Pages 주소 `https://younjeong-814.github.io/kokjipseotest/`에 현재 앱의 해시 경로를 붙입니다. 냉장고는 `#fridge`, 이메일 알림 설정은 `#settings`로 이동합니다. 배포 주소가 바뀌면 `EMAIL_APP_BASE_URL`을 갱신하고, 필요하면 개별 `fridgeUrl`·`preferencesUrl`로 덮어쓸 수 있습니다. 식재료명과 URL은 HTML 이스케이프됩니다.

현재 앱은 브라우저 저장소를 브라우저·출처별로 관리합니다. 이메일 링크를 다른 기기나 브라우저에서 열면 기존 기기의 냉장고 데이터가 자동으로 나타나지 않습니다. Google 계정 연결과 서버 저장 기능이 준비된 사용자라면 같은 계정으로 연결해 데이터를 이어서 볼 수 있습니다.

현재 이메일 worker는 기존 정책대로 planning-only이며 이 템플릿은 발송 제공자에 연결되지 않았습니다.
