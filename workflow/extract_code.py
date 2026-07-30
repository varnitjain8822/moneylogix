import sys
import re
import os
import pathlib

def extract_code(markdown_path, output_base):
    try:
        with open(markdown_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {markdown_path}: {e}")
        return

    # Look for code blocks that start with a path comment like:
    # // src/main.rs or # src/main.py or // packages/backend/src/index.ts
    # Match: ```[lang] \n // path or # path \n code ```
    pattern = r'```[\w-]*\n(?:[/#]+\s*([a-zA-Z0-9_\-\./]+)\n)?(.*?)```'
    blocks = re.findall(pattern, content, re.DOTALL)
    
    suspicious_patterns = [
        'curl ', 'wget ', 'eval(', 'exec(', 'os.system', 'subprocess.Popen',
        'rm -rf', 'chmod +x', 'base64_decode', '__import__'
    ]
    
    extracted_count = 0
    for filepath, code in blocks:
        if filepath and filepath.strip():
            filepath = filepath.strip()
            
            # Clean up the path to be safe and relative
            filepath = re.sub(r'^/+|^\\+', '', filepath)
            
            # Avoid extracting purely generic names if they don't look like files
            if '.' not in filepath:
                continue
                
            full_path = os.path.join(output_base, filepath)
            
            # Security Scan
            is_suspicious = False
            for sp in suspicious_patterns:
                if sp in code:
                    print(f"\n⚠️ SECURITY ALERT: Suspicious pattern '{sp}' detected in {filepath}")
                    is_suspicious = True
            
            if is_suspicious:
                choice = input(f"Do you want to allow writing this potentially vulnerable file? [y/N]: ")
                if choice.lower() != 'y':
                    print(f"  [-] Skipped {filepath}")
                    continue
                    
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, 'w', encoding='utf-8') as out:
                out.write(code.strip() + '\n')
            
            print(f"  [+] Created file: {filepath}")
            extracted_count += 1
            
    if extracted_count > 0:
        print(f"Successfully extracted {extracted_count} code files to {output_base}")
    else:
        print("No code files with path headers found to extract.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 extract_code.py <markdown_file> <output_dir>")
        sys.exit(1)
    extract_code(sys.argv[1], sys.argv[2])
