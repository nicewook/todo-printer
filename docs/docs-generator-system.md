---
title: 문서 생성 시스템 아키텍처
category: technical
created: 2025-07-18T08:30:00Z
---

# 문서 생성 시스템 아키텍처

## 개요

이 프로젝트는 마크다운 파일들을 자동으로 스캔하여 정적 HTML 문서 포털을 생성하는 시스템입니다. 단순한 문서 변환을 넘어서 테마 시스템, 실시간 감시, 설정 관리 등 현대적인 문서 관리 도구의 기능을 제공합니다.

## 시스템 아키텍처

### 핵심 구성요소

```
docs/
├── generator/                    # 문서 생성 엔진
│   ├── docs-generator.js         # 메인 생성기
│   ├── config.json              # 시스템 설정
│   ├── styles/                  # 테마 스타일
│   │   ├── default.css          # 기본 테마
│   │   ├── dark.css             # 다크 테마
│   │   └── github.css           # GitHub 테마
│   └── templates/               # HTML 템플릿
│       └── default.html         # 기본 템플릿
├── CLAUDE.md                    # Claude Code 가이드라인
├── *.md                         # 기타 문서 파일들
└── README.md                    # 프로젝트 루트 문서
```

### 데이터 흐름

1. **스캔 단계**: 마크다운 파일 탐색 및 메타데이터 추출
2. **분류 단계**: 카테고리별 그룹화 및 정렬
3. **생성 단계**: HTML 템플릿과 CSS 스타일 적용
4. **출력 단계**: 정적 HTML 파일 생성

## 주요 기능

### 1. 자동 문서 스캔

- **파일 탐색**: 프로젝트 루트 기준 절대경로 사용
- **메타데이터 추출**: Front Matter 파싱 (`gray-matter` 라이브러리)
- **카테고리 자동 분류**: YAML 헤더 기반 분류
- **파일 제외 패턴**: 와일드카드 지원 (`*temp*`, `*.bak` 등)

```javascript
// 예시: 메타데이터 추출
---
title: 문서 제목
category: technical
created: 2025-07-18T08:30:00Z
---
```

### 2. 테마 시스템

#### 다중 테마 지원
- **Default**: 기본 밝은 테마
- **Dark**: GitHub 다크 스타일
- **GitHub**: GitHub 공식 스타일

#### 테마 적용 방식
```bash
# config.json 기본 테마
npm run docs

# 명령줄 오버라이드
npm run docs:dark
npm run docs:github
```

#### 한글 타이포그래피
```css
font-family: -apple-system, BlinkMacSystemFont, 
    "Apple SD Gothic Neo", "Pretendard Variable", 
    Pretendard, "Noto Sans KR", "Malgun Gothic", 
    "Apple Color Emoji", "Segoe UI", Roboto, sans-serif;
```

### 3. 실시간 감시 모드

- **파일 변경 감지**: `chokidar` 라이브러리 사용
- **자동 재생성**: 파일 변경 시 즉시 HTML 업데이트
- **Live Server 호환**: VS Code Live Server와 완벽 연동

```bash
npm run docs:watch
```

### 4. 설정 중앙화

#### config.json 구조
```json
{
  "theme": "default",
  "title": "프로젝트 문서",
  "subtitle": "프로젝트 문서",
  "outputFile": "index.html",
  "docsDir": "docs",
  "excludeFiles": ["temp.md", "draft.md", "*temp*", "*draft*", "*.bak"],
  "categoryOrder": ["overview", "technical", "analysis", "planning", "misc"],
  "defaultCategory": "Documentation"
}
```

#### 설정 우선순위
1. 명령줄 인자 (`--theme dark`)
2. config.json 설정
3. 하드코딩된 기본값

## 기술적 특징

### 1. 프로젝트 루트 자동 탐지

```javascript
findProjectRoot() {
    let currentDir = __dirname;
    while (currentDir !== path.dirname(currentDir)) {
        if (fs.existsSync(path.join(currentDir, 'package.json'))) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }
    throw new Error('프로젝트 루트를 찾을 수 없습니다');
}
```

### 2. 절대경로 기반 경로 관리

- **이전**: `../../index.html`, `../docs/*.md`
- **현재**: `path.resolve(projectRoot, 'index.html')`
- **장점**: 명확성, 이식성, 유지보수성

### 3. 패턴 매칭 파일 제외

```javascript
isExcluded(filename) {
    return this.excludeFiles.some(pattern => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(filename);
        }
        return filename === pattern;
    });
}
```

