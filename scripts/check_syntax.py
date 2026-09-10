with open('public/js/shell.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Count brackets
parens = code.count('(') - code.count(')')
curlys = code.count('{') - code.count('}')
brackets = code.count('[') - code.count(']')

print(f"Parens balance: {parens}")
print(f"Curlys balance: {curlys}")
print(f"Brackets balance: {brackets}")
if parens == 0 and curlys == 0 and brackets == 0:
    print("Syntax balance check PASSED!")
else:
    print("Syntax balance ERROR!")
