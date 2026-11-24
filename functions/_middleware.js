const ADMIN_HOST="admin.lightnyu.co.uk";
const headers={"Cache-Control":"private, no-store, max-age=0","CDN-Cache-Control":"no-store","Cloudflare-CDN-Cache-Control":"no-store","Vary":"Cf-Access-Jwt-Assertion","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow, noarchive","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
const reply=(body,status=200,extra={})=>new Response(body,{status,headers:{...headers,"Content-Type":"text/plain; charset=utf-8",...extra}});
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),c=>c.charCodeAt(0));
const decode=s=>JSON.parse(new TextDecoder().decode(bytes(s)));
export async function authorized(request,env){
 const team=typeof env.ADMIN_ACCESS_TEAM==="string"?env.ADMIN_ACCESS_TEAM.trim().toLowerCase():"";
 const audience=typeof env.ADMIN_ACCESS_AUD==="string"?env.ADMIN_ACCESS_AUD.trim():"";
 const email=typeof env.ADMIN_EMAIL==="string"?env.ADMIN_EMAIL.trim().toLowerCase():"";
 if(!/^[a-z0-9][a-z0-9-]{0,62}$/.test(team)||!audience||!email)return false;
 const token=request.headers.get("Cf-Access-Jwt-Assertion");
 if(!token||token.length>16000)return false;
 try{
  const parts=token.split(".");if(parts.length!==3||parts.some(p=>!p||!/^[A-Za-z0-9_-]+$/.test(p)))return false;
  const [a,b,c]=parts,h=decode(a),p=decode(b),issuer="https://"+team+".cloudflareaccess.com",now=Math.floor(Date.now()/1000);
  if(h.alg!=="RS256"||typeof h.kid!=="string"||p.iss!==issuer||!(Array.isArray(p.aud)?p.aud.includes(audience):p.aud===audience)||!Number.isFinite(p.exp)||p.exp<=now||(p.nbf!==undefined&&(!Number.isFinite(p.nbf)||p.nbf>now))||typeof p.email!=="string"||p.email.toLowerCase()!==email||p.type!=="app")return false;
  const res=await fetch(issuer+"/cdn-cgi/access/certs",{redirect:"error",signal:AbortSignal.timeout(5000)});
  if(!res.ok)return false;
  const data=await res.json();const jwk=data.keys?.find(k=>k.kid===h.kid&&k.kty==="RSA"&&(!k.alg||k.alg==="RS256"));
  if(!jwk)return false;
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,bytes(c),new TextEncoder().encode(a+"."+b));
 }catch{return false;}
}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const csv=v=>{let s=String(v??"");if(/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/u.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
const fmt=v=>{const d=new Date(v);return Number.isNaN(+d)?esc(v):esc(d.toISOString().slice(0,16).replace("T"," ")+" UTC");};
const html=(body)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LIGHTNYU | Waitlist administration</title><style>
*{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#182d43;font:15px/1.5 system-ui,sans-serif}header{background:#10243b;color:#fff;padding:20px 5%;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}header strong{letter-spacing:.13em;font-size:20px}header small{color:#afc6dd;margin-left:12px}header a{color:#dcecff}main{max-width:1200px;margin:auto;padding:32px 20px}h1{font-size:30px;margin:0 0 4px}h2{font-size:19px;margin:0}.muted{color:#5b6c7c}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:24px 0}.stat,.panel{background:#fff;border:1px solid #d1dce7;padding:18px}.stat b{display:block;font-size:30px;line-height:1.4}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.btn,button{display:inline-block;background:#005a9c;color:white;border:1px solid #005a9c;padding:9px 15px;font:inherit;text-decoration:none;cursor:pointer}form{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}input{font:inherit;padding:9px;border:1px solid #b2c4d5;min-width:0;width:min(100%,310px)}.scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}th{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#52667b;background:#f1f5f9}th,td{padding:11px 10px;border-bottom:1px solid #e1e8ef}.pager{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:20px}.pager a{color:#005a9c}.tag{font-size:12px;color:#365675;background:#e5edf5;padding:4px 7px}.notice{font-size:13px;color:#52667b;margin-top:16px}@media(max-width:600px){main{padding:20px 12px}.stats{gap:6px}.stat{padding:10px}.stat b{font-size:24px}.stat small{font-size:11px}.panel{padding:12px}header small{display:none}}
</style></head><body><header><div><strong>LIGHTNYU</strong><small>PRIVATE ADMINISTRATION</small></div><a href="/cdn-cgi/access/logout">Sign out</a></header><main>${body}</main></body></html>`;
export async function onRequest(context){
 const {request,env}=context,url=new URL(request.url);
 if(url.hostname!==ADMIN_HOST)return context.next();
 if(!["/","/export.csv"].includes(url.pathname))return reply("Not found",404);
 if(request.method!=="GET")return reply("Method not allowed",405,{"Allow":"GET"});
 if(!await authorized(request,env))return reply("Access denied. The private dashboard requires a valid Cloudflare Access session.",403);
 if(!env.DB)return reply("Database unavailable.",503);
 try{
  const exists=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='subscribers'").first();
  if(url.pathname==="/export.csv"){
   const rows=exists?(await env.DB.prepare("SELECT email,created_at,consent_version,status FROM subscribers ORDER BY id DESC LIMIT 10001").all()).results:[];
   if(rows.length>10000)return reply("Export exceeds 10,000 rows. Contact the administrator to use a paginated export.",413);
   const output="\uFEFF"+["Email,Registered (UTC),Consent version,Status",...rows.map(r=>[r.email,r.created_at,r.consent_version,r.status].map(csv).join(","))].join("\r\n")+"\r\n";
   return reply(output,200,{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="lightnyu-waitlist.csv"'});
  }
  const query=(url.searchParams.get("q")||"").trim().slice(0,120);
  const now=new Date(),today=now.toISOString().slice(0,10),week=new Date(+now-7*86400000).toISOString();
  const totals=exists?await env.DB.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN substr(created_at,1,10)=? THEN 1 ELSE 0 END),0) AS today,COALESCE(SUM(CASE WHEN created_at>=? THEN 1 ELSE 0 END),0) AS week FROM subscribers").bind(today,week).first():{total:0,today:0,week:0};
  const count=exists&&query?(await env.DB.prepare("SELECT COUNT(*) AS n FROM subscribers WHERE instr(lower(email),lower(?))>0").bind(query).first()).n:totals.total;
  const pages=Math.max(1,Math.ceil(count/50)),page=Math.max(1,Math.min(pages,Number.parseInt(url.searchParams.get("page")||"1",10)||1));
  const rows=exists?(await env.DB.prepare("SELECT email,created_at,consent_version,status FROM subscribers WHERE instr(lower(email),lower(?))>0 OR ?='' ORDER BY id DESC LIMIT 50 OFFSET ?").bind(query,query,(page-1)*50).all()).results:[];
  const link=n=>"/?"+new URLSearchParams({q:query,page:String(n)}).toString();
  const table=rows.length?rows.map(r=>`<tr><td>${esc(r.email)}</td><td>${fmt(r.created_at)}</td><td><span class="tag">${esc(r.status)}</span></td><td>${esc(r.consent_version)}</td></tr>`).join(""):'<tr><td colspan="4" class="muted">No matching registrations.</td></tr>';
  return reply(html(`<h1>Launch waitlist</h1><div class="muted">Subscriber interest · Private · Read only</div><div class="stats"><div class="stat"><small>Total registrations</small><b>${esc(totals.total)}</b></div><div class="stat"><small>Today (UTC)</small><b>${esc(totals.today)}</b></div><div class="stat"><small>Last 7 days</small><b>${esc(totals.week)}</b></div></div><section class="panel"><div class="toolbar"><h2>Registered email addresses</h2><a class="btn" href="/export.csv">Download for Excel (.csv)</a></div><form action="/" method="get"><input name="q" type="search" aria-label="Search email addresses" placeholder="Search email address…" value="${esc(query)}" maxlength="120" autocomplete="off"><button type="submit">Search</button>${query?'<a class="btn" href="/">Clear</a>':''}</form><div class="scroll"><table><thead><tr><th>Email address</th><th>Registered</th><th>Status</th><th>Consent version</th></tr></thead><tbody>${table}</tbody></table></div><div class="pager">${page>1?'<a href="'+esc(link(page-1))+'">Previous</a>':''}<span>Page ${page} of ${pages} · ${esc(count)} matching records</span>${page<pages?'<a href="'+esc(link(page+1))+'">Next</a>':''}</div></section><p class="notice">10% launch offer · Email ownership has not been verified. No confirmation emails are sent. Keep exported files private.</p>`),200,{"Content-Type":"text/html; charset=utf-8"});
 }catch{return reply("Dashboard unavailable. Please retry later.",503);}
}
