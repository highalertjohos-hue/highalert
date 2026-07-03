// app.js

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js";

const chooseFile = document.getElementById("chooseFile");
const pdfFile = document.getElementById("pdfFile");
const dropZone = document.getElementById("dropZone");
const analyzeBtn = document.getElementById("analyzeBtn");

const patientCount = document.getElementById("patientCount");
const drugCount = document.getElementById("drugCount");
const highAlertCount = document.getElementById("highAlertCount");

const table = document.querySelector("#resultTable tbody");

let extractedText = "";
let selectedFile = null;

chooseFile.onclick = () => pdfFile.click();

pdfFile.onchange = (e) => {
    selectedFile = e.target.files[0];
    dropZone.querySelector("h2").innerHTML = selectedFile.name;
};

dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.style.background="#eef4ff";
});

dropZone.addEventListener("dragleave", () => {
    dropZone.style.background="#fff";
});

dropZone.addEventListener("drop", e => {

    e.preventDefault();

    selectedFile=e.dataTransfer.files[0];

    pdfFile.files=e.dataTransfer.files;

    dropZone.querySelector("h2").innerHTML=selectedFile.name;

});

analyzeBtn.onclick=async()=>{

if(!selectedFile){

alert("Choose PDF");

return;

}

table.innerHTML="<tr><td colspan='7'>Reading PDF...</td></tr>";

const buffer=await selectedFile.arrayBuffer();

const pdf=await pdfjsLib.getDocument(buffer).promise;

extractedText="";

for(let i=1;i<=pdf.numPages;i++){

const page=await pdf.getPage(i);

const content=await page.getTextContent();

const text=content.items.map(x=>x.str).join(" ");

extractedText+=text+"\n";

}

parseReport(extractedText);

};

function parseReport(text){

const drugs=[];

const patients=[];

const lines=text.split("\n");

let currentPatient="";

let currentFile="";

let currentWard="";

lines.forEach(line=>{

if(line.includes("Patient Name")){

currentPatient=line.replace("Patient Name","").trim();

}

if(line.includes("File No")){

currentFile=line.replace("File No","").trim();

}

if(line.includes("Ward")){

currentWard=line.replace("Ward","").trim();

}

if(

line.toLowerCase().includes("tablet")||

line.toLowerCase().includes("capsule")||

line.toLowerCase().includes("vial")||

line.toLowerCase().includes("ampoule")||

line.toLowerCase().includes("solution")||

line.toLowerCase().includes("injection")

){

drugs.push({

patient:currentPatient,

file:currentFile,

ward:currentWard,

brand:line,

generic:"",

category:"",

high:false

});

}

});

patientCount.innerHTML=[...new Set(drugs.map(x=>x.patient))].length;

drugCount.innerHTML=drugs.length;

highAlertCount.innerHTML=0;

drawTable(drugs);

}

function drawTable(drugs){

table.innerHTML="";

if(drugs.length===0){

table.innerHTML="<tr><td colspan='7'>No Data</td></tr>";

return;

}

drugs.forEach(drug=>{

table.innerHTML+=`

<tr>

<td>${drug.patient}</td>

<td>${drug.file}</td>

<td>${drug.ward}</td>

<td>${drug.brand}</td>

<td>${drug.generic}</td>

<td>${drug.category}</td>

<td>${drug.high?"🔴":"🟢"}</td>

</tr>

`;

});

}

document.getElementById("printBtn").onclick=()=>{

window.print();

};

document.getElementById("exportExcel").onclick=()=>{

const wb=XLSX.utils.table_to_book(

document.getElementById("resultTable"),

{sheet:"Report"}

);

XLSX.writeFile(wb,"HighAlertReport.xlsx");

};