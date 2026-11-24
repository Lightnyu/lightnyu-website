import assert from "node:assert/strict";
import {onRequest} from "../functions/_middleware.js";
const now=Math.floor(Date.now()/1000),env={ADMIN_ACCESS_TEAM:"test-team",ADMIN_ACCESS_AUD:"test-aud",ADMIN_EMAIL:"admin@example.invalid"};
const pair=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
const jwk={...await crypto.subtle.exportKey("jwk",pair.publicKey),kid:"key1",alg:"RS256"};
globalThis.fetch=async url=>{assert.equal(url,"https://test-team.cloudflareaccess.com/cdn-cgi/access/certs");return Response.json({keys:[jwk]})};
const b64=x=>Buffer.from(x).toString("base64url");
async function token(over={}){const a=b64(JSON.stringify({alg:"RS256",kid:"key1"})),b=b64(JSON.stringify({iss:"https://test-team.cloudflareaccess.com",aud:["test-aud"],email:"admin@example.invalid",exp:now+60,type:"app",...over}));return a+"."+b+"."+b64(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",pair.privateKey,new TextEncoder().encode(a+"."+b)));}
let reads=0;const row={email:"=1+1@example.invalid",created_at:"2026-11-24T09:00:00Z",consent_version:"launch-email-only-v1",status:"unverified"};
const DB={prepare(sql){reads++;return {bind(){return this},async first(){return sql.includes("sqlite_master")?{name:"subscribers"}:sql.includes(" AS n")?{n:1}:{total:1,today:1,week:1}},async all(){return {results:[row]}}}}};
const go=(path,t,host="admin.lightnyu.co.uk",e={...env,DB})=>onRequest({request:new Request("https://"+host+path,{headers:t?{"Cf-Access-Jwt-Assertion":t}:{}}),env:e,next:()=>new Response("public")});
assert.equal((await go("/")).status,403);assert.equal((await go("/export.csv")).status,403);assert.equal((await go("/",await token({email:"other@example.invalid"}))).status,403);assert.equal((await go("/",await token({aud:["wrong"]}))).status,403);assert.equal((await go("/",await token({exp:now-1}))).status,403);assert.equal((await go("/",(await token()).slice(0,-10)+"AAAAAAAAAA")).status,403);assert.equal(reads,0);
assert.equal(await (await go("/export.csv",await token(),"lightnyu.co.uk")).text(),"public");assert.equal(reads,0);
const valid=await token();const page=await go("/",valid);assert.equal(page.status,200);assert.match(await page.text(),/Registered email addresses/);assert.match(page.headers.get("Cache-Control"),/no-store/);const file=await go("/export.csv",valid);assert.equal(file.status,200);assert.match(await file.text(),/"'=1\+1@example.invalid"/);console.log("PASS: deny unauthenticated, wrong email, wrong audience, expired and forged tokens; public site passes through; valid signed session renders list and formula-safe CSV.");
