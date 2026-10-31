# 팀 Gmail 인증 메일 연결

브랜치: feature/yunjeong_gmail-api_v1. GitHub Pages는 화면을 제공하고, Supabase email-verification 함수가 팀 Gmail의 gmail.send 권한으로 인증 메일을 보냅니다. 일반 사용자 Google 로그인과 발송자 OAuth는 별개입니다. 사용자가 팀 계정으로 서비스에 로그인할 필요는 없습니다.

## 직접 설정할 항목

Supabase Dashboard → Edge Functions → Secrets에 다음 이름으로 등록합니다. 실제 값은 코드·채팅·GitHub Variables·VITE_ 변수에 넣지 않습니다.

| 이름 | 값 |
| --- | --- |
| GMAIL_CLIENT_ID | Refresh Token을 발급한 OAuth 클라이언트 ID |
| GMAIL_CLIENT_SECRET | 같은 클라이언트의 Secret |
| GMAIL_REFRESH_TOKEN | 팀 Gmail에서 gmail.send에 동의하여 받은 Refresh Token |
| GMAIL_SENDER_EMAIL | 해당 토큰의 소유자인 팀 Gmail 주소 또는 승인된 발신 별칭 |
| EMAIL_VERIFICATION_PEPPER | 비밀번호 관리 도구 등에서 생성한 충분히 긴 무작위 비밀 값(32바이트 이상 권장) |

기존 EMAIL_VERIFICATION_PEPPER가 있으면 유지합니다. 바꾸면 진행 중 인증 요청이 무효화됩니다. Google OAuth Client Secret과 Refresh Token은 발급 당시 서로 같은 클라이언트여야 합니다. Supabase Google provider의 로그인용 Secret은 자동으로 Edge 함수에 전달되지 않습니다.

Google Cloud에서 Gmail API가 활성화되어 있어야 합니다. OAuth Playground를 썼다면 자체 OAuth credentials를 사용했는지 확인하세요. 외부 앱이 Testing 상태이면 gmail.send Refresh Token은 보통 7일 후 만료되므로 UT 기간 전에 재승인 또는 적절한 게시 설정을 검토해야 합니다. 이 설정을 임의로 운영 게시하지 않습니다.

## 배포와 확인

1. `node scripts/bundle-edge-functions.mjs email-verification`로 단일 파일을 생성합니다. Supabase CLI 배포 또는 Dashboard의 기존 email-verification 코드에 생성된 번들을 적용합니다.
2. 함수의 기존 내부 JWT 사용자 검사를 유지합니다. 기존 Verify JWT with legacy secret 비활성화 설정도 유지합니다.
3. 실제 서비스에서 임시 계정 연결을 확인하고, 본인이 수신 가능한 이메일을 입력한 뒤 수신 동의 후 요청합니다.
4. 실제 메일 수신 → 6자리 입력 → 인증 완료 → 설정의 인증 주소 확인을 검증합니다. 잘못된 번호·만료·재발송 제한도 확인합니다.
5. Google 발송 성공은 Gmail이 요청을 접수했다는 의미이며 받은편지함 도착까지 보장하지는 않습니다. 스팸함도 확인합니다.

보안 정보는 서버에서만 사용합니다. MIME 제목·본문은 UTF-8 및 base64, 전체 raw는 base64url로 인코딩합니다. 토큰 갱신과 발송은 HTTPS이며 비밀 값이나 Google 원본 오류는 사용자에게 반환하지 않습니다. 발송 실패·시간 초과 시 자동 재발송하지 않으며 서버의 요청 횟수 제한은 유지합니다.

## 이번 범위와 제한

인증 메일용 transport를 연결했습니다. 기존 소비기한 이메일 템플릿·예약 DB·worker는 보존되지만 자동 발송/Cron은 활성화하지 않았습니다. Gmail messages.send는 idempotency key를 제공하지 않습니다. 현재 worker의 재시도/lease 복구에 이 transport를 그대로 주입하면 중복 발송 위험이 있으므로 별도 복구·중복 처리 설계 후 연결해야 합니다. 같은 Message-ID를 지정하는 것만으로 중복 방지를 보장하지 않습니다.

실제 Secrets 등록·원격 함수 배포·수신 테스트 여부는 작업 결과 보고를 확인하세요. 로컬 모의 테스트 통과만으로 실제 발송 완료라고 판단하지 않습니다.

공식 문서: https://developers.google.com/workspace/gmail/api/guides/sending · https://developers.google.com/identity/protocols/oauth2/web-server · https://developers.google.com/identity/protocols/oauth2
