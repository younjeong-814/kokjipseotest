# UT 익명 계정

- 시작 시 getSession으로 기존 Google/익명 세션을 재사용합니다. 세션이 없을 때만 signInAnonymously를 호출합니다.
- React 중복 초기화는 하나의 Promise로 묶고, Web Locks 지원 브라우저에서는 탭 사이에서도 세션을 재확인합니다. 미지원 브라우저의 동시 첫 접속은 탭 간 단일 발급을 보장하지 않습니다.
- 세션 조회 오류·발급 실패는 자동 반복하지 않고 재시도를 안내합니다. 새 계정을 만들어 오류를 숨기지 않습니다.
- 익명 사용자도 authenticated 역할입니다. 기존 auth.uid() = user_id RLS와 버전 검사 RPC를 그대로 사용합니다. 데이터 초기화나 테이블 변경은 없습니다.
- 임시 ID는 Supabase user.id(UUID)입니다. URL 또는 이메일 문자열로 소유권을 판단하지 않습니다.
- Google 연결은 linkIdentity를 사용해 같은 UID를 유지합니다. 이미 존재하는 Google 계정은 별도 로그인 버튼으로 접근하며 자동 병합하지 않습니다. 계정 전환 전 서버 저장 완료를 확인하세요.
- 연결 전에는 익명 로그아웃 버튼을 노출하지 않습니다. 사이트 데이터 삭제·다른 브라우저·다른 기기는 익명 세션을 복원하지 못합니다.
- 예전 로컬 데이터는 자동 업로드/병합/삭제하지 않습니다. 소유자를 확인한 별도 가져오기 절차가 필요합니다.

## Supabase 설정

Authentication → Sign In / Providers에서 Allow anonymous sign-ins, Allow manual linking을 켭니다. Confirm email과 기존 Google 설정은 유지합니다.
공개 UT 전에 Attack Protection의 CAPTCHA와 익명 가입 rate limit을 검토하세요. CAPTCHA를 켜면 signInAnonymously에 captchaToken을 전달하는 UI 연동도 필요합니다. 현재 코드는 CAPTCHA UI를 포함하지 않습니다. 사용자별 외부 API 사용량 제한은 기존대로 적용됩니다.

## 확인

1. 기존 계정과 분리된 브라우저에서 접속 → 설정의 ‘임시 사용자의 냉장고’ 확인.
2. 재료 등록 → 저장 완료 → 새로고침/원래 URL 재접속 → 동일 기록 확인.
3. 다른 브라우저에는 해당 재료가 보이지 않아야 합니다.
4. Google 계정 연결 후 같은 재료 유지 확인. 이미 사용 중인 Google 계정은 자동 병합하지 않습니다.
5. 네트워크 실패 시 무한 발급하지 않고 재시도 안내 확인.

이메일 알림 신청·인증·D-3 예약 발송은 이 변경에 포함하지 않습니다. Google 연결이 알림 수신 동의를 의미하지 않습니다. 이메일 기반 계정 복구가 필요하다면 별도 인증 UI와 메일 발송 설정을 추가해야 합니다.

공식 문서: https://supabase.com/docs/guides/auth/auth-anonymous

## 이번 작업 검증 (2026-10-29)

- 브랜치: feature/yunjeong_anonymous-auth_v1
- Supabase 실제 프로젝트에서 위 두 설정 저장 완료. 이메일 확인 설정 유지.
- 기존 127.0.0.1:5174 Google 세션과 DB 로드 유지 확인.
- 분리된 localhost:5174에서 새 익명 세션 → 테스트 식재료 등록 → 서버 저장 완료 → 새로고침 → 목록 유지 확인. 테스트 재료 1개는 이 테스트 계정에 남겨 두었습니다.
- pnpm test: 253개 통과. pnpm build, check:build-secrets, git diff --check 통과.
- edge:check는 기존 생성 파일의 CRLF/LF 차이로 실패. recipeTypes.ts가 HEAD 내용과 동일하고 정규화하면 생성 결과와 같음을 확인했습니다. 관련 파일은 수정하지 않았습니다.
- SQL 격리 테스트는 익명 JWT/일반 JWT 조합으로 보강했으나 이번 작업에서 DB에 실행하지 않았습니다.
- Google 연결의 최종 OAuth 동의·기기 간 복원은 실제 사용자 계정으로 추가 확인해야 합니다.
- 커밋·푸시·GitHub Pages 배포는 아직 하지 않았습니다.
