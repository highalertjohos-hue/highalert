// ======================================
// High Alert Medication Analyzer
// New Engine
// ======================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const GOOGLE_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbyWjxtb7Fw4QlHphBrAnhTtb4QuYvASd2oiX8X5m4tdZRJHsErLbH9TsRBavODpo93_pQ/exec";

const pdfInput=document.getElementById("pdfFile");
const chooseBtn=document.getElementById("chooseFile");
const analyzeBtn=document.getElementById("analyzeBtn");
const fileName=document.getElementById("fileName");

const patientCount=document.getElementById("patientCount");
const drugCount=document.getElementById("drugCount");
const highAlertCount=document.getElementById("highAlertCount");

const tbody=document.querySelector("#resultTable tbody");

let selectedFile=null;
let database=[];
let pages=[];

chooseBtn.onclick=()=>{

pdfInput.click();

};

pdfInput.onchange=e=>{

selectedFile=e.target.files[0];

if(selectedFile){

fileName.innerHTML=selectedFile.name;

}

};

async function loadDatabase(){

const response=await fetch(GOOGLE_SCRIPT_URL);

database=await response.json();

}

async function readPDF(file){

const buffer=await file.arrayBuffer();

const pdf=await pdfjsLib.getDocument({

data:buffer

}).promise;

pages=[];

for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){

const page=await pdf.getPage(pageNumber);

const content=await page.getTextContent();

const items=content.items.map(item=>{

return{

text:item.str,

x:item.transform[4],

y:item.transform[5]

};

});

pages.push(items);

}

return pages;

}

function normalize(text){

return text
.toLowerCase()
.replace(/[^\w\s]/g,"")
.replace(/\s+/g," ")
.trim();

}

console.log("Engine Loaded");
// ======================================
// Part 2
// Build Rows From PDF Coordinates
// ======================================

function groupRows(items){

    const rows=[];

    const tolerance=2;

    items.forEach(item=>{

        let row=rows.find(r=>Math.abs(r.y-item.y)<tolerance);

        if(!row){

            row={

                y:item.y,

                cells:[]

            };

            rows.push(row);

        }

        row.cells.push(item);

    });

    rows.sort((a,b)=>b.y-a.y);

    rows.forEach(r=>{

        r.cells.sort((a,b)=>a.x-b.x);

        r.text=r.cells.map(c=>c.text).join(" ");

    });

    return rows;

}

function extractPatients(rows){

    const patients=[];

    let current={

        ward:"",
        file:"",
        patient:"",
        room:""

    };

    rows.forEach(row=>{

        const txt=row.text;

        if(txt.includes("Ward")){

            const m=txt.match(/Ward\s*:\s*(.+)/i);

            if(m) current.ward=m[1].trim();

        }

        if(txt.includes("File No")){

            const m=txt.match(/File No\s*:\s*(\d+)/i);

            if(m) current.file=m[1];

        }

        if(txt.includes("Patient Name")){

            const name=txt.match(/Patient Name\s*:\s*(.*?)\s*Room\/Bed/i);

            const room=txt.match(/Room\/Bed\s*:\s*(.*)$/i);

            if(name) current.patient=name[1].trim();

            if(room) current.room=room[1].trim();

        }

        if(current.file && current.patient){

            patients.push({

                ward:current.ward,
                file:current.file,
                patient:current.patient,
                room:current.room,
                y:row.y

            });

            current={

                ward:current.ward,
                file:"",
                patient:"",
                room:""

            };

        }

    });

    return patients;

}

function extractDrugs(rows,patients){

    const results=[];

    rows.forEach(row=>{

        const txt=row.text;

        if(

            txt.includes("mg") ||

            txt.includes("gram") ||

            txt.includes("tablet") ||

            txt.includes("capsule") ||

            txt.includes("vial") ||

            txt.includes("Injection")

        ){

            let patient=patients[0];

            patients.forEach(p=>{

                if(row.y<p.y){

                    patient=p;

                }

            });

            results.push({

                patient:patient?.patient || "",
                file:patient?.file || "",
                ward:patient?.ward || "",
                brand:txt,
                generic:"",
                category:"",
                high:false

            });

        }

    });

    return results;

}
// ======================================
// Part 3
// Detect Brand + Generic + High Alert
// ======================================

function compareWithDatabase(results){

    results.forEach(drug=>{

        const text=normalize(drug.brand);

        const found=database.find(item=>{

            const brand=normalize(item.Brand);

            const generic=normalize(item.Generic);

            return(

                text.includes(brand)||

                text.includes(generic)

            );

        });

        if(found){

            drug.high=true;
            drug.brand=found.Brand;
            drug.generic=found.Generic;
            drug.category=found.Category;

        }

    });

    return results;

}

function drawResults(results){

    tbody.innerHTML="";

    let patients=new Set();

    let high=0;

    results.forEach(drug=>{

        patients.add(drug.file);

        if(drug.high) high++;

        tbody.innerHTML+=`

        <tr>

        <td>${drug.patient}</td>

        <td>${drug.file}</td>

        <td>${drug.ward}</td>

        <td>${drug.brand}</td>

        <td>${drug.generic}</td>

        <td>${drug.category}</td>

        <td>

        ${drug.high
        ?'<span style="color:red;font-weight:bold">HIGH ALERT</span>'
        :''}

        </td>

        </tr>

        `;

    });

    patientCount.innerHTML=patients.size;

    drugCount.innerHTML=results.length;

    highAlertCount.innerHTML=high;

}

analyzeBtn.onclick=async()=>{

    if(!selectedFile){

        alert("Choose PDF");

        return;

    }

    tbody.innerHTML="<tr><td colspan='7'>Loading...</td></tr>";

    await loadDatabase();

    const pages=await readPDF(selectedFile);

    let results=[];

    pages.forEach(page=>{

        const rows=groupRows(page);

        const patients=extractPatients(rows);

        const drugs=extractDrugs(rows,patients);

        results=results.concat(drugs);

    });

    results=compareWithDatabase(results);

    drawResults(results);

};

console.log("Analyzer Ready");
