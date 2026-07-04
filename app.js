// =======================================
// High Alert Medication Analyzer
// app.js
// Part 1
// =======================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const GOOGLE_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbyWjxtb7Fw4QlHphBrAnhTtb4QuYvASd2oiX8X5m4tdZRJHsErLbH9TsRBavODpo93_pQ/exec";

const pdfInput=document.getElementById("pdfFile");
const chooseBtn=document.getElementById("chooseFile");
const analyzeBtn=document.getElementById("analyzeBtn");
const dropZone=document.getElementById("dropZone");
const fileName=document.getElementById("fileName");

const patientCount=document.getElementById("patientCount");
const drugCount=document.getElementById("drugCount");
const highAlertCount=document.getElementById("highAlertCount");

const tbody=document.querySelector("#resultTable tbody");

let selectedFile=null;
let pdfText="";
let database=[];
let results=[];

chooseBtn.addEventListener("click",()=>{

pdfInput.click();

});

pdfInput.addEventListener("change",e=>{

selectedFile=e.target.files[0];

if(selectedFile){

fileName.innerHTML=selectedFile.name;

}

});

dropZone.addEventListener("dragover",e=>{

e.preventDefault();

});

dropZone.addEventListener("drop",e=>{

e.preventDefault();

selectedFile=e.dataTransfer.files[0];

pdfInput.files=e.dataTransfer.files;

fileName.innerHTML=selectedFile.name;

});

async function loadDatabase(){

const response=await fetch(GOOGLE_SCRIPT_URL);

database=await response.json();

}

async function readPDF(file){

const buffer=await file.arrayBuffer();

const pdf=await pdfjsLib.getDocument({

data:buffer

}).promise;

let text="";

for(let page=1;page<=pdf.numPages;page++){

const p=await pdf.getPage(page);

const content=await p.getTextContent();

text+=content.items.map(i=>i.str).join(" ");

text+="\n";

}

return text;

}

function normalize(str){

return str
.toLowerCase()
.replace(/[^\w\s]/g,"")
.replace(/\s+/g," ")
.trim();

}
// =======================================
// Part 2
// Parse Drug Distribution List
// =======================================

function parseReport(text){

results=[];

const lines=text
.replace(/\r/g,"")
.split("\n")
.map(x=>x.trim())
.filter(x=>x.length>0);

let ward="";
let patient="";
let fileNo="";

for(let i=0;i<lines.length;i++){

const line=lines[i];

if(line.startsWith("Ward")){

ward=line.replace("Ward :","").trim();

continue;

}

if(line.startsWith("File No")){

if(i+1<lines.length){

const value=lines[i+1];

const m=value.match(/\d+/);

if(m){

fileNo=m[0];

}

}

continue;

}

if(line.includes("Patient Name")){

patient=line
.replace("Patient Name :","")
.replace("Patient Name","")
.trim();

continue;

}

const lower=line.toLowerCase();

const isDrug=

lower.includes("tablet")||
lower.includes("capsule")||
lower.includes("vial")||
lower.includes("ampoule")||
lower.includes("prefilled")||
lower.includes("solution")||
lower.includes("bottle")||
lower.includes("powder");

if(!isDrug) continue;

let generic="";

for(let j=i+1;j<Math.min(i+6,lines.length);j++){

const next=lines[j];

if(

next.toLowerCase().includes("tablet")||

next.toLowerCase().includes("capsule")||

next.toLowerCase().includes("vial")||

next.toLowerCase().includes("ampoule")

){

generic=next;

break;

}

}

results.push({

patient,

file:fileNo,

ward,

brand:line,

generic,

category:"",

high:false

});

}

compareDatabase();

}

function compareDatabase(){

let high=0;

results.forEach(item=>{

const brand=normalize(item.brand);

const generic=normalize(item.generic);

const found=database.find(db=>{

return(

brand.includes(normalize(db.Brand))||

brand.includes(normalize(db.Generic))||

generic.includes(normalize(db.Brand))||

generic.includes(normalize(db.Generic))

);

});

if(found){

item.high=true;

item.brand=found.Brand;

item.generic=found.Generic;

item.category=found.Category;

high++;

}

});

patientCount.innerHTML=

new Set(results.map(x=>x.patient)).size;

drugCount.innerHTML=results.length;

highAlertCount.innerHTML=high;

drawTable();

}
// =======================================
// Part 3
// Analyze + Draw + Export
// =======================================

function drawTable(){

tbody.innerHTML="";

if(results.length===0){

tbody.innerHTML=`
<tr>
<td colspan="7">
No High Alert Drugs Found
</td>
</tr>
`;

return;

}

results.forEach(item=>{

const tr=document.createElement("tr");

tr.innerHTML=`

<td>${item.patient}</td>

<td>${item.file}</td>

<td>${item.ward}</td>

<td>${item.brand}</td>

<td>${item.generic}</td>

<td>${item.category}</td>

<td>

${item.high
?'<span style="color:red;font-weight:bold">HIGH ALERT</span>'
:'-'}

</td>

`;

tbody.appendChild(tr);

});

}

analyzeBtn.addEventListener("click",async()=>{

if(!selectedFile){

alert("Please choose PDF");

return;

}

try{

tbody.innerHTML=`
<tr>
<td colspan="7">
Loading Database...
</td>
</tr>
`;

await loadDatabase();

tbody.innerHTML=`
<tr>
<td colspan="7">
Reading PDF...
</td>
</tr>
`;

pdfText=await readPDF(selectedFile);

tbody.innerHTML=`
<tr>
<td colspan="7">
Analyzing...
</td>
</tr>
`;

parseReport(pdfText);

}

catch(error){

console.error(error);

alert(error.message);

}

});

document
.getElementById("exportExcel")
.addEventListener("click",()=>{

const wb=XLSX.utils.book_new();

const rows=[

[
"Patient",
"File",
"Ward",
"Brand",
"Generic",
"Category",
"High Alert"
]

];

results.forEach(r=>{

rows.push([

r.patient,
r.file,
r.ward,
r.brand,
r.generic,
r.category,
r.high?"YES":"NO"

]);

});

const ws=XLSX.utils.aoa_to_sheet(rows);

XLSX.utils.book_append_sheet(

wb,

ws,

"High Alert"

);

XLSX.writeFile(

wb,

"HighAlertReport.xlsx"

);

});

document
.getElementById("printBtn")
.addEventListener("click",()=>{

window.print();

});

console.log("Application Ready");
