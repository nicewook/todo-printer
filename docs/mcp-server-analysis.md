---
title: MCP Server 구현 분석
category: technical
created: 2025-01-16T09:30:00Z
---

# MCP Server 구현 분석

## 개요

`mcp_server.py`는 jlowin/fastmcp 프레임워크를 사용하여 구현된 MCP(Model Context Protocol) 서버입니다. Claude Desktop과 같은 AI 어시스턴트가 프린터 기능에 접근할 수 있도록 하는 브리지 역할을 합니다.

## 주요 구성 요소

### 1. 서버 설정 (Server Configuration)

```python
from fastmcp import FastMCP
mcp = FastMCP("todo-printer")
```

- **프레임워크**: jlowin/fastmcp 사용 (동기적 구현)
- **서버 이름**: "todo-printer"
- **단순한 구조**: 복잡한 비동기 처리 없이 직접적인 함수 호출

### 2. 도구 함수 (Tool Functions)

#### print_memo() - 메모 출력 (`mcp_server.py:14`)

**기능**: 사용자의 텍스트를 프린터로 출력

**매개변수**:
- `todo_memo: str` - 출력할 텍스트 (필수)
- `printer_name: str` - 프린터 이름 (기본값: "BIXOLON_SRP_330II")

**핵심 특징**:
- **텍스트 수정 금지**: 사용자 입력을 원본 그대로 전달
- **한 줄 제한**: 40자 폭으로 자동 잘림 처리
- **트리거 조건**: 
  - 메시지가 '>'로 시작
  - 사용자가 '출력' 명시적 요청

**처리 과정**:
```python
# 1. 입력 검증
todo_memo = todo_memo.strip()
if not todo_memo:
    return "❌ 출력할 텍스트가 비어있습니다."

# 2. 텍스트 길이 제한
truncated_text, _ = truncate_to_single_line(todo_memo)

# 3. 프린터 출력 실행
success = printer.printer_print(truncated_text, printer_name, True)
```

#### list_printers() - 프린터 목록 조회 (`mcp_server.py:60`)

**기능**: CUPS에 등록된 프린터 목록과 상태 확인

**반환값**: 프린터 목록과 각 프린터의 상태 정보

**처리 과정**:
```python
# 1. 프린터 목록 조회
printers = printer.printer_list()

# 2. 각 프린터 상태 확인
for printer_name in printers:
    status = printer.printer_status(printer_name)
    
# 3. 포맷된 결과 반환
```

## 기술적 특징

### 1. 에러 처리 (Error Handling)

**포괄적 예외 처리**:
```python
try:
    success = printer.printer_print(truncated_text, printer_name, True)
    # ...
except (ImportError, AttributeError, RuntimeError) as e:
    return f"❌ 출력 오류: {str(e)}"
```

**처리되는 예외 유형**:
- `ImportError`: 모듈 로드 실패
- `AttributeError`: 함수/속성 접근 실패  
- `RuntimeError`: 실행 시간 오류

### 2. 텍스트 처리 최적화

**자동 길이 제한**:
- 한글/특수문자: 2자 폭
- 영문/숫자: 1자 폭
- 최대 40자 폭으로 자동 잘림

**폭 계산 예시**:
```python
# "안녕하세요 Hello" = 5*2 + 1 + 5*1 = 16자 폭
text_width = get_text_width(text)
```

### 3. 사용자 인터페이스

**직관적 상태 메시지**:
- ✅ 성공: "출력 완료: {폭}자폭"
- ❌ 실패: "출력 실패: {프린터명}"
- 🖨️ 정보: "사용 가능한 프린터:"

## MCP 통합 특징

### 1. FastMCP 데코레이터 활용

```python
@mcp.tool
def print_memo(todo_memo: str, printer_name: str = "BIXOLON_SRP_330II") -> str:
```

- **자동 등록**: 데코레이터를 통한 도구 함수 자동 등록
- **타입 힌트**: 매개변수와 반환값 타입 명시
- **독스트링**: 도구 사용법 상세 설명

### 2. AI 어시스턴트 가이드라인

**중요 지침**:
```python
"""
CRITICAL: SEND the user's original text verbatim to this function.
Do not modify, enhance, translate, or add content to todo_memo.

SINGLE LINE LIMIT: SEND ONLY ONE LINE OF TEXT.
"""
```

**사용 조건**:
- 메시지가 '>'로 시작할 때
- 사용자가 '출력' 명시적 요청 시

### 3. 프린터 모듈 연동

**의존성 관리**:
```python
import printer
from printer import get_text_width, truncate_to_single_line
```

**핵심 함수 활용**:
- `printer_print()`: 실제 출력 실행
- `printer_list()`: 프린터 목록 조회
- `printer_status()`: 프린터 상태 확인
- `get_text_width()`: 텍스트 폭 계산
- `truncate_to_single_line()`: 한 줄 제한 처리

## 서버 실행

### 메인 엔트리 포인트

```python
if __name__ == "__main__":
    mcp.run()
```

**실행 방법**:
```bash
python3 mcp_server.py
```

## 설계 철학

### 1. 단순성 (Simplicity)

- **동기 처리**: 복잡한 비동기 구조 없이 직접적인 함수 호출
- **최소 의존성**: jlowin/fastmcp와 자체 printer 모듈만 사용
- **명확한 인터페이스**: 2개의 핵심 도구 함수만 제공

### 2. 안정성 (Reliability)

- **포괄적 예외 처리**: 모든 가능한 오류 상황 대응
- **입력 검증**: 빈 텍스트, 잘못된 프린터명 등 검증
- **상태 피드백**: 명확한 성공/실패 메시지

### 3. 사용자 경험 (User Experience)

- **직관적 메시지**: 이모지와 한글을 활용한 친근한 피드백
- **자동 최적화**: 텍스트 길이 자동 조정
- **상세한 가이드라인**: AI 어시스턴트를 위한 명확한 사용법

## 한계점

### 1. 기능적 제약

- **한 줄 제한**: 40자 폭 고정, 여러 줄 지원 없음
- **프린터 종속성**: BIXOLON SRP-330II에 최적화
- **CUPS 의존성**: macOS/Linux 환경에서만 동작

### 2. 확장성 제약

- **도구 개수**: 현재 2개 도구만 제공
- **설정 옵션**: 하드코딩된 설정값들
- **로깅**: 디버깅용 로그 기능 없음

## 활용 시나리오

### 1. 일반 사용

```
사용자: > 회의 3시
AI: print_memo("회의 3시")
결과: ✅ 출력 완료: 6자폭
```

### 2. 프린터 관리

```
사용자: 프린터 목록 보여줘
AI: list_printers()
결과: 🖨️ 사용 가능한 프린터:
      ✅ BIXOLON_SRP_330II
```

### 3. 긴 텍스트 처리

```
사용자: > 이것은 매우 긴 텍스트입니다만 자동으로 잘립니다
AI: print_memo("이것은 매우 긴 텍스트입니다만 자동으로 잘립니다")
결과: ✅ 출력 완료: 40자폭 (자동 잘림)
```

## 결론

`mcp_server.py`는 jlowin/fastmcp 프레임워크를 활용한 효율적이고 직관적인 프린터 인터페이스를 제공합니다. 단순함과 안정성을 중시한 설계로, AI 어시스턴트와 프린터 간의 안정적인 브리지 역할을 수행합니다.