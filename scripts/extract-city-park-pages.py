"""Extract official park headings/addresses without mistaking the City footer for a park."""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
ADDRESS = re.compile(r"^(\d+[A-Za-z]?\s+[A-Za-z0-9 .,'’\-]{1,90}\b(?:street|st|road|rd|avenue|ave|boulevard|blvd|circle|cir|drive|dr|lane|ln|way|parkway|pkwy|place|pl|court|ct|trail|trl)\.?)$", re.I)

class ParkHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack=[]; self.anchor=None; self.links=[]; self.heading=None; self.headings=[]; self.blocks=[]; self.addresses=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag not in VOID:self.stack.append((tag,attrs))
        if tag=='a':self.anchor={'href':attrs.get('href',''),'class':attrs.get('class',''),'text':''}
        if tag in ['h1','h2','h3','h4']:self.heading={'tag':tag,'text':''}
        main=any(t=='main' or a.get('role')=='main' for t,a in self.stack)
        footer=any(t=='footer' or a.get('role')=='contentinfo' for t,a in self.stack)
        if main and not footer and tag in ['h2','h3','h4','p','strong']:self.blocks.append({'tag':tag,'depth':len(self.stack),'text':''})
        if tag=='br':
            for block in self.blocks:block['text']+='\n'
    def handle_data(self,data):
        if self.anchor is not None:self.anchor['text']+=data
        if self.heading is not None:self.heading['text']+=data
        for block in self.blocks:block['text']+=data
    def handle_endtag(self,tag):
        if tag=='a' and self.anchor is not None:self.links.append(self.anchor);self.anchor=None
        if self.heading and tag==self.heading['tag']:self.headings.append(self.heading);self.heading=None
        remaining=[]
        for block in self.blocks:
            if block['tag']==tag and block['depth']==len(self.stack):
                for line in block['text'].splitlines():
                    text=' '.join(line.split())
                    if ADDRESS.fullmatch(text) and text not in self.addresses:self.addresses.append(text)
            else:remaining.append(block)
        self.blocks=remaining
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==tag:self.stack=self.stack[:i];break

text=sys.stdin.read() if sys.argv[1]=='-' else Path(sys.argv[1]).read_text()
p=ParkHTML();p.feed(text)
print(json.dumps({'links':p.links,'headings':p.headings,'addresses':p.addresses}))
