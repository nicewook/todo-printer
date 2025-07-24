---
title: Todo Printer
category: overview
created: 2025-01-16T09:00:00Z
---

# Todo Printer

Claude Desktop 에서 MCP server를 통해 프린터로 출력하는 프로젝트

## 개요

이 프로젝트는 AI 어시스턴트(Claude Desktop 등)가 텍스트 메모를 프린터로 출력할 수 있도록 하는 MCP(Model Context Protocol) 서버를 제공한다.
jlowin/fastmcp 프레임워크를 사용하여 구현되었으며, BIXOLON 열프린터에 최적화되어 있지만 CUPS 호환 프린터에서도 동작하도록 구현하는데 참고가 될 수 있다.

## 주요 기능

- **MCP 서버 통합**: jlowin/fastmcp 프레임워크를 통한 Model Context Protocol 서버 제공
- **프린터 지원**: BIXOLON SRP-330II 및 유사한 ESC/POS 프린터에 최적화
- **CUPS 통합**: 안정적인 출력을 위한 Common Unix Printing System 사용
- **텍스트 포맷팅**: 열프린터 제약사항에 맞는 자동 텍스트 래핑 및 잘라내기

## 시스템 요구사항

- Python 3.13+
- CUPS (Common Unix Printing System)
- CUPS 호환 열프린터 (BIXOLON SRP-330II에서 테스트됨)

## 설치 방법

### 1. 프로젝트 클론

```bash
git clone https://github.com/nicewook/todo-printer
cd todo-printer
```

### 2. uv를 사용한 의존성 설치

```bash
uv sync
```

### 3. CUPS 설치 및 실행

이미 설치되어 있다면 4단계로 바로 가면 된다. 

```bash
# macOS
brew install cups
brew services start cups

# Ubuntu/Debian
sudo apt-get install cups
sudo systemctl start cups
```

### 4. 프린터 확인

```bash
# 사용 가능한 프린터 목록 확인
lpstat -p
```

## Claude Desktop 설정

### 방법 1: MCP CLI를 사용한 자동 설정 (권장)

#### 1. MCP CLI 설치

```bash
# uv 설치 (이미 설치되어 있다면 건너뛰기)
brew install uv

# FastMCP 설치
uv add "fastmcp"
```

#### 2. 자동 설정

```bash
# 프로젝트 디렉토리에서 실행
uv run python mcp_server.py
```

이 명령으로 MCP 서버가 정상 실행되는지 확인한 후 수동 설정을 진행한다.

### 방법 2: 수동 설정

#### 1. uv 설치 확인

```bash
# uv가 설치되어 있는지 확인
uv --version

# macOS에서 uv 설치
brew install uv
```

#### 2. Claude Desktop 설정 파일 위치

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%userprofile%\AppData\Roaming\Claude\claude_desktop_config.json`

#### 3. 설정 파일 구성

Claude Desktop 설정 파일에 다음과 같이 추가한다:

```json
{
  "mcpServers": {
    "todo-printer": {
      "command": "/path/to/uv",
      "args": [
        "run",
        "--directory",
        "/Users/hyunseokjeong/VibeCodingProject/todo-printer",
        "mcp_server.py"
      ],
      "transport": "stdio"
    }
  }
}
```

### 설정 결과

올바르게 설정되면 Claude Desktop를 재시작하면:
- 새로운 MCP 서버 연결 아이콘이 표시되며, `print_memo`, `list_printers` 도구가 사용 가능.
- 사용자가 `>`로 시작하는 메시지나 "출력" 요청 시 자동으로 프린터 출력된다.

## 프로젝트 구조

```
todo-printer/
├── mcp_server.py          # MCP 서버 구현
├── printer.py             # 핵심 출력 로직
├── pyproject.toml         # 프로젝트 설정
├── uv.lock               # 의존성 잠금 파일
├── docs/                 # 문서
└── README.md             # 이 파일
```
