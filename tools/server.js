import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname!=='/'&&pathname!=='/index.html'&&!pathname.startsWith('/src/'))throw Error();const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root))throw Error();const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(body);}catch{res.statusCode=404;res.end('Not found');}}).listen(14000,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:14000'));
