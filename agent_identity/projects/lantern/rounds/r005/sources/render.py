from pathlib import Path
from PIL import Image, ImageDraw
root=Path(r'C:\Users\alexp\Desktop\lantern\agent_identity\projects\lantern')
r=root/'rounds/r005'
def write(p,s): p.write_text(s,encoding='utf-8')
# All cubic contours are used identically in SVG and sampled Pillow rasterization.
frame=[(47,21),('C',35,32,14,46,15,65),('C',15,78,20,88,25,93),('L',29,92),('C',22,84,22,76,23,66),('C',24,50,37,34,49,23)]
right=[(51,21),('C',64,34,85,49,85,65),('C',85,78,80,88,75,93),('L',71,92),('C',78,83,78,75,77,66),('C',76,50,63,34,51,23)]
flame=[(48,29),('C',38,31,43,39,47,43),('C',54,51,39,59,33,69),('C',25,83,34,93,50,93),('C',67,93,75,84,67,72),('C',58,61,68,54,61,44),('C',57,38,45,39,48,29)]
simple=[(49,30),('C',38,35,53,41,46,51),('C',43,56,31,67,32,78),('C',32,88,40,91,50,91),('C',64,91,71,83,64,73),('C',56,62,64,56,60,47),('C',57,41,47,40,49,30)]
def pts(seq):
 out=[seq[0]]; cur=seq[0]
 for op in seq[1:]:
  if op[0]=='L':cur=op[1:];out.append(cur)
  else:
   a,b,c=op[1:3],op[3:5],op[5:7];p=cur
   for i in range(1,41):
    t=i/40;u=1-t;out.append(tuple(u**3*p[j]+3*u*u*t*a[j]+3*u*t*t*b[j]+t**3*c[j] for j in [0,1]))
   cur=c
 return out
def path(seq):return 'M '+' '.join(map(str,seq[0]))+' '+' '.join(op[0]+' '+' '.join(map(str,op[1:])) for op in seq[1:])+' Z'
def render(k,n,dark=False,eyes=True):
 scale=n*8/100; bg='#181818' if dark else '#ffffff';fg='#ffffff' if dark else '#181818'
 im=Image.new('RGB',(n*8,n*8),bg);d=ImageDraw.Draw(im)
 def poly(s):d.polygon([(x*scale,y*scale) for x,y in pts(s)],fill=fg)
 poly(frame);poly(right);poly(flame if k==1 else simple)
 box=lambda b:tuple(v*scale for v in b)
 d.ellipse(box((44,4,56,24)),fill=fg);d.ellipse(box((47,8,53,18)),fill=bg)
 d.rounded_rectangle(box((24,90,76,98)),radius=4*scale,fill=fg)
 if k==3:
  d.ellipse(box((46,7,54,17)),fill=bg)
 if eyes and k!=3:
  for b in [(46,70,49,77),(55,68,58,75)]:d.ellipse(box(b),fill=bg)
 return im.resize((n,n),Image.Resampling.LANCZOS)
for k in [1,2,3]:
 svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="currentColor">'+''.join(f'<path d="{path(s)}"/>' for s in [frame,right,flame if k==1 else simple])+'<path fill-rule="evenodd" d="M44 14a6 10 0 1 0 12 0a6 10 0 1 0 -12 0 M'+('46 12a4 5 0 1 0 8 0a4 5 0 1 0 -8 0' if k==3 else '47 13a3 5 0 1 0 6 0a3 5 0 1 0 -6 0')+'"/><rect x="24" y="90" width="52" height="8" rx="4"/></g>'
 if k!=3:svg+='<g fill="white"><ellipse cx="47.5" cy="73.5" rx="1.5" ry="3.5"/><ellipse cx="56.5" cy="71.5" rx="1.5" ry="3.5"/></g>'
 svg+='</svg>';write(r/f'sources/r005-c0{k}.svg',svg)
 write(r/f'candidates/r005-c0{k}.md',f'# r005-c0{k}\nParent: r004-c02; ancestors r003-c08/r003-c03.\nHypothesis: '+['structural reconstruction; original flame curl and small eyes','simplified flame curl; enlarged clear space below tip','c02 structure without eyes; enlarged loop counter'][k-1]+'.\nNeutral monochrome; no palette decision. Handmade vector approximation, not an identical trace. Status draft for review.\n')
 for n in [16,24,32,48,64,128,256]:
  for dark in [False,True]:
   for eyes in [False,True]:render(k,n,dark,eyes).save(r/(f'evidence/c0{k}-{n}-'+('dark' if dark else 'light')+('-eyes' if eyes else '-plain')+'.png'))
board=Image.new('RGB',(1120,1120),'#ecebea');d=ImageDraw.Draw(board)
for k in [1,2,3]:
 y=45+(k-1)*355;d.text((20,y),f'r005-c0{k}',fill='black')
 for j,n in enumerate([16,24,32,48]):
  x=130+j*235;d.text((x,y),f'{n}px / 3x nearest',fill='black')
  for dark in [False,True]:
   im=render(k,n,dark);yy=y+25+(160 if dark else 0)
   board.paste(im,(x,yy));board.paste(im.resize((n*3,n*3),Image.Resampling.NEAREST),(x+60,yy))
board.save(r/'evidence/favicon-board.png')
app=Image.new('RGB',(1000,400),'#ecebea');d=ImageDraw.Draw(app)
for k in [1,2,3]:
 app.paste(render(k,256),(20+(k-1)*330,35));d.text((20+(k-1)*330,310),f'r005-c0{k} / 256px',fill='black')
app.save(r/'evidence/app-board.png')
write(r/'evidence/method.md','# Rendering conditions\nPillow '+__import__('PIL').__version__+'; CPU geometric cubic sampling (40 segments per curve), 8x supersampling, Lanczos downsample, RGB sRGB assumed. White/#181818 polarity; negative eyes use background. SVG sources contain white eye knockouts for light preview only; use plain variants or backdrop-color eye holes for dark integration. No browser renderer equivalence claimed.\nFavicon board: native pixels at left, 3x nearest-neighbor at right (label corrected below). App exports 64/128/256. Each size exported with/without eyes. No screen-DPI or user perception validation.\nReference: r004/sheet.png case 02. Reconstruction changes curve precision, flame planes removed, base straightened; compare original before acceptance.\n')
write(r/'ROUND.md','# Round 2 / phase 2 — r005\nRequest 9; contract 2/rubric 1. Parent r004-c02, decision D0010.\nDivergence: three controlled reconstructions. Source/evidence rendered.\nCritique and next checkpoint pending visual inspection; no accepted silhouette, animation or phase closure.\n')
print(str(r))
