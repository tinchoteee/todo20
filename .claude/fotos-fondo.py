import sys, numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from rembg import remove, new_session
S=new_session("isnet-general-use")
U="/root/.claude/uploads/e655eb29-b6eb-556d-bbbf-6a2d4941695c/"
def fondo(W,H):
    # fondo de estudio: crema rosado con luz suave arriba y piso apenas más oscuro
    y=np.linspace(0,1,H)[:,None]; x=np.linspace(-1,1,W)[None,:]
    top=np.array([252,246,248.]); bot=np.array([238,226,231.])
    t=np.clip(y*1.1,0,1)[...,None]
    img=top*(1-t)+bot*t
    vign=1-0.05*(x**2)[...,None]
    return Image.fromarray(np.clip(img*vign,0,255).astype(np.uint8))
def procesar(src, box, out, lado=1400, borrar=(), claros=()):
    im=Image.open(U+src+"-image.png").convert("RGB").crop(box)
    # agrandar con buena interpolación y un poco de nitidez
    k=lado/max(im.size)*0.86
    im=im.resize((round(im.width*k),round(im.height*k)),Image.LANCZOS)
    im=im.filter(ImageFilter.UnsharpMask(radius=2,percent=60,threshold=2))
    cut=remove(im,session=S,post_process_mask=True)
    A=np.array(cut)
    esc=lambda r:[round(v*k) for v in r]
    for r in borrar:   # zonas (en coordenadas del recorte) que no son el producto
        x0,y0,x1,y1=esc(r); A[y0:y1,x0:x1,3]=0
    for r in claros:   # dentro de la zona, borrar solo lo claro (floreros) y dejar lo oscuro
        x0,y0,x1,y1=esc(r); z=A[y0:y1,x0:x1]; z[z[...,:3].mean(-1)>110,3]=0
    # borrar manchitas sueltas: quedan solo las partes grandes (el producto)
    import cv2
    n,lab,st,_=cv2.connectedComponentsWithStats((A[...,3]>30).astype(np.uint8),8)
    if n>1:
        mayor=st[1:,4].max()
        for i in range(1,n):
            if st[i,4]<mayor*0.03: A[lab==i,3]=0
    cut=Image.fromarray(A); a=cut.split()[3]
    M=np.array(a)>200
    toca=dict(t=M[:4].any(),b=M[-4:].any(),l=M[:,:4].any(),r=M[:,-4:].any())
    bb=a.getbbox(); cut=cut.crop(bb)
    bg=fondo(lado,lado)
    marg=0.9 if any(toca.values()) else 0.81
    k2=min(lado*marg/cut.width, lado*marg/cut.height)
    cut=cut.resize((round(cut.width*k2),round(cut.height*k2)),Image.LANCZOS)
    x=(lado-cut.width)//2; y=round(lado*0.52-cut.height/2)
    # lo que en la foto original seguía más allá del borde (piernas, mano) sale desde el borde
    if toca["t"]: y=0
    if toca["b"]: y=lado-cut.height
    if toca["l"] and not toca["r"]: x=0
    if toca["r"] and not toca["l"]: x=lado-cut.width
    # sombra de contacto suave
    sh=Image.new("L",(lado,lado),0)
    m=cut.split()[3].point(lambda v:255 if v>100 else 0)
    sh.paste(m,(x+10,y+18)); sh=sh.filter(ImageFilter.GaussianBlur(26)).point(lambda v:int(v*0.28))
    bg=Image.composite(Image.new("RGB",(lado,lado),(120,90,100)),bg,sh)
    bg.paste(cut,(x,y),cut)
    bg=ImageEnhance.Contrast(bg).enhance(1.03)
    bg.save(out,quality=90,optimize=True,progressive=True)
if __name__=="__main__":
    import json
    extra=json.loads(sys.argv[4]) if len(sys.argv)>4 else {}
    procesar(sys.argv[1],tuple(map(int,sys.argv[2].split(","))),sys.argv[3],**extra)
