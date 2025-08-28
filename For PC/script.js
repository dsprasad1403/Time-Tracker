let sessionStart=null, timerInterval=null, pauseStart=null, pausedDuration=0;
let currentDate=new Date(), unlocked=false;

const startBtn=document.getElementById("startBtn");
const pauseBtn=document.getElementById("pauseBtn");
const stopBtn=document.getElementById("stopBtn");
const unlockBtn=document.getElementById("unlockBtn");
const lockBtn=document.getElementById("lockBtn");
const timerDisplay=document.getElementById("timer");
const sessionsDiv=document.getElementById("sessions");
const totalDiv=document.getElementById("total");
const sessionHeading=document.getElementById("sessionHeading");

const homePage=document.getElementById("homePage");
const calendarPage=document.getElementById("calendarPage");
const homeNav=document.getElementById("homeNav");
const calendarNav=document.getElementById("calendarNav");

const monthYearLabel=document.getElementById("monthYear");
const calendarGrid=document.getElementById("calendarGrid");
const monthTotalDiv=document.getElementById("monthTotal");

let currentMonth=new Date().getMonth(), currentYear=new Date().getFullYear();

function formatTime(ms){
  if(isNaN(ms) || ms<=0) return "0 hrs 0 mins 0 secs";
  let totalSec=Math.floor(ms/1000);
  let hrs=Math.floor(totalSec/3600);
  let mins=Math.floor((totalSec%3600)/60);
  let secs=totalSec%60;
  return `${hrs} hrs ${mins} mins ${secs} secs`;
}
function formatClock(ms){
  let totalSec=Math.floor(ms/1000);
  let hrs=String(Math.floor(totalSec/3600)).padStart(2,'0');
  let mins=String(Math.floor((totalSec%3600)/60)).padStart(2,'0');
  let secs=String(totalSec%60).padStart(2,'0');
  return `${hrs}:${mins}:${secs}`;
}
function keyForDate(d){ return d.toDateString(); }
function newId(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function isToday(d){
  let t=new Date();
  return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear();
}

// ===== Load Sessions =====
function updateLockButtons(){
  if(unlocked){
    unlockBtn.style.opacity="0.3"; unlockBtn.classList.add("fade");
    lockBtn.style.opacity="1"; lockBtn.classList.remove("fade");
  } else {
    unlockBtn.style.opacity="1"; unlockBtn.classList.remove("fade");
    lockBtn.style.opacity="0.3"; lockBtn.classList.add("fade");
  }
}

function loadSessions(){
  const today=new Date();
  const key=keyForDate(currentDate);

  // Block future dates
  if(currentDate>today){
    sessionHeading.innerText="⚠️ Future sessions not available";
    sessionsDiv.innerHTML="";
    timerDisplay.innerText="00:00:00";
    startBtn.disabled=true;
    pauseBtn.disabled=true;
    stopBtn.disabled=true;
    unlockBtn.style.display="none";
    lockBtn.style.display="none";
    totalDiv.innerText="";
    return;
  }

  let sessions=JSON.parse(localStorage.getItem(key)||"[]");
  sessionHeading.innerText=isToday(currentDate) ? "Today's Sessions" : `Sessions on ${currentDate.toDateString()}`;
  const lockTimer=!isToday(currentDate);
  startBtn.disabled=lockTimer;
  pauseBtn.disabled=lockTimer;
  stopBtn.disabled=lockTimer;
  unlockBtn.style.display=lockTimer?"inline-block":"none";
  lockBtn.style.display=lockTimer?"inline-block":"none";

  let display=[...sessions].sort((a,b)=>b.end-b.start);
  sessionsDiv.innerHTML="";

  // Add Record card
  let addCard=document.createElement("div");
  addCard.className="session add-session";
  addCard.innerHTML=`
    <div class="left">
      <strong>➕ Add Record</strong><br>
      <input type="number" id="addHours" min="0" value="0"> h
      <input type="number" id="addMins" min="0" max="59" value="0"> m
      <input type="number" id="addSecs" min="0" max="59" value="0"> s
    </div>
    <button class="addBtn">Add</button>
  `;
  const addBtn=addCard.querySelector(".addBtn");
  addBtn.onclick = () => {
    if(lockTimer && !unlocked){ alert("⚠️ Unlock to edit past records."); return; }
    const hrs = parseInt(addCard.querySelector("#addHours").value||"0");
    const mins = parseInt(addCard.querySelector("#addMins").value||"0");
    const secs = parseInt(addCard.querySelector("#addSecs").value||"0");
    const totalSec = hrs*3600 + mins*60 + secs;
    if(totalSec <= 0){ alert("⚠️ Enter a valid duration"); return; }
    if(!confirm(`Add a record of ${hrs} hrs ${mins} mins ${secs} secs?`)) return;
    const selectedDate = new Date(currentDate); selectedDate.setHours(0,0,0,0);
    const start = selectedDate.getTime(); const end = start + totalSec*1000;
    sessions.push({id:newId(), start:start, end:end, paused:0, custom:true});
    localStorage.setItem(key, JSON.stringify(sessions)); loadSessions();
  };
  sessionsDiv.appendChild(addCard);

  let total=0;
  display.forEach(s=>{
    let duration=Math.max(0, (s.end||0)-(s.start||0)-(s.paused||0));
    total+=duration;
    let div=document.createElement("div"); div.className="session";
    let left=document.createElement("div"); left.className="left";
    left.innerHTML=`<div><strong>${formatTime(duration)}</strong></div>`;
    if(!s.custom && s.start && s.end) 
      left.innerHTML+=`<div class="meta">🕒 ${new Date(s.start).toLocaleTimeString()} - ${new Date(s.end).toLocaleTimeString()}</div>`;
    let del=document.createElement("button"); del.className="deleteBtn"; del.textContent="❌ Delete";
    del.onclick=()=>{ if(lockTimer && !unlocked){ alert("⚠️ Unlock to delete past records."); return; }
      if(!confirm("⚠️ Delete this record?")) return;
      const idx=sessions.findIndex(x=>x.id===s.id);
      if(idx!==-1){ sessions.splice(idx,1); localStorage.setItem(key, JSON.stringify(sessions)); loadSessions(); }
    };
    div.appendChild(left); div.appendChild(del); sessionsDiv.appendChild(div);
  });
  totalDiv.innerText="Daily Total: "+formatTime(total);
  updateLockButtons();
}

// ===== Timer =====
function startTimer(){ if(!isToday(currentDate)) return;
  if(sessionStart===null){ sessionStart=Date.now(); pausedDuration=0; pauseStart=null; }
  else if(pauseStart!==null){ pausedDuration+=Date.now()-pauseStart; pauseStart=null; }
  startBtn.disabled=true; pauseBtn.disabled=false; stopBtn.disabled=false; pauseBtn.textContent="Pause";
  clearInterval(timerInterval);
  timerInterval=setInterval(()=>{ const elapsed=Date.now()-sessionStart-pausedDuration;
    timerDisplay.innerText=formatClock(Math.max(0,elapsed));
  },1000);
}
function togglePause(){ if(!isToday(currentDate)) return; if(!sessionStart) return;
  if(pauseStart===null){ clearInterval(timerInterval); pauseStart=Date.now(); pauseBtn.textContent="Resume"; }
  else{ pausedDuration+=Date.now()-pauseStart; pauseStart=null; pauseBtn.textContent="Pause"; startTimer(); }
}
function stopTimer(){ if(!isToday(currentDate)) return; if(!sessionStart) return;
  if(pauseStart!==null){ pausedDuration+=Date.now()-pauseStart; pauseStart=null; }
  clearInterval(timerInterval);
  const sessionObj={id:newId(), start:sessionStart, end:Date.now(), paused:pausedDuration};
  const key=keyForDate(currentDate);
  let sessions=JSON.parse(localStorage.getItem(key)||"[]");
  sessions.push(sessionObj); localStorage.setItem(key,JSON.stringify(sessions));
  sessionStart=null; pausedDuration=0; timerDisplay.innerText="00:00:00";
  startBtn.disabled=false; pauseBtn.disabled=true; stopBtn.disabled=true; pauseBtn.textContent="Pause";
  loadSessions();
}
startBtn.onclick=startTimer; pauseBtn.onclick=togglePause; stopBtn.onclick=stopTimer;

// Unlock / Lock buttons
unlockBtn.onclick=()=>{ unlocked=true; updateLockButtons(); alert("✅ You can now add/delete records for this day."); };
lockBtn.onclick=()=>{ unlocked=false; updateLockButtons(); alert("🔒 Records locked."); };

// ===== Calendar =====
function renderCalendar(month,year){
  calendarGrid.innerHTML="";
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  monthYearLabel.textContent=`${new Date(year,month).toLocaleString('default',{month:'long'})} ${year}`;
  let totalMonth=0; let dailyTotals={};
  for(let key in localStorage){ 
    if(!localStorage.hasOwnProperty(key)) continue;
    let sessions=[]; 
    try{ sessions=JSON.parse(localStorage.getItem(key)||"[]"); } catch{}
    if(!Array.isArray(sessions)) continue;
    sessions.forEach(s=>{
      if(!s.start || !s.end) return;
      let d=new Date(s.start);
      if(d.getMonth()===month && d.getFullYear()===year){
        let dur=Math.max(0,(s.end||0)-(s.start||0)-(s.paused||0));
        if(!isNaN(dur)){ 
          let day=d.getDate(); 
          dailyTotals[day]=(dailyTotals[day]||0)+dur;
          totalMonth+=dur;
        }
      }
    });
  }
  for(let i=0;i<firstDay;i++){ let div=document.createElement("div"); div.className="day empty"; calendarGrid.appendChild(div); }
  const today=new Date();
  for(let d=1;d<=daysInMonth;d++){
    let div=document.createElement("div"); div.className="day"; div.innerHTML=`<div class="date">${d}</div>`;
    if(dailyTotals[d]) div.innerHTML+=`<div class="hours">${formatTime(dailyTotals[d])}</div>`;
    let dayDate=new Date(year,month,d);
    if(d===today.getDate() && month===today.getMonth() && year===today.getFullYear()) div.classList.add("today");
    if(dayDate>today){ div.style.opacity="0.4"; div.style.pointerEvents="none"; }
    div.onclick=()=>{ currentDate=new Date(year,month,d); unlocked=false; loadSessions(); homePage.style.display="block"; calendarPage.style.display="none"; };
    calendarGrid.appendChild(div);
  }
  monthTotalDiv.innerText="Monthly Total: "+formatTime(totalMonth);
}

document.getElementById("prevMonth").onclick=()=>{
  currentMonth--; if(currentMonth<0){ currentMonth=11; currentYear--; } renderCalendar(currentMonth,currentYear);
};
document.getElementById("nextMonth").onclick=()=>{
  currentMonth++; if(currentMonth>11){ currentMonth=0; currentYear++; } renderCalendar(currentMonth,currentYear);
};

homeNav.onclick=()=>{ homePage.style.display="block"; calendarPage.style.display="none"; loadSessions(); };
calendarNav.onclick=()=>{ homePage.style.display="none"; calendarPage.style.display="block"; renderCalendar(currentMonth,currentYear); };

// ===== Export / Import =====
const exportBtn=document.getElementById("exportBtn");
const importBtn=document.getElementById("importBtn");
const importFile=document.getElementById("importFile");
exportBtn.onclick=()=>{
  const data={};
  for(let key in localStorage){ if(!localStorage.hasOwnProperty(key)) continue;
    try{ data[key]=JSON.parse(localStorage.getItem(key)); } catch{}
  }
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="study_records.json"; a.click(); URL.revokeObjectURL(url);
};
importBtn.onclick=()=>{ importFile.click(); };
importFile.onchange=(e)=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(ev){
    try{ const data=JSON.parse(ev.target.result);
      for(let key in data){ localStorage.setItem(key, JSON.stringify(data[key])); }
      alert("✅ Records imported successfully!");
      loadSessions(); renderCalendar(currentMonth,currentYear);
    } catch(err){ alert("❌ Invalid JSON file."); }
  };
  reader.readAsText(file);
};

// ===== Current Time =====
function updateClock(){
  const now=new Date();
  const h=String(now.getHours()).padStart(2,'0');
  const m=String(now.getMinutes()).padStart(2,'0');
  const s=String(now.getSeconds()).padStart(2,'0');
  document.getElementById("currentTime").innerText=`${h}:${m}:${s}`;
}
setInterval(updateClock,1000); updateClock();

// ===== Initial load =====
loadSessions(); renderCalendar(currentMonth,currentYear);
