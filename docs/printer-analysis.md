---
title: printer.py 파일 분석
category: technical
created: 2025-07-16T09:00:00Z
---
# printer.py 파일 분석

## 개요
`printer.py`는 BIXOLON SRP-330II 영수증 프린터를 위한 한글 텍스트 출력 스크립트입니다. CUPS(Common Unix Printing System)를 사용하여 ESC/POS 명령어로 프린터를 제어합니다.

## 주요 기능

### 1. 텍스트 처리 (Text Processing)
- **get_text_width()** (`printer.py:12`): 한글(2바이트)과 영문(1바이트) 문자의 실제 폭 계산
- **wrap_text()** (`printer.py:43`): 40자 폭으로 텍스트 자동 줄바꿈
- **truncate_to_single_line()** (`printer.py:25`): 텍스트를 한 줄로 제한하고 초과 시 자름

### 2. 출력 준비 (Print Preparation)
- **prepare_print_content()** (`printer.py:76`): 출력용 텍스트 포맷팅 (상하단 여백 추가)
- **create_esc_pos_content()** (`printer.py:95`): ESC/POS 명령어가 포함된 바이너리 데이터 생성
  - 프린터 초기화 (`\x1B\x40`)
  - 한글 지원 설정 (EUC-KR 코드페이지)
  - 가운데 정렬 설정
  - 용지 절단 명령어

### 3. 프린터 관리 (Printer Management)
- **printer_list()** (`printer.py:131`): CUPS에 등록된 프린터 목록 조회
- **printer_status()** (`printer.py:187`): 특정 프린터의 상태 확인
- **printer_print()** (`printer.py:146`): 실제 프린터 출력 실행

### 4. 미리보기 기능
- **printer_preview()** (`printer.py:89`): 출력 내용을 콘솔에서 미리보기

## 기술적 특징

### ESC/POS 명령어 지원
```python
content.append(b'\x1B\x40')        # 프린터 초기화
content.append(b'\x1B\x74\x12')    # EUC-KR 코드페이지 설정
content.append(b'\x1B\x61\x01')    # 가운데 정렬
content.append(b'\x1D\x56\x00')    # 용지 절단
```

### 한글 인코딩 처리
- 우선 EUC-KR 인코딩 시도
- 실패 시 UTF-8 인코딩으로 폴백
- 한글 문자 폭을 2로 계산하여 정확한 레이아웃 제공

### 안전한 임시 파일 처리
- `tempfile.NamedTemporaryFile`을 사용한 임시 파일 생성
- try-finally 블록으로 파일 삭제 보장 (`printer.py:164`)

## 명령줄 인터페이스

### 기본 사용법
```bash
python3 printer.py "출력할 텍스트"
```

### 주요 옵션
- `-p, --printer`: 프린터 이름 지정 (기본값: BIXOLON_SRP_330II)
- `--preview`: 출력 미리보기만 표시
- `--list-printers`: 사용 가능한 프린터 목록 표시
- `--status`: 프린터 상태 확인

## 에러 처리
- subprocess 호출 시 예외 처리
- 임시 파일 삭제 실패 시 무시 처리
- 출력 실패 시 문제 해결 가이드 제공 (`printer.py:250`)

## 의존성
- **subprocess**: CUPS 명령어 실행 (lpstat, lp)
- **tempfile**: 안전한 임시 파일 처리
- **argparse**: 명령줄 인수 파싱
- **os**: 파일 시스템 작업

## 설계 특징
- 한글과 영문이 혼재된 텍스트의 정확한 폭 계산
- ESC/POS 프린터 표준 준수
- CUPS 시스템과의 안정적인 연동
- MCP(Model Context Protocol) 호환성 (`isFromMCP` 매개변수)

## 제한사항
- 40자 폭 고정 (영수증 프린터 특성상)
- BIXOLON SRP-330II 프린터에 최적화
- macOS/Linux 환경 (CUPS 의존성)