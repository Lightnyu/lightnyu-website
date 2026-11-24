const HOST="lightnyu.co.uk";
const CONSENT_VERSION="launch-email-only-v1";
const respond=(status,data)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function onRequest({request,env}){
 if(request.method!=="POST")return respond(405,{error:"Method not allowed."});
 if(new URL(request.url).hostname!==HOST||request.headers.get("Origin")!=="https://"+HOST)return respond(403,{error:"Please register on the official Lightnyu website."});
 if(!env.DB||!env.TURNSTILE_SECRET_KEY)return respond(503,{error:"Registration is temporarily unavailable. Please try again later."});
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type")||""))return respond(415,{error:"Invalid request."});
 let data;
 try{
  const reader=request.body.getReader();let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();return respond(413,{error:"Request too large."});}chunks.push(value);}
  const bytes=new Uint8Array(size);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.byteLength;}
  data=JSON.parse(new TextDecoder().decode(bytes));
 }catch{return respond(400,{error:"Invalid request."});}
 if(!data||typeof data!=="object"||Array.isArray(data))return respond(400,{error:"Invalid request."});
 if(data.website)return respond(400,{error:"Registration could not be processed."});
 const email=typeof data.email==="string"?data.email.trim().toLowerCase():"";
 if(email.length>254||email.split("@")[0].length>64||!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)||data.consent!==true)return respond(400,{error:"Enter a valid email and accept the launch email consent."});
 const token=data.turnstileToken;
 if(typeof token!=="string"||!token||token.length>2048)return respond(400,{error:"Please complete the security check and try again."});
 try{
  const params=new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token});
  const ip=request.headers.get("CF-Connecting-IP");if(ip)params.set("remoteip",ip);
  const result=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:params,signal:AbortSignal.timeout(10000)});
  if(!result.ok)return respond(503,{error:"Security check unavailable. Please try again."});
  const verify=await result.json();
  if(verify.success!==true||verify.hostname!==HOST||verify.action!=="waitlist")return respond(403,{error:"Security check failed or expired. Please try again."});
  await env.DB.prepare("INSERT INTO subscribers(email,consent_version,created_at,status) VALUES(?,?,?,?) ON CONFLICT(email) DO NOTHING").bind(email,CONSENT_VERSION,new Date().toISOString(),"unverified").run();
  return respond(200,{ok:true});
 }catch{return respond(503,{error:"Registration could not be saved. Please try again later."});}
}
