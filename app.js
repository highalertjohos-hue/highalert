// ==========================================
// High Alert Medication Analyzer
// app.js
// Part 1
// ==========================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js";

const pdfInput=document.getElementById("pdfFile");
const chooseBtn=document.getElementById("chooseFile");
const analyzeBtn=document.getElementById("analyzeBtn");
const dropZone=document.getElementById("dropZone");

const patientCount=document.getElementById("patientCount");
const drugCount=document.getElementById("drugCount");
const highAlertCount=document.getElementById("highAlertCount");

const tbody=document.querySelector("#resultTable tbody");

let selectedFile=null;

let reportText="";

let parsedDrugs=[];

let highAlertDatabase=[];

chooseBtn.onclick=()=>{

pdfInput.click();

};

pdfInput.onchange=e=>{

selectedFile=e.target.files[0];

if(selectedFile){

dropZone.querySelector("h2").innerHTML=selectedFile.name;

}

};

dropZone.addEventListener("dragover",e=>{

e.preventDefault();

dropZone.style.background="#eef4ff";

});

dropZone.addEventListener("dragleave",()=>{

dropZone.style.background="#fff";

});

dropZone.addEventListener("drop",e=>{

e.preventDefault();

selectedFile=e.dataTransfer.files[0];

pdfInput.files=e.dataTransfer.files;

dropZone.querySelector("h2").innerHTML=selectedFile.name;

});

async function readPDF(file){

const buffer=await file.arrayBuffer();

const pdf=await pdfjsLib.getDocument(buffer).promise;

let text="";

for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){

const page=await pdf.getPage(pageNumber);

const content=await page.getTextContent();

const pageText=content.items.map(item=>item.str).join(" ");

text+=pageText+"\n";

}

return text;

}

analyzeBtn.onclick=async()=>{

if(!selectedFile){

alert("Please choose PDF");

return;

}

tbody.innerHTML="<tr><td colspan='7'>Reading PDF...</td></tr>";

reportText=await readPDF(selectedFile);

parseHospitalReport(reportText);

};

function resetCounters(){

patientCount.innerHTML="0";

drugCount.innerHTML="0";

highAlertCount.innerHTML="0";

parsedDrugs=[];

tbody.innerHTML="";

}
// ==========================================
// Part 2
// Hospital PDF Parser
// ==========================================

function parseHospitalReport(text){

resetCounters();

const lines=text
.replace(/\r/g,"")
.split("\n")
.map(x=>x.trim())
.filter(x=>x.length>0);

let patient="";
let fileNo="";
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

fileNo=line
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
lower.includes("syringe")||
lower.includes("powder")||
lower.includes("injection");

if(!isDrug) continue;

let brand=line;

let generic="";

if(i+1<lines.length){

const next=lines[i+1];

if(

!next.includes("Patient")&&
!next.includes("Ward")&&
!next.includes("File")&&
!next.includes("Doctor")&&
!next.includes("Dose")

){

generic=next;

}

}

parsedDrugs.push({

patient,

file:fileNo,

ward,

brand,

generic,

category:"",

high:false

});

}

detectDuplicates();

updateCounters();

drawResults();

}

function detectDuplicates(){

const unique=[];

const names=new Set();

parsedDrugs.forEach(drug=>{

const key=

drug.patient+

drug.brand+

drug.generic;

if(!names.has(key)){

names.add(key);

unique.push(drug);

}

});

parsedDrugs=unique;

}

function updateCounters(){

const patients=[

...new Set(

parsedDrugs.map(x=>x.patient)

)

];

patientCount.innerHTML=patients.length;

drugCount.innerHTML=parsedDrugs.length;

highAlertCount.innerHTML=

parsedDrugs.filter(x=>x.high).length;

}

function drawResults(){

tbody.innerHTML="";

if(parsedDrugs.length===0){

tbody.innerHTML=

"<tr><td colspan='7'>No Data Found</td></tr>";

return;

}

parsedDrugs.forEach(drug=>{

const row=document.createElement("tr");

row.innerHTML=`

<td>${drug.patient}</td>

<td>${drug.file}</td>

<td>${drug.ward}</td>

<td>${drug.brand}</td>

<td>${drug.generic}</td>

<td>${drug.category}</td>

<td>${drug.high?"🔴":"🟢"}</td>

`;

tbody.appendChild(row);

});

}
// ==========================================
// Part 3
// Google Sheets + High Alert Detection
// ==========================================

// ضع هنا رابط Google Apps Script بعد إنشائه
const GOOGLE_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbyWjxtb7Fw4QlHphBrAnhTtb4QuYvASd2oiX8X5m4tdZRJHsErLbH9TsRBavODpo93_pQ/exec";

async function loadHighAlertDatabase(){

    try{

        const response = await fetch(GOOGLE_SCRIPT_URL);

        highAlertDatabase = await response.json();

        compareWithDatabase();

    }

    catch(error){

        console.error(error);

        alert("Unable to load Google Sheets");

    }

}

function normalize(text){

    return text
        .toLowerCase()
        .replace(/[^\w\s]/g,"")
        .replace(/\s+/g," ")
        .trim();

}

function compareWithDatabase(){

    let count = 0;

    parsedDrugs.forEach(drug=>{

        const brand = normalize(drug.brand);

        const generic = normalize(drug.generic);

        const found = highAlertDatabase.find(item=>{

            const dbBrand = normalize(item.Brand);

            const dbGeneric = normalize(item.Generic);

            return (

                brand.includes(dbBrand) ||

                brand.includes(dbGeneric) ||

                generic.includes(dbBrand) ||

                generic.includes(dbGeneric)

            );

        });

        if(found){

            drug.high = true;

            drug.category = found.Category;

            drug.generic = found.Generic;

            drug.brand = found.Brand;

            count++;

        }

    });

    highAlertCount.innerHTML = count;

    drawResults();

}

analyzeBtn.onclick = async()=>{

    if(!selectedFile){

        alert("Choose PDF");

        return;

    }

    tbody.innerHTML =
    "<tr><td colspan='7'>Reading PDF...</td></tr>";

    reportText = await readPDF(selectedFile);

    parseHospitalReport(reportText);

    await loadHighAlertDatabase();

};

// ==========================================
// Export Excel
// ==========================================

document.getElementById("exportExcel").onclick=()=>{

    const workbook = XLSX.utils.table_to_book(

        document.getElementById("resultTable"),

        {sheet:"High Alert Report"}

    );

    XLSX.writeFile(

        workbook,

        "HighAlertReport.xlsx"

    );

};

// ==========================================
// Print
// ==========================================

document.getElementById("printBtn").onclick=()=>{

    window.print();

};

console.log("High Alert Medication Analyzer Ready");
