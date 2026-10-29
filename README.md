# 🍊 제주 스토리 (Jeju Story)

제주도 사진 갤러리 + **Supabase 회원가입/로그인** + **즐겨찾기**. Vite(바닐라 JS)로 만들고 Vercel에 배포합니다.
사진은 [Pixabay API](https://pixabay.com/api/docs/)에서 가져오며, API 키는 서버리스 함수(`api/pixabay.js`)에만 두어 브라우저에 노출되지 않습니다.

```
jejudo/
├─ api/pixabay.js        ← Vercel 서버리스 함수 (Pixabay 키는 여기서만 사용)
├─ src/                  ← 화면 (홈 / 명소 갤러리 / 로그인·회원가입 / 즐겨찾기)
├─ supabase/schema.sql   ← 즐겨찾기 테이블 + RLS 정책 (SQL Editor에서 1회 실행)
├─ .env.example          ← 환경변수 견본
└─ vite.config.js        ← 로컬 개발에서 /api/pixabay 를 흉내 내는 미들웨어 포함
```

---

## 1단계. Supabase 준비

### 1-1. API 값 복사 (환경변수 ①②)
1. Supabase 대시보드 → 프로젝트 선택 → 왼쪽 아래 ⚙️ **Project Settings → API** (상단 초록색 **Connect** 버튼에서도 볼 수 있어요)
2. 다음 두 값을 복사해 둡니다.
   - **Project URL** → `VITE_SUPABASE_URL` (예: `https://abcdxxxx.supabase.co`)
   - **anon public key** (신규 UI에서는 *Publishable key*) → `VITE_SUPABASE_ANON_KEY`
   - ⚠️ `service_role` / *secret* 키는 **절대** 사용하지 마세요. 브라우저에 노출되면 안 되는 키입니다.

### 1-2. 즐겨찾기 테이블 만들기
1. 왼쪽 메뉴 **SQL Editor → New query**
2. [`supabase/schema.sql`](supabase/schema.sql) 내용을 통째로 붙여넣고 **Run**
3. **Database → Tables** 에 `favorites` 가 생기면 성공 (RLS가 켜져 있어 내 즐겨찾기만 보여요)

### 1-3. 이메일 인증 옵션 정하기
**Authentication → Sign In / Providers → Email**
- **Confirm email 켜짐(기본)**: 가입하면 인증 메일이 가고, 링크를 눌러야 로그인됩니다. (실서비스 권장)
- **Confirm email 끔**: 가입 즉시 로그인됩니다. (개발·수업용으로 편해요)
- 무료 플랜은 인증 메일 발송 횟수 제한이 있어서, 테스트할 땐 끄는 편이 편합니다.

### 1-4. 리다이렉트 URL 등록 (배포 후에 다시 와서 한 번 더)
**Authentication → URL Configuration**
- **Site URL**: 배포된 주소 (예: `https://jeju-story.vercel.app`)
- **Redirect URLs**에 추가: `http://localhost:5173/**` 와 `https://배포주소/**`
  - 이메일 인증 링크가 이 주소로 돌아오기 때문에, 등록하지 않으면 인증 후 엉뚱한 곳으로 이동해요.

---

## 2단계. Pixabay API 키 받기 (환경변수 ③)
1. <https://pixabay.com> 회원가입/로그인
2. <https://pixabay.com/api/docs/> 접속 → 문서 중간에 **Your API key** 가 표시됩니다.
3. 그 값을 `PIXABAY_API_KEY` 로 사용합니다. **`VITE_` 를 붙이지 않습니다** (붙이면 브라우저에 노출돼요).

---

## 3단계. 로컬에서 실행해 보기 (선택)
[Node.js LTS](https://nodejs.org)가 필요합니다.

```bash
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
# .env.local 을 열어 위에서 복사한 3개 값을 채운다
npm install
npm run dev                    # http://localhost:5173
```

`.env.local` 은 `.gitignore` 에 들어 있어 GitHub에 올라가지 않습니다.

---

## 4단계. Vercel 배포

1. <https://vercel.com> → **Add New… → Project** → GitHub의 `ysyy1002/jejudo` 저장소 **Import**
2. **Configure Project** 화면에서
   - **Root Directory**: 기본값(`./`) 그대로 두면 돼요 (이 저장소 루트가 곧 프로젝트예요)
   - **Framework Preset**: Vite (자동 감지)
   - Build Command `npm run build` / Output Directory `dist` (기본값 그대로)
3. **Environment Variables** 에 3개를 추가합니다.

   | Name | Value | 비고 |
   |---|---|---|
   | `VITE_SUPABASE_URL` | Supabase Project URL | 브라우저용 (공개돼도 되는 값) |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon public key | 브라우저용 (RLS가 보호) |
   | `PIXABAY_API_KEY` | Pixabay API 키 | **서버 전용**, `VITE_` 없음 |

   Environment는 *Production / Preview / Development* 모두 체크해 두세요.
4. **Deploy** → 배포 주소가 나오면 **1-4단계(Site URL / Redirect URLs)** 를 Supabase에 등록합니다.
5. 환경변수를 나중에 추가·수정했다면 **Deployments → ⋯ → Redeploy** 해야 반영됩니다. (`VITE_*` 값은 빌드 때 코드에 박히기 때문)

---

## 동작 확인 체크리스트
- [ ] 홈/명소 화면에 제주 사진이 보인다 → `PIXABAY_API_KEY` 정상
- [ ] 회원가입 → (인증 메일 클릭) → 로그인 된다 → Supabase Authentication → Users 에 사용자가 보인다
- [ ] 사진의 ♡ 를 누르면 ♥ 로 바뀌고, **내 즐겨찾기** 페이지에 나타난다 → `favorites` 테이블 + RLS 정상
- [ ] 로그아웃 후 `#/favorites` 로 가면 로그인 페이지로 이동한다

## 자주 막히는 곳
| 증상 | 원인 / 해결 |
|---|---|
| 로그인 화면에 “Supabase 환경변수가 아직 없어요” | `VITE_SUPABASE_*` 미설정. 설정 후 **재배포/재시작** |
| 사진 자리에 “PIXABAY_API_KEY 환경변수가…” | Vercel/`.env.local` 에 `PIXABAY_API_KEY` 없음 (이름 오타 주의) |
| 가입했는데 로그인이 안 됨 | 이메일 인증 전. 메일함 확인 또는 1-3에서 Confirm email 끄기 |
| 즐겨찾기를 누르면 “저장하지 못했어요” | `schema.sql` 을 아직 실행하지 않았거나 RLS 정책 누락 |
| 인증 메일 링크가 localhost로 열림 | 1-4의 Site URL / Redirect URLs 미설정 |
| 배포 후 404 | Framework Preset이 Vite, Output Directory가 `dist` 인지 확인 |

## 보안 메모
- `anon` 키는 공개돼도 괜찮게 설계된 키이고, 데이터 보호는 **RLS 정책**이 담당합니다 (`schema.sql` 포함).
- `PIXABAY_API_KEY` 는 서버 함수에서만 읽습니다. 응답은 24시간 엣지 캐시되어 Pixabay 호출 수도 줄어요.
- Pixabay 이용 안내에 따라 사진 출처(Pixabay)를 화면에 표기했습니다.
