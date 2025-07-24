#!/usr/bin/env python3
"""
MCP Server for Todo Printer
FastMCP를 사용한 단순한 동기 구현
"""

from fastmcp import FastMCP
import printer
from printer import get_text_width, truncate_to_single_line

# FastMCP 서버 설정
mcp = FastMCP("todo-printer")

@mcp.tool
def print_memo(
    todo_memo: str,
    printer_name: str = "BIXOLON_SRP_330II"
) -> str:
    """
    Print todo_memo exactly as provided for messages starting with '>' or requesting '출력'.
    
    CRITICAL: SEND the user's original text verbatim to this function.
    Do not modify, enhance, translate, or add content to todo_memo. 
    
    
    SINGLE LINE LIMIT: SEND ONLY ONE LINE OF TEXT.
    Text is automatically truncated to fit one line (40 character width).
    Korean/special characters count as 2 width, English/numbers as 1 width.
  
    
    You must use this tool when:
    - User message starts with '>'
    - User explicitly requests '출력' (printing/output)
    
    Args:
        todo_memo: The exact text to print (automatically truncated to single line if needed)
        printer_name: Target printer device name
    
    Returns:
        Print status message
    """
    todo_memo = todo_memo.strip()
    
    # 텍스트 길이 검증
    if not todo_memo:
        return "❌ 출력할 텍스트가 비어있습니다."
    
    # 한 줄로 제한 (40자 폭)
    truncated_text, _ = truncate_to_single_line(todo_memo)
    
    try:
        success = printer.printer_print(truncated_text, printer_name, True)
        if success:
            return f"✅ 출력 완료: {get_text_width(truncated_text)}자폭"
        else:
            return f"❌ 출력 실패: {printer_name}"
    except (ImportError, AttributeError, RuntimeError) as e:
        return f"❌ 출력 오류: {str(e)}"

@mcp.tool
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
            except (ImportError, AttributeError, RuntimeError) as e:
                printer_list.append(f"  ❌ {printer_name} (상태 확인 실패: {str(e)})")
        
        printer_list.append(f"\n총 {len(printers)}개 프린터")
        
        return "\n".join(printer_list)
        
    except (ImportError, AttributeError, RuntimeError) as e:
        return f"❌ 프린터 목록 조회 실패: {str(e)}"


if __name__ == "__main__":
    mcp.run()