### 4. 모듈화된 CSS 관리

```javascript
loadCSS() {
    const cssFile = path.join(this.stylesDir, `${this.theme}.css`);
    if (fs.existsSync(cssFile)) {
        return fs.readFileSync(cssFile, 'utf-8');
    }
    // 폴백 로직
}
```

## 사용자 인터페이스

### 웹 포털 기능

1. **사이드바 네비게이션**: 카테고리별 파일 목록
2. **파일 메타데이터**: 제목, 카테고리, 날짜, 경로 표시
3. **반응형 디자인**: 모바일 친화적 레이아웃
4. **검색 친화적**: 명확한 제목 구조

### 사용자 경험

- **즉시 로딩**: 첫 번째 파일 자동 선택
- **키보드 네비게이션**: 접근성 고려
- **스크롤 최적화**: 커스텀 스크롤바 스타일
- **시각적 피드백**: 호버 효과 및 전환 애니메이션

## 확장 가능성

### 1. 플러그인 아키텍처

```javascript
// 향후 확장 가능한 구조
class DocsGenerator {
    constructor(options = {}) {
        this.plugins = options.plugins || [];
        this.loadPlugins();
    }
}
```

### 2. 다중 출력 형식

- **HTML**: 현재 구현
- **PDF**: 향후 지원 예정
- **Static Site**: Gatsby/Next.js 스타일

### 3. 검색 기능

- **전문 검색**: 문서 내용 인덱싱
- **태그 시스템**: 메타데이터 기반 필터링
- **자동 완성**: 실시간 검색 제안

### 4. 국제화 지원

- **다국어 문서**: 언어별 문서 관리
- **RTL 지원**: 아랍어, 히브리어 등
- **폰트 최적화**: 언어별 최적 폰트

## 개발 워크플로우

### 1. 문서 작성 플로우

```bash
1. 마크다운 파일 생성
2. Front Matter 헤더 추가
3. 내용 작성
4. 자동 생성 또는 수동 빌드
5. Live Server로 미리보기
```

### 2. 테마 개발 플로우

```bash
1. styles/ 디렉터리에 새 CSS 파일 추가
2. config.json에 테마 정보 등록
3. package.json 스크립트 추가
4. 테스트 및 검증
```

### 3. 배포 파이프라인

```bash
# 개발 환경
npm run docs:watch

# 프로덕션 빌드
npm run docs

# 테마별 빌드
npm run docs:dark
npm run docs:github
```

## 성능 최적화

### 1. 빌드 성능

- **캐싱**: 변경되지 않은 파일 스킵
- **병렬 처리**: 여러 파일 동시 처리
- **증분 빌드**: 변경된 파일만 재처리

### 2. 런타임 성능

- **CSS 인라인**: 외부 CSS 파일 최소화
- **이미지 최적화**: 자동 리사이징 및 압축
- **번들 최적화**: 불필요한 JavaScript 제거

### 3. 메모리 최적화

- **스트리밍**: 대용량 파일 스트리밍 처리
- **가비지 컬렉션**: 메모리 누수 방지
- **리소스 정리**: 파일 핸들 적절한 해제

## 보안 고려사항

### 1. 파일 시스템 보안

- **경로 검증**: 디렉터리 탐색 공격 방지
- **권한 확인**: 파일 접근 권한 검사
- **샌드박스**: 안전한 실행 환경

### 2. 콘텐츠 보안

- **XSS 방지**: 마크다운 콘텐츠 sanitization
- **CSP 헤더**: Content Security Policy 적용
- **입력 검증**: 사용자 입력 철저한 검증

## 결론

이 문서 생성 시스템은 단순한 마크다운 변환도구에서 시작하여 현대적인 문서 관리 플랫폼으로 발전했습니다. 모듈화된 아키텍처, 테마 시스템, 실시간 감시 기능을 통해 개발자와 문서 작성자 모두에게 효율적인 도구를 제공합니다.

핵심 설계 원칙인 **단순성**, **확장성**, **사용자 경험**을 바탕으로 지속적인 개선과 발전이 가능한 시스템이 구축되었습니다.

## 다음 단계

1. **검색 기능 추가**: 전문 검색 엔진 구현
2. **플러그인 시스템**: 써드파티 확장 지원
3. **다중 사이트 지원**: 여러 프로젝트 동시 관리
4. **클라우드 연동**: GitHub Pages, Netlify 자동 배포
5. **협업 도구**: 댓글, 리뷰 시스템 통합