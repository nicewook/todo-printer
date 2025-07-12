#!/usr/bin/env python3
"""
MCP Server for Todo Printer
FastMCP를 사용한 단순한 동기 구현
"""

from mcp.server.fastmcp import FastMCP
import printer

# FastMCP 서버 설정
mcp = FastMCP("todo-printer")

@mcp.tool()
def print_memo(
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
            preview_text = printer.printer_preview(text)
            return f"📄 출력 미리보기 ({len(text)}자):\n{preview_text}"
        else:
            # 실제 출력
            success = printer.printer_print(text, printer_name, True)
            if success:
                return f"✅ 출력 완료: {len(text)}자"
            else:
                return f"❌ 출력 실패: {printer_name}"
    except Exception as e:
        return f"❌ 출력 오류: {str(e)}"

@mcp.tool()
def list_printers() -> str:
    """
    사용 가능한 프린터 목록을 조회합니다.
    """
    try:
        printers = printer.printer_list()
        
        if not printers:
            return "❌ 사용 가능한 프린터가 없습니다.\n💡 CUPS에 프린터가 등록되어 있는지 확인하세요: lpstat -p"
        
        printer_list = ["🖨️  사용 가능한 프린터:"]
        for printer_name in printers:
            try:
                status = printer.printer_status(printer_name)
                printer_list.append(f"  ✅ {printer_name}")
                printer_list.append(f"     상태: {status}")
            except Exception as e:
                printer_list.append(f"  ❌ {printer_name} (상태 확인 실패: {str(e)})")
        
        printer_list.append(f"\n총 {len(printers)}개 프린터")
        
        return "\n".join(printer_list)
        
    except Exception as e:
        return f"❌ 프린터 목록 조회 실패: {str(e)}"

@mcp.tool()
def get_printer_status(
    printer_name: str = "BIXOLON_SRP_330II"
) -> str:
    """
    특정 프린터의 상태를 확인합니다.
    """
    try:
        status = printer.printer_status(printer_name)
        
        # 상태 메시지에서 'idle'나 'processing' 같은 키워드로 가용성 판단
        is_available = "idle" in status.lower() or "accepting" in status.lower()
        status_icon = "✅" if is_available else "❌"
        
        from datetime import datetime
        response_text = f"📊 프린터 상태: {printer_name}\n"
        response_text += f"{status_icon} {status}\n"
        response_text += f"🕒 확인 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        return response_text
        
    except Exception as e:
        return f"❌ 프린터 상태 확인 실패: {str(e)}"

if __name__ == "__main__":
    mcp.run()