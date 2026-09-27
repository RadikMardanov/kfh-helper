/* ============================================
   КФХ-Помощник · генератор настоящего DOCX (download-docx.js)
   Создаёт корректный файл Word (.docx), который открывается
   и на компьютере, и на телефоне — без «каракулей».
   Чистый JS, без внешних библиотек.
   ============================================ */
(function(){
"use strict";

/* ---------- CRC32 (обязателен для ZIP-контейнера) ---------- */
var CRC_TABLE=(function(){
  var t=new Int32Array(256);
  for(var n=0;n<256;n++){
    var c=n;
    for(var k=0;k<8;k++){c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);}
    t[n]=c;
  }
  return t;
})();
function crc32(buf){
  var c=0xFFFFFFFF;
  for(var i=0;i<buf.length;i++){c=CRC_TABLE[(c^buf[i])&0xFF]^(c>>>8);}
  return (c^0xFFFFFFFF)>>>0;
}

/* ---------- DOS дата/время для ZIP ---------- */
function dosDateTime(){
  var d=new Date();
  var time=(d.getHours()<<11)|(d.getMinutes()<<5)|Math.floor(d.getSeconds()/2);
  var date=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  return{time:time,date:date};
}

/* ---------- сборка ZIP (метод store, без сжатия) ---------- */
function buildZip(files){
  var enc=new TextEncoder();
  var local=[],central=[];
  var offset=0;
  var dt=dosDateTime();

  files.forEach(function(f){
    var name=enc.encode(f.name);
    var data=f.data;
    var crc=crc32(data);
    var size=data.length;

    var lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);
    lh.setUint16(4,20,true);
    lh.setUint16(6,0,true);
    lh.setUint16(8,0,true);
    lh.setUint16(10,dt.time,true);
    lh.setUint16(12,dt.date,true);
    lh.setUint32(14,crc,true);
    lh.setUint32(18,size,true);
    lh.setUint32(22,size,true);
    lh.setUint16(26,name.length,true);
    lh.setUint16(28,0,true);
    local.push(new Uint8Array(lh.buffer),name,data);

    var ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);
    ch.setUint16(4,20,true);
    ch.setUint16(6,20,true);
    ch.setUint16(8,0,true);
    ch.setUint16(10,0,true);
    ch.setUint16(12,dt.time,true);
    ch.setUint16(14,dt.date,true);
    ch.setUint32(16,crc,true);
    ch.setUint32(20,size,true);
    ch.setUint32(24,size,true);
    ch.setUint16(28,name.length,true);
    ch.setUint16(30,0,true);
    ch.setUint16(32,0,true);
    ch.setUint16(34,0,true);
    ch.setUint16(36,0,true);
    ch.setUint32(38,0,true);
    ch.setUint32(42,offset,true);
    central.push(new Uint8Array(ch.buffer),name);

    offset+=30+name.length+size;
  });

  var centralSize=central.reduce(function(s,p){return s+p.length;},0);
  var eocd=new DataView(new ArrayBuffer(22));
  eocd.setUint32(0,0x06054b50,true);
  eocd.setUint16(4,0,true);
  eocd.setUint16(6,0,true);
  eocd.setUint16(8,files.length,true);
  eocd.setUint16(10,files.length,true);
  eocd.setUint32(12,centralSize,true);
  eocd.setUint32(16,offset,true);
  eocd.setUint16(20,0,true);

  var total=offset+centralSize+22;
  var out=new Uint8Array(total);
  var pos=0;
  local.concat(central,[new Uint8Array(eocd.buffer)]).forEach(function(p){
    out.set(p,pos);pos+=p.length;
  });
  return out;
}

/* ---------- содержимое DOCX ---------- */
var CONTENT_TYPES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
'<Default Extension="xml" ContentType="application/xml"/>'+
'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
'<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
'</Types>';

var ROOT_RELS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
'</Relationships>';

var DOC_RELS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
'</Relationships>';

var STYLES_XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
'<w:docDefaults><w:rPrDefault><w:rPr>'+
'<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>'+
'<w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';

function escapeXml(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&apos;');
}

function buildDocumentXml(text){
  var lines=String(text).split('\n');
  var paras=lines.map(function(line){
    return '<w:p><w:r><w:t xml:space="preserve">'+escapeXml(line)+'</w:t></w:r></w:p>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
    '<w:body>'+paras+
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'+
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>'+
    '</w:body></w:document>';
}

/* ---------- собрать Blob ---------- */
function buildBlob(text){
  var enc=new TextEncoder();
  var files=[
    {name:'[Content_Types].xml',data:enc.encode(CONTENT_TYPES)},
    {name:'_rels/.rels',data:enc.encode(ROOT_RELS)},
    {name:'word/document.xml',data:enc.encode(buildDocumentXml(text))},
    {name:'word/_rels/document.xml.rels',data:enc.encode(DOC_RELS)},
    {name:'word/styles.xml',data:enc.encode(STYLES_XML)}
  ];
  var zip=buildZip(files);
  return new Blob([zip],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

/* ---------- скачать ---------- */
function download(text,filename){
  var blob=buildBlob(text);
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=(filename||'Документ')+'.docx';
  document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
}

window.KFHDocx={buildBlob:buildBlob,download:download};
})();