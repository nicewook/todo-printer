#!/usr/bin/env python3
"""
MCP Server for Todo Printer
FastMCP를 사용한 구현
"""

import asyncio
import sys
from datetime import datetime
from typing import Any
from concurrent.futures import ThreadPoolExecutor

from mcp.server.fastmcp import FastMCP

import printer

# FastMCP 서버 설정
mcp = FastMCP("todo-printer")
executor = ThreadPoolExecutor(max_workers=2)

def log_debug(message: str):
    """디버그 로그 (stderr로 출력)"""
    print(f"[DEBUG] {datetime.now().isoformat()} - {message}", file=sys.stderr)

async def run_sync(func, *args):
    """동기 함수를 비동기로 실행"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, func, *args)

@mcp.tool()
async def print_memo(
    text: str,
    printer_name: str = "BIXOLON_SRP_330II",
    preview: bool = False
) -> str:
    """
    텍스트를 프린터로 출력하거나 미리보기를 생성합니다.
    '>' 로 시작하거나 '출력'을 요청한 텍스트에 대해 사용합니다.
    """
    text = text.strip()
    
    # 텍스트 길이 검증
    if not text:
        return "❌ 출력할 텍스트가 비어있습니다."
    
    if len(text) > 500:
        return f"❌ 텍스트가 너무 깁니다. ({len(text)}/500자) 500자 이내로 입력하세요."
    
    try:
        if preview:
            # 미리보기 생성
            preview_text = await run_sync(printer.printer_preview, text)
            return f"📄 출력 미리보기 ({len(text)}자):\n{preview_text}"
        else:
            # 실제 출력
            success = await run_sync(printer.printer_print, text, printer_name, True)
            if success:
                return f"✅ 출력 완료: {len(text)}자"
            else:
                return f"❌ 출력 실패: {printer_name}"
    except Exception as e:
        log_debug(f"print_memo error: {str(e)}")
        return f"❌ 출력 오류: {str(e)}"

@mcp.tool()
async def list_printers() -> str:
    """
    사용 가능한 프린터 목록을 조회합니다.
    """
    try:
        printers = await run_sync(printer.printer_list)
        
        if not printers:
            return "❌ 사용 가능한 프린터가 없습니다.\n💡 CUPS에 프린터가 등록되어 있는지 확인하세요: lpstat -p"
        
        printer_list = ["🖨️  사용 가능한 프린터:"]
        for printer_name in printers:
            try:
                status = await run_sync(printer.printer_status, printer_name)
                printer_list.append(f"  ✅ {printer_name}")
                printer_list.append(f"     상태: {status}")
            except Exception as e:
                printer_list.append(f"  ❌ {printer_name} (상태 확인 실패: {str(e)})")
        
        printer_list.append(f"\n총 {len(printers)}개 프린터")
        
        return "\n".join(printer_list)
        
    except Exception as e:
        log_debug(f"list_printers error: {str(e)}")
        return f"❌ 프린터 목록 조회 실패: {str(e)}"

@mcp.tool()
async def get_printer_status(
    printer_name: str = "BIXOLON_SRP_330II"
) -> str:
    """
    특정 프린터의 상태를 확인합니다.
    """
    
    try:
        status = await run_sync(printer.printer_status, printer_name)
        
        # 상태 메시지에서 'idle'나 'processing' 같은 키워드로 가용성 판단
        is_available = "idle" in status.lower() or "accepting" in status.lower()
        status_icon = "✅" if is_available else "❌"
        
        response_text = f"📊 프린터 상태: {printer_name}\n"
        response_text += f"{status_icon} {status}\n"
        response_text += f"🕒 확인 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        return response_text
        
    except Exception as e:
        log_debug(f"get_printer_status error: {str(e)}")
        return f"❌ 프린터 상태 확인 실패: {str(e)}"

async def main():
    """메인 함수"""
    log_debug("MCP Todo Printer Server starting...")
    
    try:
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="todo-printer",
                    server_version="1.0.0",
                    capabilities=server.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={},
                    ),
                ),
            )
    except KeyboardInterrupt:
        log_debug("Server stopped by user")
    except Exception as e:
        log_debug(f"Server error: {str(e)}")
    finally:
        # ThreadPoolExecutor 정리
        executor.shutdown(wait=True)
        log_debug("MCP Todo Printer Server stopped")

if __name__ == "__main__":
    asyncio.run(main())