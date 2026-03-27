import subprocess, os, sys
os.chdir(r'C:\Users\smartan\source\code\code\portfolio-ai\dg-video-scrubber')
cwd = r'C:\Users\smartan\source\code\code\portfolio-ai\dg-video-scrubber'

print('=== node setup.mjs ===')
r1 = subprocess.run(['node', 'setup.mjs'], capture_output=True, text=True, cwd=cwd)
print(r1.stdout)
print(r1.stderr)
print('rc:', r1.returncode)

print('=== npm install ===')
r2 = subprocess.run('npm install', capture_output=True, text=True, shell=True, cwd=cwd)
print(r2.stdout[-3000:])
print(r2.stderr[-2000:])
print('rc:', r2.returncode)

print('=== npm run build ===')
r3 = subprocess.run('npm run build', capture_output=True, text=True, shell=True, cwd=cwd)
print(r3.stdout)
print(r3.stderr)
print('rc:', r3.returncode)
