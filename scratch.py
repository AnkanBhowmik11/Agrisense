import sys

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
        
    stack = []
    line_num = 1
    col_num = 1
    
    for i, char in enumerate(content):
        if char == '\n':
            line_num += 1
            col_num = 1
            continue
            
        if char in '({[':
            stack.append((char, line_num, col_num))
        elif char in ')}]':
            if not stack:
                print(f"Unmatched {char} at line {line_num}:{col_num}")
                return
            
            last_char, last_line, last_col = stack.pop()
            
            pairs = {'(': ')', '{': '}', '[': ']'}
            if pairs[last_char] != char:
                print(f"Mismatched {char} at line {line_num}:{col_num}, expected {pairs[last_char]} to close {last_char} at {last_line}:{last_col}")
                return
                
        col_num += 1
        
    if stack:
        for char, line, col in stack:
            print(f"Unclosed {char} starting at line {line}:{col}")
            
check_braces('src/pages/Analytics/AnalyticsHub.jsx')
