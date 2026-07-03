// =======================================
// High Alert Medication Analyzer
// app.js
// Part 1
// =======================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const pdfInput=document.getElementById("pdfFile");
const chooseBtn=document.getElementById("chooseFile");
const analyzeBtn=document.getElementById("analyzeBtn");
const dropZone=document.getElementById("dropZone");
const fileName=document.getElementById("fileName");

const patientCount=document.getElementById("patientCount");
const drugCount=document.getElementById("drugCount");
const highAlertCount=document.getElementById("highAlertCount");

const tbody=document.querySelector("#resultTable tbody");

const GOOGLE_SCRIPT_URL="https://script.google.com/macros/s/AKfycbyWjxtb7Fw4QlHphBrAnhTtb4QuYvASd2oiX8X5m4tdZRJHsErLbH9TsRBavODpo93_pQ/exec";

let selectedFile=null;

let pdfText="";

let drugs=[];

let database=[];

chooseBtn.addEventListener("click",()=>{

pdfInput.click();

});

pdfInput.addEventListener("change",(e)=>{

selectedFile=e.target.files[0];

if(selectedFile){

fileName.innerHTML=selectedFile.name;

}

});

dropZone.addEventListener("dragover",(e)=>{

e.preventDefault();

dropZone.style.background="#eef4ff";

});

dropZone.addEventListener("dragleave",()=>{

dropZone.style.background="white";

});

dropZone.addEventListener("drop",(e)=>{

e.preventDefault();

selectedFile=e.dataTransfer.files[0];

pdfInput.files=e.dataTransfer.files;

fileName.innerHTML=selectedFile.name;

});

async function readPDF(file){

const buffer=await file.arrayBuffer();

const pdf=await pdfjsLib.getDocument({

data:buffer

}).promise;

let text="";

for(let page=1;page<=pdf.numPages;page++){

const p=await pdf.getPage(page);

const content=await p.getTextContent();

text+=content.items.map(x=>x.str).join(" ");

text+="\n";

}

return text;

}

async function loadDatabase(){

const response=await fetch(GOOGLE_SCRIPT_URL);

database=await response.json();

}
// =======================================
// Part 2
// Parse Hospital Report
// =======================================

function parseReport(text){

drugs=[];

const lines=text
.replace(/\r/g,"")
.split("\n")
.map(x=>x.trim())
.filter(x=>x!="");

let patient="";
let file="";
let ward="";

for(let i=0;i<lines.length;i++){

const line=lines[i];

if(line.includes("Patient Name")){

patient=line
.replace("Patient Name","")
.replace(":","")
.trim();

continue;

}

if(line.includes("File No")){

file=line
.replace("File No","")
.replace(":","")
.trim();

continue;

}

if(line.includes("Ward")){

ward=line
.replace("Ward","")
.replace(":","")
.trim();

continue;

}

const lower=line.toLowerCase();

const isDrug=

lower.includes("tablet")||
lower.includes("capsule")||
lower.includes("vial")||
lower.includes("ampoule")||
lower.includes("solution")||
lower.includes("powder")||
lower.includes("syringe")||
lower.includes("injection");

if(!isDrug) continue;

drugs.push({

patient,

file,

ward,

brand:line,

generic:"",

category:"",

high:false

});

}

matchDatabase();

}

function normalize(text){

return text
.toLowerCase()
.replace(/[^\w\s]/g,"")
.replace(/\s+/g," ")
.trim();

}

function matchDatabase(){

let highCount=0;

drugs.forEach(drug=>{

const brand=normalize(drug.brand);

const found=database.find(item=>{

return(

brand.includes(normalize(item.Brand))||

brand.includes(normalize(item.Generic))

);

});

if(found){

drug.high=true;

drug.category=found.Category;

drug.generic=found.Generic;

drug.brand=found.Brand;

highCount++;

}

});

patientCount.innerHTML=

new Set(drugs.map(x=>x.patient)).size;

drugCount.innerHTML=drugs.length;

highAlertCount.innerHTML=highCount;

drawTable();

}
// =======================================
// Part 3
// UI + Analyze + Export
// =======================================

function drawTable(){

tbody.innerHTML="";

if(drugs.length===0){

tbody.innerHTML="<tr><td colspan='7'>No Data Found</td></tr>";

return;

}

drugs.forEach(drug=>{

const row=document.createElement("tr");

row.innerHTML=`

<td>${drug.patient}</td>

<td>${drug.file}</td>

<td>${drug.ward}</td>

<td>${drug.brand}</td>

<td>${drug.generic}</td>

<td>${drug.category}</td>

<td style="font-size:20px">

${drug.high ? "🔴 High Alert" : "🟢 Normal"}

</td>

`;

tbody.appendChild(row);

});

}

analyzeBtn.addEventListener("click",async()=>{

if(!selectedFile){

alert("Please choose a PDF file.");

return;

}

tbody.innerHTML="<tr><td colspan='7'>Reading PDF...</td></tr>";

try{

await loadDatabase();

pdfText=await readPDF(selectedFile);

parseReport(pdfText);

}

catch(error){

console.error(error);

alert("Error reading PDF or Google Sheets.");

}

});

document.getElementById("exportExcel").addEventListener("click",()=>{

const workbook=XLSX.utils.table_to_book(

document.getElementById("resultTable"),

{sheet:"High Alert"}

);

XLSX.writeFile(

workbook,

"HighAlertReport.xlsx"

);

});

document.getElementById("printBtn").addEventListener("click",()=>{

window.print();

});

console.log("High Alert Medication Analyzer Loaded Successfully");
